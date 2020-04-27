import logError from 'utils/log-error';
import { augurSdk } from 'services/augursdk';
import { LoginAccount } from 'modules/types';
import { updateLoginAccount } from 'modules/account/actions/login-account';
import { ThunkDispatch } from 'redux-thunk';
import { Action } from 'redux';
import { toChecksumAddress } from 'ethereumjs-util';
import {
  updateAppStatus,
  GSN_ENABLED,
  WALLET_STATUS,
} from 'modules/app/actions/update-app-status';
import { loadAccountDataFromLocalStorage } from './load-account-data-from-local-storage';
import { IS_LOGGED, updateAuthStatus } from 'modules/auth/actions/auth-status';
import { loadAccountData } from 'modules/auth/actions/load-account-data';
import { updateAssets } from 'modules/auth/actions/update-assets';
import { NetworkId } from '@augurproject/artifacts';
import { AppState } from 'appStore';
import { updateModal } from 'modules/modal/actions/update-modal';
import { MODAL_ERROR, WALLET_STATUS_VALUES, CREATEAUGURWALLET, SUCCESS } from 'modules/common/constants';
import { TXEventName } from '@augurproject/sdk';
import { addUpdatePendingTransaction } from 'modules/pending-queue/actions/pending-queue-management';
import { addAlert } from 'modules/alerts/actions/alerts';

export const updateSdk = (
  loginAccount: Partial<LoginAccount>,
  networkId: string,
  useGSN: boolean,
  setOxEnabled: Function,
) => async (
  dispatch: ThunkDispatch<void, any, Action>,
) => {
  if (!loginAccount || !loginAccount.address || !loginAccount.meta) return;
  if (!augurSdk.sdk) return;

  let newAccount = { ...loginAccount };

  try {
    setOxEnabled(!!augurSdk.sdk.zeroX);
    dispatch(updateAppStatus(GSN_ENABLED, useGSN));
    if (useGSN) {
      const hasWallet = await augurSdk.client.gsn.userHasInitializedWallet(newAccount.address);
      if (hasWallet) {
        dispatch(updateAppStatus(WALLET_STATUS, WALLET_STATUS_VALUES.CREATED));
      } else {
        dispatch(updateAppStatus(WALLET_STATUS, WALLET_STATUS_VALUES.WAITING_FOR_FUNDING));
      }
      const walletAddress = await augurSdk.client.gsn.calculateWalletAddress(
        newAccount.address
      );
      newAccount = {
        ...loginAccount,
        meta: {
          ...loginAccount.meta,
          address: toChecksumAddress(walletAddress),
        },
        mixedCaseAddress: toChecksumAddress(walletAddress),
        address: toChecksumAddress(walletAddress),
      };
    }
    dispatch(loadAccountDataFromLocalStorage(newAccount.address));
    await augurSdk.syncUserData(
      newAccount.mixedCaseAddress,
      newAccount.meta.signer,
      networkId as NetworkId,
      useGSN
    );

    dispatch(updateLoginAccount(newAccount));
    dispatch(updateAuthStatus(IS_LOGGED, true));
    dispatch(loadAccountData());
    dispatch(updateAssets());
  } catch (error) {
    logError(error);
    dispatch(
      updateModal({
        type: MODAL_ERROR,
        error,
      })
    );
  }
};

export const createFundedGsnWallet = () => async (
  dispatch: ThunkDispatch<void, any, Action>,
  getState: () => AppState
) => {
  try {
    dispatch(addUpdatePendingTransaction(CREATEAUGURWALLET, TXEventName.Pending));

    await augurSdk.client.gsn.initializeWallet();

    dispatch(updateAppStatus(WALLET_STATUS, WALLET_STATUS_VALUES.CREATED));

    const timestamp = getState().blockchain.currentAugurTimestamp * 1000;
    const alert = {
      name: CREATEAUGURWALLET,
      uniqueId: timestamp,
      toast: true,
      description: 'Your account has been initialized!',
      title: 'Account initialization',
      index: 0,
      timestamp,
      status: SUCCESS,
      params: {
        market: '0x0000000000000000000000000000000000000000',
      }
    }
    dispatch(addAlert(alert));
  } catch (e) {
    dispatch(addUpdatePendingTransaction(CREATEAUGURWALLET, TXEventName.Failure));
    dispatch(updateAppStatus(WALLET_STATUS, WALLET_STATUS_VALUES.FUNDED_NEED_CREATE));
  }
};
