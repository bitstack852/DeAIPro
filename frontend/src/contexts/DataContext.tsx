import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import {
  Subnet,
  StatsResponse,
  NewsItem,
  ResearchArticle,
  Lesson,
  FilterConfig,
  SortConfig,
  Portfolio,
} from "../types";
import {
  fetchAllPublicData,
  fetchAllAuthenticatedData,
} from "../services/api";
import { auth } from "../firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

// ============ Types ============

interface DataState {
  // Core Data
  subnets: Subnet[];
  stats: StatsResponse | null;
  news: NewsItem[];
  research: ResearchArticle[];
  lessons: Lesson[];

  // UI State
  sortConfig: SortConfig;
  filterConfig: FilterConfig;
  selectedSubnet: Subnet | null;
  isAuthenticated: boolean;
  token: string | null;
  user: FirebaseUser | null;

  // Loading State
  isLoading: boolean;
  isSyncingData: boolean;
  error: string | null;
  lastUpdated: number | null;

  // Portfolio
  portfolio: Portfolio;

  // Display options
  viewMode: "grid" | "list";
  itemsPerPage: number;
}

type DataAction =
  | { type: "SET_SUBNETS"; payload: Subnet[] }
  | { type: "SET_STATS"; payload: StatsResponse | null }
  | { type: "SET_NEWS"; payload: NewsItem[] }
  | { type: "SET_RESEARCH"; payload: ResearchArticle[] }
  | { type: "SET_LESSONS"; payload: Lesson[] }
  | { type: "SET_SORT"; payload: SortConfig }
  | { type: "SET_FILTERS"; payload: Partial<FilterConfig> }
  | { type: "RESET_FILTERS" }
  | { type: "SELECT_SUBNET"; payload: Subnet | null }
  | { type: "SET_AUTHENTICATED"; payload: { isAuthenticated: boolean; token: string | null; user: FirebaseUser | null } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SYNCING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LAST_UPDATED"; payload: number }
  | { type: "ADD_TO_PORTFOLIO"; payload: { subnetId: number; amount: number; price: number } }
  | { type: "REMOVE_FROM_PORTFOLIO"; payload: number }
  | { type: "UPDATE_PORTFOLIO_VALUE" }
  | { type: "SET_VIEW_MODE"; payload: "grid" | "list" }
  | { type: "SET_ITEMS_PER_PAGE"; payload: number }
  | { type: "RESET_ALL" };

// ============ Default State ============

const defaultState: DataState = {
  subnets: [],
  stats: null,
  news: [],
  research: [],
  lessons: [],
  sortConfig: { key: "mc", direction: "desc" },
  filterConfig: {},
  selectedSubnet: null,
  isAuthenticated: false,
  token: null,
  user: null,
  isLoading: true,
  isSyncingData: false,
  error: null,
  lastUpdated: null,
  portfolio: {
    items: [],
    totalValue: 0,
    totalInvested: 0,
    unrealizedGain: 0,
  },
  viewMode: "grid",
  itemsPerPage: 20,
};

// ============ Reducer ============

const dataReducer = (state: DataState, action: DataAction): DataState => {
  switch (action.type) {
    case "SET_SUBNETS":
      return { ...state, subnets: action.payload };

    case "SET_STATS":
      return { ...state, stats: action.payload };

    case "SET_NEWS":
      return { ...state, news: action.payload };

    case "SET_RESEARCH":
      return { ...state, research: action.payload };

    case "SET_LESSONS":
      return { ...state, lessons: action.payload };

    case "SET_SORT":
      return { ...state, sortConfig: action.payload };

    case "SET_FILTERS":
      return {
        ...state,
        filterConfig: {
          ...state.filterConfig,
          ...action.payload,
        },
      };

    case "RESET_FILTERS":
      return { ...state, filterConfig: {} };

    case "SELECT_SUBNET":
      return { ...state, selectedSubnet: action.payload };

    case "SET_AUTHENTICATED":
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        token: action.payload.token,
        user: action.payload.user,
      };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_SYNCING":
      return { ...state, isSyncingData: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_LAST_UPDATED":
      return { ...state, lastUpdated: action.payload };

    case "ADD_TO_PORTFOLIO": {
      const { subnetId, amount, price } = action.payload;
      const existingItem = state.portfolio.items.find(
        (i) => i.subnetId === subnetId
      );

      let items = state.portfolio.items;
      if (existingItem) {
        items = items.map((i) =>
          i.subnetId === subnetId
            ? {
                ...i,
                amount: i.amount + amount,
                purchasePrice: (i.purchasePrice * i.amount + price * amount) / (i.amount + amount),
              }
            : i
        );
      } else {
        items = [
          ...items,
          {
            subnetId,
            amount,
            purchasePrice: price,
            purchaseDate: new Date().toISOString(),
          },
        ];
      }

      const totalInvested = items.reduce(
        (sum, i) => sum + i.purchasePrice * i.amount,
        0
      );

      return {
        ...state,
        portfolio: {
          ...state.portfolio,
          items,
          totalInvested,
        },
      };
    }

    case "REMOVE_FROM_PORTFOLIO": {
      const items = state.portfolio.items.filter(
        (i) => i.subnetId !== action.payload
      );
      const totalInvested = items.reduce(
        (sum, i) => sum + i.purchasePrice * i.amount,
        0
      );

      return {
        ...state,
        portfolio: {
          ...state.portfolio,
          items,
          totalInvested,
        },
      };
    }

    case "UPDATE_PORTFOLIO_VALUE": {
      let totalValue = 0;

      state.portfolio.items.forEach((item) => {
        const subnet = state.subnets.find((s) => s.id === item.subnetId);
        if (subnet) {
          totalValue += subnet.mc * 1_000_000 * item.amount;
        }
      });

      const unrealizedGain = totalValue - state.portfolio.totalInvested;

      return {
        ...state,
        portfolio: {
          ...state.portfolio,
          totalValue,
          unrealizedGain,
        },
      };
    }

    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.payload };

    case "SET_ITEMS_PER_PAGE":
      return { ...state, itemsPerPage: action.payload };

    case "RESET_ALL":
      return defaultState;

    default:
      return state;
  }
};

