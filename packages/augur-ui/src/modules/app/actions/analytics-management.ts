import { Analytics, Analytic } from 'modules/types';
import { ThunkDispatch } from 'redux-thunk';
import { Action } from 'redux';
import store, { AppState } from 'store';
import { sendAnalytic } from 'services/analytics/helpers';

export const ADD_ANALYTIC = 'ADD_ANALYTIC';
export const REMOVE_ANALYTIC = 'REMOVE_ANALYTIC';
export const UPDATE_ANALYTIC = 'UPDATE_ANALYTIC';

const SEND_DELAY_SECONDS = 30;

export const loadAnalytics = (analytics: Analytics) => (
  dispatch: ThunkDispatch<void, any, Action>
) => {
  const { blockchain } = store.getState() as AppState;
  Object.keys(analytics).map(id => {
      const analytic = analytics[id];
      if ((blockchain.currentAugurTimestamp - analytic.addedTimestamp) > SEND_DELAY_SECONDS) {
        dispatch(sendAnalytic(analytic));
        dispatch(removeAnalytic(id));
      } else {
        dispatch(addAnalytic(analytic, id));
      }
  });
};

export const addAnalytic = (analytic: Analytic, id: string) => ({
  type: ADD_ANALYTIC,
  data: {
    analytic,
    id,
  },
});

export const updateAnalytic = (analytic: Analytic, id: string) => ({
  type: UPDATE_ANALYTIC,
  data: {
    analytic,
    id,
  },
});

export const removeAnalytic = (id: string) => ({
  type: REMOVE_ANALYTIC,
  data: { id },
});
