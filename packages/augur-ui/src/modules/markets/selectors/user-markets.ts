import { CREATE_MARKET, ZERO } from 'modules/common/constants';
import selectMarkets from "modules/markets/selectors/markets-all";
import { getLastTradeTimestamp } from "modules/portfolio/helpers/get-last-trade-timestamp";
import { isSameAddress } from "utils/isSameAddress";
import { generateTxParameterId } from 'utils/generate-tx-parameter-id';
import { formatDate } from "utils/format-date";
import { AppStatus } from "modules/app/store/app-status";
import { PendingOrders } from "modules/app/store/pending-orders";
import { Markets } from "../store/markets";

export const selectAuthorOwnedMarkets = () => {
    const allMarkets = selectMarkets();
    const { pendingQueue,  loginAccount: {address: authorId}} = AppStatus.get();
    const { marketTradingHistory } = Markets.get();

    if (!allMarkets || !authorId) return null;
    const { pendingLiquidityOrders } = PendingOrders.get();
    let filteredMarkets = allMarkets.filter(
      market => isSameAddress(market.author, authorId)
    );
    const pendingMarkets = Object.keys(pendingQueue[CREATE_MARKET] || {}).map(pendingId => {
      const pendingData = pendingQueue[CREATE_MARKET][pendingId];
      const data = Object.assign(pendingData, pendingData.data)
      data.id = pendingId;
      return data;
    });
    filteredMarkets = pendingMarkets.concat(filteredMarkets);
    return filteredMarkets.map(m => {
      const pendingTradedId = m.transactionHash || generateTxParameterId(m.txParams);
      const marketId = m.id || pendingTradedId;
      const recentlyTraded = getLastTradeTimestamp(marketTradingHistory[marketId]);
      const hasTradeHistory = (marketTradingHistory[marketId] || []).length > 0;
      return {
        ...m,
        hasPendingLiquidityOrders: !!pendingLiquidityOrders[pendingTradedId],
        orderBook: pendingLiquidityOrders[marketId],
        recentlyTraded,
        recentlyDepleted: !m.passDefaultLiquiditySpread
          ? hasTradeHistory
            ? recentlyTraded
            : m.creationTimeFormatted
          : formatDate(ZERO),
      };
    });
  }
