import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { Message } from "modules/modal/message";
import { ThunkDispatch } from "redux-thunk";
import { Action } from "redux";
import { approveToTrade } from "modules/contracts/actions/contractCalls";
import { AppState } from "appStore";
import { MARKET_CREATION_COPY } from "modules/create-market/constants";
import { AppStatus } from "modules/app/store/app-status";

const mapStateToProps = (state: AppState) => {
  const { modal, loginAccount: account } = AppStatus.get();
  return ({
    modal,
    account,
  });
};

const mapDispatchToProps = (dispatch: ThunkDispatch<void, any, Action>) => ({
  closeModal: () => AppStatus.actions.closeModal(),
  approveAccount: () => approveToTrade()
});

const mergeProps = (sP: any, dP: any, oP: any) => ({
  title: 'Market Creation Help',
  description: oP.copyType && MARKET_CREATION_COPY[oP.copyType].subheader,
  closeAction: () => {
    dP.closeModal();
  },
  buttons: [
    {
      text: "Close",
      action: () => {
        dP.closeModal();
      }
    }
  ]
});

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
  )(Message),
);
