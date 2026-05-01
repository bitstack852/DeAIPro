// API Response Types
export interface Subnet {
  id: number;
  n: string; // name
  cat: string; // category
  mc: number; // market cap millions
  em: number; // emissions
  tao: number; // TAO price
  pe: number; // price to earnings
  reg: number; // registration
  val: number; // validators
  trend: "up" | "down" | "stable";
  score: number;
  alpha: number;
  validators: number;
  miners: number;
  share: number;
  dailyTao: number;
  uptime: number;
  emission: number;
  github: number;
  commits: number;
  contributors: number;
  stars: number;
  testCov: number;
  docScore: number;
  momentum: number;
  liquidity: number;
  quality: number;
  economic: number;
  network: number;
  fundamental: number;
  live?: boolean;
  authenticated?: boolean;
}

export interface StatsResponse {
  tao_price: number;
  tao_price_btc: number;
  market_cap: number;
  volume_24h: number;
  tao_price_change_24h: number;
  volume_change_24h: number;
  active_subnets: number;
  sum_alpha_mc: number;
  total_ecosystem_mc: number;
  source: string;
  timestamp: string;
}

export interface NewsItem {
  tg: string; // tag/category
  t: string; // title
  s: string; // source
  tm: string; // time
  url: string;
}

export interface ResearchArticle {
  i: string; // icon
  c: string; // category
  t: string; // title
  ex: string; // excerpt
  d: string; // date
  content: string;
}

export interface Lesson {
  id: number;
  title: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  duration: number;
  content: string;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
}

export interface AccessRequest {
  email: string;
}

export interface PendingRequest {
  email: string;
  created_at: string;
  expires_at: string;
  request_count: number;
}

export interface AdminStatusData {
  counts: {
    pending: number;
    approved: number;
    revoked: number;
    expired: number;
    total: number;
  };
  pending_requests: PendingRequest[];
}

// UI State Types
export interface SortConfig {
  key: keyof Subnet;
  direction: "asc" | "desc";
}

export interface FilterConfig {
  category?: string;
  minMarketCap?: number;
  maxMarketCap?: number;
  minScore?: number;
  searchTerm?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface PortfolioItem {
  subnetId: number;
  amount: number;
  purchasePrice: number;
  purchaseDate: string;
}

export interface Portfolio {
  items: PortfolioItem[];
  totalValue: number;
  totalInvested: number;
  unrealizedGain: number;
}
