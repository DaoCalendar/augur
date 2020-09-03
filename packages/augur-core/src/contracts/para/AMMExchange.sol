pragma solidity 0.5.15;

import 'ROOT/libraries/math/SafeMathUint256.sol';
import 'ROOT/libraries/token/ERC20.sol';
import 'ROOT/para/interfaces/IParaShareToken.sol';
import 'ROOT/reporting/IMarket.sol';
import 'ROOT/ICash.sol';


contract AMMExchange is ERC20 {
    using SafeMathUint256 for uint256;

    ICash public cash;
    IParaShareToken public shareToken;
    IMarket public augurMarket;
    uint256 public numTicks;
    uint256 public INVALID;
    uint256 public NO;
    uint256 public YES;
    uint256 public fee;

    constructor(IMarket _market, IParaShareToken _shareToken) public {
        cash = _shareToken.cash();
        shareToken = _shareToken;
        augurMarket = _market;
        numTicks = _market.getNumTicks();
        cash.approve(address(_shareToken), 2**256-1);
        cash.approve(address(_shareToken.augur()), 2**256-1);
        INVALID = _shareToken.getTokenId(_market, 0);
        NO = _shareToken.getTokenId(_market, 1);
        YES = _shareToken.getTokenId(_market, 2);
    }

    function addLiquidity(uint256 _sharesToBuy) external {
        uint256 _poolConstantBefore = liquidityConstant();

        cash.transferFrom(msg.sender, address(this), _sharesToBuy.mul(numTicks));
        shareToken.publicBuyCompleteSets(augurMarket, _sharesToBuy);

        if (_poolConstantBefore == 0) {
            _mint(msg.sender, liquidityConstant());
        } else {
            uint256 _totalSupply = totalSupply;
            _mint(msg.sender, _totalSupply.mul(liquidityConstant())).div(_poolConstantBefore).sub(_totalSupply));
        }
    }

    function removeLiquidity(uint256 _poolTokensToSell) external {
        uint256 _poolSupply = totalSupply;
        (uint256 _poolInvalid, uint256 _poolNo, uint256 _poolYes) = shareBalances(address(this));
        uint256 _poolCash = cash.balanceOf(address(this));
        uint256 _invalidShare = _poolInvalid.mul(_poolTokensToSell).div(_poolSupply);
        uint256 _noShare = _poolNo.mul(_poolTokensToSell).div(_poolSupply);
        uint256 _yesShare = _poolYes.mul(_poolTokensToSell).div(_poolSupply);
        uint256 _cashShare = _poolCash.mul(_poolTokensToSell).div(_poolSupply);
        _burn(msg.sender, _poolTokensToSell);
        shareTransfer(address(this), msg.sender, _invalidShare, _noShare, _yesShare);
        cash.transfer(msg.sender, _cashShare);
        // CONSIDER: convert min(poolInvalid, poolYes, poolNo) to DAI by selling complete sets. Selling complete sets incurs Augur fees, maybe we should let the user sell the sets themselves if they want to pay the fee?
    }

    function enterPositionCash(uint256 _amountInCash, bool _buyYes) external returns (uint256) {
        uint256 _setsToBuy = _amountInCash.div(numTicks);
        return enterPositionShares(_setsToBuy, _buyYes);
    }

    function enterPositionShares(uint256 _setsToBuy, bool _buyYes) public returns (uint256) {
        uint256 _position = rateEnterPosition(_setsToBuy, _buyYes);

        // materialize the final result of the simulation
        cash.transferFrom(msg.sender, address(this), _setsToBuy.mul(numTicks));
        if (_buyYes) {
            shareTransfer(address(this), msg.sender, _setsToBuy, 0, _position);
        } else {
            shareTransfer(address(this), msg.sender, _setsToBuy, _position, 0);
        }

        return _position;
    }

    function rateEnterPosition(uint256 _setsToBuy, bool _buyYes) public view returns (uint256) {
        (uint256 _poolInvalid, uint256 _poolNo, uint256 _poolYes) = shareBalances(address(this));

        // simulate the user buying complete sets directly from the exchange
        _poolInvalid = _poolInvalid.subS(_setsToBuy, "AugurCP: The pool doesn't have enough INVALID tokens to fulfill the request.");
        _poolNo = _poolNo.subS(_setsToBuy, "AugurCP: The pool doesn't have enough NO tokens to fulfill the request.");
        _poolYes = _poolYes.subS(_setsToBuy, "AugurCP: The pool doesn't have enough YES tokens to fulfill the request.");

        require(_poolInvalid > 0, "AugurCP: The pool doesn't have enough INVALID tokens to fulfill the request.");
        require(_poolNo > 0, "AugurCP: The pool doesn't have enough NO tokens to fulfill the request.");
        require(_poolYes > 0, "AugurCP: The pool doesn't have enough YES tokens to fulfill the request.");

        // simulate user swapping YES to NO or NO to YES
        uint256 _poolConstant = poolConstant(_poolYes, _poolNo);
        if (_buyYes) {
            // yesToUser + poolYes - poolConstant / (poolNo + _setsToBuy)
            return _setsToBuy.add(_poolYes.sub(_poolConstant.div(_poolNo.add(_setsToBuy))));
        } else {
            return _setsToBuy.add(_poolNo.sub(_poolConstant.div(_poolYes.add(_setsToBuy))));
        }
    }

    function exitPositionCash(uint256 _cashToBuy) external {
        uint256 _setsToSell = _cashToBuy.div(numTicks);
        exitPositionShares(_setsToSell);
    }

    // If you do not have complete sets then you must have more shares than _setsToSell because you will be swapping
    // some of them to build complete sets.
    function exitPositionShares(uint256 _setsToSell) public {
        (uint256 _noFromUser, uint256 _yesFromUser) = rateExitPosition(_setsToSell);

        // materialize the complete set sale for cash
        shareTransfer(msg.sender, address(this), _setsToSell, _noFromUser, _yesFromUser);
        cash.transfer(msg.sender, _cashToBuy);
    }

    // How many extra shares you need
    function rateExitPosition(uint256 _setsToSell) public view returns (uint256,uint256) {
        (uint256 _userInvalid, uint256 _userNo, uint256 _userYes) = shareBalances(msg.sender);
        (uint256 _poolNo, uint256 _poolYes) = yesNoShareBalances(address(this));

        // short circuit if user is closing out their own complete sets
        if (_userInvalid >= _setsToSell && _userNo >= _setsToSell && _userYes >= _setsToSell) {
            shareTransfer(msg.sender, address(this), _setsToSell, _setsToSell, _setsToSell);
            cash.transfer(msg.sender, _cashToBuy);
            return (_setsToSell, _setsToSell);
        }

        require(_userInvalid >= _setsToSell, "AugurCP: You don't have enough invalid tokens to close out for this amount.");
        require(_userNo > _setsToSell || _userYes > _setsToSell, "AugurCP: You don't have enough YES or NO tokens to close out for this amount.");

        // simulate user swapping enough NO ➡ YES or YES ➡ NO to create setsToSell complete sets
        uint256 _poolConstant = poolConstant(_poolYes, _poolNo);
        uint256 _invalidFromUser = _setsToSell;
        uint256 _noFromUser = 0;
        uint256 _yesFromUser = 0;
        if (_userYes > _userNo) {
            uint256 _noToUser = _setsToSell.sub(_userNo);
            uint256 _yesToPool = _poolConstant.div(_poolNo.sub(_noToUser)).sub(_poolYes);
            require(_yesToPool <= _userYes.sub(_setsToSell), "AugurCP: You don't have enough YES tokens to close out for this amount.");
            _noFromUser = _userNo;
            _yesFromUser = _yesToPool + _setsToSell;
        } else {
            uint256 _yesToUser = _setsToSell.sub(_userYes);
            uint256 _noToPool = _poolConstant.div(_poolYes.sub(_yesToUser)).sub(_poolNo);
            require(_noToPool <= _userNo.sub(_setsToSell), "AugurCP: You don't have enough NO tokens to close out for this amount.");
            _yesFromUser = _userYes;
            _noFromUser = _noToPool + _setsToSell;
        }

        return (_noFromUser, _yesFromUser);
    }

    function swap(uint256 _inputShares, bool _inputYes) external returns (uint256) {
        uint _outputShares = rateSwap(_inputShares, _inputYes);

        if (_inputYes) { // lose yesses, gain nos
            shareToken.unsafeTransferFrom(msg.sender, address(this), YES, _inputShares);
            shareToken.unsafeTransferFrom(address(this), msg.sender, NO, _outputShares);
        } else { // gain yesses, lose nos
            shareToken.unsafeTransferFrom(address(this), msg.sender, YES, _outputShares);
            shareToken.unsafeTransferFrom(msg.sender, address(this), NO, _inputShares);
        }

        return _outputShares;
    }

    function rateSwap(uint256 _inputShares, bool _inputYes) public returns (uint256) {
        (uint256 _poolNo, uint256 _poolYes) = yesNoShareBalances(address(this));
        uint256 _poolConstant = poolConstant(_poolYes, _poolNo);
        if (_inputYes) {
            return _poolNo.sub(_poolConstant.div(_poolYes.add(_yesFromUser)));
        } else {
            return _poolYes.sub(_poolConstant.div(_poolNo.add(_noFromUser)));
        }
    }

    function liquidityConstant() public view returns (uint256) {
        return sqrt(shareToken.balanceOf(address(this), YES) * shareToken.balanceOf(address(this), NO));
    }

    // When swapping (which includes entering and exiting positions), a fee is taken.
    // Remove liquidity to collect fees.
    function poolConstant(uint256 _poolYes, uint256 _poolNo) public view returns (uint256) {
        uint256 beforeFee = _poolYes.mul(_poolNo);
        if (beforeFee == 0) {
            return 0;
        } else {
            return beforeFee.mul(1000).div(fee);
        }
    }

    function shareBalances(address _owner) private view returns (uint256 _invalid, uint256 _no, uint256 _yes) {
        uint256[] memory _tokenIds = new uint256[](3);
        _tokenIds[0] = INVALID;
        _tokenIds[1] = NO;
        _tokenIds[2] = YES;
        address[] memory _owners = new address[](3);
        _owners[0] = _owner;
        _owners[1] = _owner;
        _owners[2] = _owner;
        uint256[] memory _balances = shareToken.balanceOfBatch(_owners, _tokenIds);
        _invalid = _balances[0];
        _no = _balances[1];
        _yes = _balances[2];
        return (_invalid, _no, _yes);
    }

    function yesNoShareBalances(address _owner) private view returns (uint256 _no, uint256 _yes) {
        uint256[] memory _tokenIds = new uint256[](2);
        _tokenIds[1] = NO;
        _tokenIds[2] = YES;
        address[] memory _owners = new address[](2);
        _owners[1] = _owner;
        _owners[2] = _owner;
        uint256[] memory _balances = shareToken.balanceOfBatch(_owners, _tokenIds);
        _no = _balances[1];
        _yes = _balances[2];
        return (_no, _yes);
    }

    function shareTransfer(address _from, address _to, uint256 _invalidAmount, uint256 _noAmount, uint256 _yesAmount) private {
        uint256 _size = (_invalidAmount != 0 ? 1 : 0) + (_noAmount != 0 ? 1 : 0) + (_yesAmount != 0 ? 1 : 0);
        uint256[] memory _tokenIds = new uint256[](_size);
        uint256[] memory _amounts = new uint256[](_size);
        if (_size == 0) {
            return;
        } else if (_size == 1) {
            _tokenIds[0] = _invalidAmount != 0 ? INVALID : _noAmount != 0 ? NO : YES;
            _amounts[0] = _invalidAmount != 0 ? _invalidAmount : _noAmount != 0 ? _noAmount : _yesAmount;
        } else if (_size == 2) {
            _tokenIds[0] = _invalidAmount != 0 ? INVALID : NO;
            _tokenIds[1] = _invalidAmount != 0 ? YES : NO;
            _amounts[0] = _invalidAmount != 0 ? _invalidAmount : _noAmount;
            _amounts[1] = _invalidAmount != 0 ? _yesAmount : _noAmount;
        } else {
            _tokenIds[0] = INVALID;
            _tokenIds[1] = NO;
            _tokenIds[2] = YES;
            _amounts[0] = _invalidAmount;
            _amounts[1] = _noAmount;
            _amounts[2] = _yesAmount;
        }
        shareToken.unsafeBatchTransferFrom(_from, _to, _tokenIds, _amounts);
    }
    
    // Returns value in range [0, 0x10000].
    function sqrt(uint32 x) private pure returns (uint32 s) {
        s = 0;
        uint32 b = uint32(1) << 15;
        while (b) {
            uint32 t = s + b;
            if (t * t <= x) s = t;
            b >>= 1;
        }
    }

    function onTokenTransfer(address _from, address _to, uint256 _value) internal {}
}
