import { augur } from 'services/augurjs'
import logError from 'utils/log-error'

export function checkAccountAllowance(callback = logError) {
  return (dispatch, getState) => {
    const { loginAccount } = getState()
    augur.api.Cash.allowance({
      _owner: loginAccount.address,
      _spender: augur.contracts.addresses[augur.rpc.getNetworkID()].Augur
    }, (err, allowance) => {
      if (err) callback(err)
      callback(null, allowance)
    })
  }
}

export function approveAugur(callback = logError) {
  return (dispatch, getState) => {
    const { loginAccount } = getState()
    augur.accounts.approveAugur(loginAccount.address, loginAccount.auth, callback)
  }
}
