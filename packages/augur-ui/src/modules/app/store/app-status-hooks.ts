import { useReducer } from 'react';
import {
  APP_STATUS_ACTIONS,
  DEFAULT_APP_STATUS,
  THEME,
  ODDS,
  IS_HELP_MENU_OPEN,
  IS_CONNECTION_TRAY_OPEN,
  IS_ODDS_MENU_OPEN,
  IS_ALERTS_MENU_OPEN,
  IS_MOBILE,
  Ox_ENABLED,
} from 'modules/app/store/constants';

const {
  SET_THEME,
  SET_ODDS,
  SET_IS_ODDS_MENU_OPEN,
  SET_IS_HELP_MENU_OPEN,
  SET_IS_CONNECTION_TRAY_OPEN,
  SET_IS_ALERTS_MENU_OPEN,
  CLOSE_APP_MENUS,
  SET_IS_MOBILE,
  SET_Ox_ENABLED,
} = APP_STATUS_ACTIONS;

const setHTMLTheme = theme =>
  document.documentElement.setAttribute(THEME, theme);

export function AppStatusReducer(state, action) {
  const updatedState = { ...state };
  switch (action.type) {
    case SET_THEME: {
      updatedState[THEME] = action.theme;
      break;
    }
    case SET_ODDS: {
      updatedState[ODDS] = action.odds;
      break;
    }
    case SET_IS_ODDS_MENU_OPEN: {
      updatedState[IS_ODDS_MENU_OPEN] = action.isOpen;
      updatedState[IS_HELP_MENU_OPEN] = false;
      updatedState[IS_CONNECTION_TRAY_OPEN] = false;
      updatedState[IS_ALERTS_MENU_OPEN] = false;
      break;
    }
    case SET_IS_HELP_MENU_OPEN: {
      updatedState[IS_ODDS_MENU_OPEN] = false;
      updatedState[IS_HELP_MENU_OPEN] = action.isOpen;
      updatedState[IS_CONNECTION_TRAY_OPEN] = false;
      updatedState[IS_ALERTS_MENU_OPEN] = false;
      break;
    }
    case SET_IS_CONNECTION_TRAY_OPEN: {
      updatedState[IS_ODDS_MENU_OPEN] = false;
      updatedState[IS_HELP_MENU_OPEN] = false;
      updatedState[IS_CONNECTION_TRAY_OPEN] = action.isOpen;
      updatedState[IS_ALERTS_MENU_OPEN] = false;
      break;
    }
    case SET_IS_ALERTS_MENU_OPEN: {
      updatedState[IS_ODDS_MENU_OPEN] = false;
      updatedState[IS_HELP_MENU_OPEN] = false;
      updatedState[IS_CONNECTION_TRAY_OPEN] = false;
      updatedState[IS_ALERTS_MENU_OPEN] = action.isOpen;
      break;
    }
    case CLOSE_APP_MENUS: {
      updatedState[IS_ODDS_MENU_OPEN] = false;
      updatedState[IS_HELP_MENU_OPEN] = false;
      updatedState[IS_CONNECTION_TRAY_OPEN] = false;
      updatedState[IS_ALERTS_MENU_OPEN] = false;
      break;
    }
    case SET_IS_MOBILE: {
      updatedState[IS_MOBILE] = action.isMobile;
      break;
    }
    case SET_Ox_ENABLED: {
      updatedState[Ox_ENABLED] = action.isOxEnabled;
      break;
    }
    default:
      throw new Error(
        `Error: ${action.type} not caught by App Status reducer.`
      );
  }
  window.appStatus = updatedState;
  return updatedState;
}

export const useAppStatus = (defaultState = DEFAULT_APP_STATUS) => {
  const [state, dispatch] = useReducer(AppStatusReducer, defaultState);
  setHTMLTheme(state.theme);
  return {
    ...state,
    actions: {
      setTheme: theme => {
        setHTMLTheme(theme);
        dispatch({ type: SET_THEME, theme });
      },
      setOdds: odds => dispatch({ type: SET_ODDS, odds }),
      setIsOddsMenuOpen: isOpen =>
        dispatch({ type: SET_IS_ODDS_MENU_OPEN, isOpen }),
      setIsHelpMenuOpen: isOpen =>
        dispatch({ type: SET_IS_HELP_MENU_OPEN, isOpen }),
      setIsConnectionTrayOpen: isOpen =>
        dispatch({ type: SET_IS_CONNECTION_TRAY_OPEN, isOpen }),
      setIsAlertsMenuOpen: isOpen =>
        dispatch({ type: SET_IS_ALERTS_MENU_OPEN, isOpen }),
      closeAppMenus: () => dispatch({ type: CLOSE_APP_MENUS }),
      setIsMobile: isMobile => dispatch({ type: SET_IS_MOBILE, isMobile }),
      setOxEnabled: isOxEnabled =>
        dispatch({ type: SET_Ox_ENABLED, isOxEnabled }),
    },
  };
};