// ============ Context ============

interface DataContextType {
  state: DataState;
  dispatch: React.Dispatch<DataAction>;
  // Data fetching
  loadData: () => Promise<void>;
  syncData: () => Promise<void>;
  // Subnet actions
  setSortConfig: (config: SortConfig) => void;
  setFilterConfig: (config: Partial<FilterConfig>) => void;
  resetFilters: () => void;
  selectSubnet: (subnet: Subnet | null) => void;
  // Auth
  setAuthenticated: (isAuthenticated: boolean, token: string | null, user: FirebaseUser | null) => void;
  // Portfolio
  addToPortfolio: (subnetId: number, amount: number, price: number) => void;
  removeFromPortfolio: (subnetId: number) => void;
  updatePortfolioValue: () => void;
  // View
  setViewMode: (mode: "grid" | "list") => void;
  setItemsPerPage: (count: number) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ============ Provider ============

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(dataReducer, defaultState);

  // Load initial data
  const loadData = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      const data = await fetchAllPublicData();

      if (data.subnets) dispatch({ type: "SET_SUBNETS", payload: data.subnets });
      if (data.stats) dispatch({ type: "SET_STATS", payload: data.stats });
      if (data.news) dispatch({ type: "SET_NEWS", payload: data.news });
      if (data.research)
        dispatch({ type: "SET_RESEARCH", payload: data.research });
      if (data.lessons) dispatch({ type: "SET_LESSONS", payload: data.lessons });

      dispatch({ type: "SET_LAST_UPDATED", payload: Date.now() });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load data";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      console.error("Data loading error:", error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  // Sync data (background refresh)
  const syncData = useCallback(async () => {
    if (state.isSyncingData) return;

    dispatch({ type: "SET_SYNCING", payload: true });

    try {
      const data = state.isAuthenticated && state.token
        ? await fetchAllAuthenticatedData(state.token)
        : await fetchAllPublicData();

      if (data.subnets) dispatch({ type: "SET_SUBNETS", payload: data.subnets });
      if (data.stats) dispatch({ type: "SET_STATS", payload: data.stats });
      if (data.news) dispatch({ type: "SET_NEWS", payload: data.news });

      dispatch({ type: "SET_LAST_UPDATED", payload: Date.now() });
    } catch (error) {
      console.error("Data sync error:", error);
    } finally {
      dispatch({ type: "SET_SYNCING", payload: false });
    }
  }, [state.isAuthenticated, state.token, state.isSyncingData]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      syncData();
    }, 30000);

    return () => clearInterval(interval);
  }, [syncData]);

  // Firebase Auth listener
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const token = await firebaseUser.getIdToken();
        dispatch({
          type: "SET_AUTHENTICATED",
          payload: { isAuthenticated: true, token, user: firebaseUser },
        });
      } else {
        // User is signed out
        dispatch({
          type: "SET_AUTHENTICATED",
          payload: { isAuthenticated: false, token: null, user: null },
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Action creators
  const setSortConfig = useCallback((config: SortConfig) => {
    dispatch({ type: "SET_SORT", payload: config });
  }, []);

  const setFilterConfig = useCallback((config: Partial<FilterConfig>) => {
    dispatch({ type: "SET_FILTERS", payload: config });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: "RESET_FILTERS" });
  }, []);

  const selectSubnet = useCallback((subnet: Subnet | null) => {
    dispatch({ type: "SELECT_SUBNET", payload: subnet });
  }, []);

  const setAuthenticated = useCallback(
    (isAuthenticated: boolean, token: string | null, user: FirebaseUser | null) => {
      dispatch({
        type: "SET_AUTHENTICATED",
        payload: { isAuthenticated, token, user },
      });
    },
    []
  );

  const addToPortfolio = useCallback(
    (subnetId: number, amount: number, price: number) => {
      dispatch({
        type: "ADD_TO_PORTFOLIO",
        payload: { subnetId, amount, price },
      });
    },
    []
  );

  const removeFromPortfolio = useCallback((subnetId: number) => {
    dispatch({ type: "REMOVE_FROM_PORTFOLIO", payload: subnetId });
  }, []);

  const updatePortfolioValue = useCallback(() => {
    dispatch({ type: "UPDATE_PORTFOLIO_VALUE" });
  }, []);

  const setViewMode = useCallback((mode: "grid" | "list") => {
    dispatch({ type: "SET_VIEW_MODE", payload: mode });
  }, []);

  const setItemsPerPage = useCallback((count: number) => {
    dispatch({ type: "SET_ITEMS_PER_PAGE", payload: count });
  }, []);

  const value: DataContextType = {
    state,
    dispatch,
    loadData,
    syncData,
    setSortConfig,
    setFilterConfig,
    resetFilters,
    selectSubnet,
    setAuthenticated,
    addToPortfolio,
    removeFromPortfolio,
    updatePortfolioValue,
    setViewMode,
    setItemsPerPage,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// ============ Hook ============

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
};
