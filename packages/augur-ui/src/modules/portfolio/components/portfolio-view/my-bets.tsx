import React, { useMemo, useState } from 'react';
import classNames from 'classnames';

import Styles from 'modules/portfolio/components/portfolio-view/my-bets.styles.less';
import {
  ExternalLinkButton,
  PrimaryButton,
  FilterButton,
} from 'modules/common/buttons';
import { PillSelection, SquareDropdown } from 'modules/common/selection';
import { HelmetTag } from 'modules/seo/helmet-tag';
import { PORTFOLIO_VIEW_HEAD_TAGS } from 'modules/seo/helmet-configs';
import {
  SPORTS_MARKET_TYPES,
  MY_BETS_VIEW_BY,
  MY_BETS_MARKET_STATUS,
  MY_BETS_BET_DATE,
  EVENT,
  MARKET_STATE_TYPES,
  GAMES,
  RESOLVED,
  REPORTING_STATE,
  MARKET_OPEN,
  MARKET_REPORTING,
  MARKET_CLOSED,
} from 'modules/common/constants';
import { MARKETS } from 'modules/routes/constants/views';
import { FilterNotice } from 'modules/common/filter-notice';
import { EmptyMagnifyingGlass } from 'modules/common/icons';
import { Game, Outcomes } from '../common/common';
import { useMyBetsStore } from 'modules/portfolio/store/my-bets';
import {
  MOCK_GAMES_DATA,
  MOCK_FUTURES_DATA,
  MOCK_OUTCOMES_DATA,
} from 'modules/portfolio/store/constants';
import { FilterSearchPure } from 'modules/filter-sort/filter-search';

export function processRows(
  viewBy,
  marketStatus,
  betDate,
  selectedMarketCardType,
  selectedMarketStateType,
  search
) {
  let rows = MOCK_GAMES_DATA;
  // todo: filter/search
  if (MY_BETS_VIEW_BY[viewBy].label === EVENT) {
    rows =
      SPORTS_MARKET_TYPES[selectedMarketCardType].label === GAMES
        ? MOCK_GAMES_DATA
        : MOCK_FUTURES_DATA;
    rows = rows
      .filter(data => {
        const { reportingState } = data;
        const marketStatusLabel = MY_BETS_MARKET_STATUS[marketStatus].label;
        if (marketStatusLabel === MARKET_OPEN) {
          return reportingState === REPORTING_STATE.PRE_REPORTING;
        } else if (marketStatusLabel === MARKET_REPORTING) {
          return (
            reportingState === REPORTING_STATE.DESIGNATED_REPORTING ||
            reportingState === REPORTING_STATE.OPEN_REPORTING ||
            reportingState === REPORTING_STATE.AWAITING_NEXT_WINDOW ||
            reportingState === REPORTING_STATE.CROWDSOURCING_DISPUTE
          );
        } else if (marketStatusLabel === MARKET_CLOSED) {
          return reportingState === REPORTING_STATE.FINALIZED;
        } else {
          return true;
        }
      })
      .filter(
        data =>
          data.description.toLowerCase().indexOf(search.toLowerCase()) >= 0
      )
      .sort((a, b) => b.startTime - a.startTime);
  } else {
    rows = MOCK_OUTCOMES_DATA.filter(data =>
      MARKET_STATE_TYPES[selectedMarketStateType].label === RESOLVED
        ? data.reportingState === REPORTING_STATE.FINALIZED
        : data.reportingState !== REPORTING_STATE.FINALIZED
    );

    rows = rows
      .filter(data => {
        const interval = MY_BETS_BET_DATE[betDate].periodInterval;
        // todo: switch to use currentTimestamp
        return Date.now() / 1000 - data.betDate < interval;
      })
      .filter(
        data => data.outcome.toLowerCase().indexOf(search.toLowerCase()) >= 0
      )
      .sort((a, b) => b.betDate - a.betDate);
  }
  return rows;
}
export const MyBets = () => {
  const {
    viewBy,
    marketStatus,
    betDate,
    selectedMarketCardType,
    selectedMarketStateType,
    actions: {
      setViewBy,
      setMarketStatus,
      setBetDate,
      setSelectedMarketCardType,
      setSelectedMarketStateType,
    },
  } = useMyBetsStore();

  const [search, setSearch] = useState('');

  const rows = useMemo(
    () =>
      processRows(
        viewBy,
        marketStatus,
        betDate,
        selectedMarketCardType,
        selectedMarketStateType,
        search
      ),
    [
      viewBy,
      marketStatus,
      betDate,
      selectedMarketCardType,
      selectedMarketStateType,
      search,
    ]
  );

  const showEvents = MY_BETS_VIEW_BY[viewBy].label === EVENT;

  return (
    <div className={classNames(Styles.MyBets)}>
      <HelmetTag {...PORTFOLIO_VIEW_HEAD_TAGS} />
      <div>
        <div>
          <span>My Bets</span>
          <span>To view your unmatched bets, go to Trading.</span>
          <ExternalLinkButton
            condensedStyle
            customLink={{
              pathname: MARKETS,
            }}
            label="go to trading"
          />
        </div>
        <FilterNotice
          showDismissButton={false}
          show
          color="active"
          content={
            <div className={Styles.ClaimWinnings}>
              <span>
                You have <b>$200.00</b> in winnings to claim.
              </span>
              <PrimaryButton text="Claim Bets" action={null} />
            </div>
          }
        />
        <div>
          <span>
            View by
            <SquareDropdown
              options={MY_BETS_VIEW_BY}
              defaultValue={viewBy}
              onChange={viewBy => {
                setViewBy(viewBy);
              }}
              minimalStyle
            />
          </span>
          {showEvents && (
            <span>
              Market Status:
              <SquareDropdown
                options={MY_BETS_MARKET_STATUS}
                defaultValue={marketStatus}
                onChange={marketStatus => setMarketStatus(marketStatus)}
                minimalStyle
              />
            </span>
          )}
          {!showEvents && (
            <span>
              Bet Date:
              <SquareDropdown
                options={MY_BETS_BET_DATE}
                defaultValue={betDate}
                onChange={betDate => setBetDate(betDate)}
                minimalStyle
              />
            </span>
          )}
        </div>
        {showEvents && (
          <PillSelection
            options={SPORTS_MARKET_TYPES}
            defaultSelection={selectedMarketCardType}
            large
            onChange={selectedMarketCardType =>
              setSelectedMarketCardType(selectedMarketCardType)
            }
          />
        )}
        {!showEvents && (
          <PillSelection
            options={MARKET_STATE_TYPES}
            defaultSelection={selectedMarketStateType}
            large
            onChange={selectedMarketStateType =>
              setSelectedMarketStateType(selectedMarketStateType)
            }
          />
        )}
        <FilterSearchPure
          placeholder="Search markets & outcomes..."
          search={search}
          onChange={search => setSearch(search)}
        />
        <FilterButton title="Filters" />
      </div>
      <div>
        {rows.length === 0 && (
          <section>
            {EmptyMagnifyingGlass}
            <span>No events found</span>
            <span>
              Try a different date range. <b>Clear Filter</b>
            </span>
          </section>
        )}
        {showEvents &&
          rows.map(row => (
            <Game
              row={row}
              type={SPORTS_MARKET_TYPES[selectedMarketCardType].label}
            />
          ))}
        {rows.length > 0 && !showEvents && <Outcomes rows={rows} />}
      </div>
    </div>
  );
};