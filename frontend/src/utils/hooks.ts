import { useMemo } from "react";
import { Subnet, FilterConfig } from "../types";

/**
 * Filter and sort subnets based on current configuration
 */
export const useFilteredAndSortedSubnets = (
  subnets: Subnet[],
  filters: FilterConfig,
  sortKey: keyof Subnet = "mc",
  sortDirection: "asc" | "desc" = "desc"
) => {
  return useMemo(() => {
    let filtered = [...(Array.isArray(subnets) ? subnets : [])];

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter((s) => s.cat === filters.category);
    }

    // Apply market cap range filter
    if (filters.minMarketCap !== undefined) {
      filtered = filtered.filter((s) => s.mc >= filters.minMarketCap!);
    }
    if (filters.maxMarketCap !== undefined) {
      filtered = filtered.filter((s) => s.mc <= filters.maxMarketCap!);
    }

    // Apply score filter
    if (filters.minScore !== undefined) {
      filtered = filtered.filter((s) => s.score >= filters.minScore!);
    }

    // Apply search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((s) => s.n.toLowerCase().includes(term));
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return filtered;
  }, [subnets, filters, sortKey, sortDirection]);
};

/**
 * Paginate items
 */
export const usePaginatedItems = <T,>(
  items: T[],
  page: number,
  pageSize: number
) => {
  return useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = items.slice(startIndex, endIndex);
    const totalPages = Math.ceil(items.length / pageSize);

    return {
      items: paginatedItems,
      totalPages,
      total: items.length,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }, [items, page, pageSize]);
};

/**
 * Get unique categories from subnets
 */
export const useUniqueCategories = (subnets: Subnet[]) => {
  return useMemo(() => {
    const categories = new Set(subnets.map((s) => s.cat));
    return Array.from(categories).sort();
  }, [subnets]);
};

/**
 * Calculate statistics from subnets
 */
export const useSubnetStats = (subnets: Subnet[]) => {
  return useMemo(() => {
    if (subnets.length === 0) {
      return {
        totalMarketCap: 0,
        averageScore: 0,
        medianMarketCap: 0,
        totalEmissions: 0,
        highestScore: 0,
        lowestScore: 0,
      };
    }

    const marketCaps = subnets.map((s) => s.mc).sort((a, b) => a - b);
    const scores = subnets.map((s) => s.score);

    const totalMarketCap = subnets.reduce((sum, s) => sum + s.mc, 0);
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const medianMarketCap = marketCaps[Math.floor(marketCaps.length / 2)];
    const totalEmissions = subnets.reduce((sum, s) => sum + s.em, 0);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    return {
      totalMarketCap,
      averageScore,
      medianMarketCap,
      totalEmissions,
      highestScore,
      lowestScore,
    };
  }, [subnets]);
};

/**
 * Format large numbers with abbreviations
 */
export const useFormattedNumber = (num: number | undefined) => {
  return useMemo(() => {
    if (num === undefined || num === null) return "-";

    if (num >= 1_000_000_000) {
      return `$${(num / 1_000_000_000).toFixed(2)}B`;
    }
    if (num >= 1_000_000) {
      return `$${(num / 1_000_000).toFixed(2)}M`;
    }
    if (num >= 1_000) {
      return `$${(num / 1_000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  }, [num]);
};

/**
 * Format percentage
 */
export const useFormattedPercent = (value: number | undefined, decimals = 2) => {
  return useMemo(() => {
    if (value === undefined || value === null) return "-";
    return `${(value * 100).toFixed(decimals)}%`;
  }, [value, decimals]);
};

/**
 * Compare two values and determine trend
 */
export const useTrendIndicator = (current: number, previous: number) => {
  return useMemo(() => {
    if (current === previous) return "stable";
    return current > previous ? "up" : "down";
  }, [current, previous]);
};

/**
 * Get subnet by ID
 */
export const useSubnetById = (subnets: Subnet[], id: number | undefined) => {
  return useMemo(() => {
    if (!id) return null;
    return subnets.find((s) => s.id === id) || null;
  }, [subnets, id]);
};

/**
 * Calculate portfolio metrics
 */
export const usePortfolioMetrics = (
  items: { subnetId: number; amount: number; purchasePrice: number }[],
  subnets: Subnet[],
  taoPrice: number = 180.80
) => {
  return useMemo(() => {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let allocations: { subnetId: number; subnetName: string; percentage: number }[] = [];

    items.forEach((item) => {
      const subnet = subnets.find((s) => s.id === item.subnetId);
      if (!subnet) return;

      const invested = item.purchasePrice * item.amount;
      const currentValue = subnet.mc * 1_000_000 * item.amount / (subnet.tao || taoPrice);

      totalInvested += invested;
      totalCurrentValue += currentValue;
    });

    items.forEach((item) => {
      const subnet = subnets.find((s) => s.id === item.subnetId);
      if (!subnet) return;

      const currentValue = subnet.mc * 1_000_000 * item.amount / (subnet.tao || taoPrice);
      const percentage = (currentValue / totalCurrentValue) * 100 || 0;

      allocations.push({
        subnetId: item.subnetId,
        subnetName: subnet.n,
        percentage,
      });
    });

    const gainLoss = totalCurrentValue - totalInvested;
    const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue,
      gainLoss,
      gainLossPercent,
      allocations,
      isPositive: gainLoss >= 0,
    };
  }, [items, subnets, taoPrice]);
};

/**
 * Search subnets
 */
export const useSearchSubnets = (
  subnets: Subnet[],
  searchTerm: string
) => {
  return useMemo(() => {
    if (!searchTerm) return subnets;

    const term = searchTerm.toLowerCase();
    return subnets.filter(
      (s) =>
        s.n.toLowerCase().includes(term) ||
        s.cat.toLowerCase().includes(term)
    );
  }, [subnets, searchTerm]);
};

/**
 * Get subnets by category
 */
export const useSubnetsByCategory = (subnets: Subnet[]) => {
  return useMemo(() => {
    const grouped: { [key: string]: Subnet[] } = {};

    subnets.forEach((subnet) => {
      if (!grouped[subnet.cat]) {
        grouped[subnet.cat] = [];
      }
      grouped[subnet.cat].push(subnet);
    });

    return grouped;
  }, [subnets]);
};

/**
 * Format date for display
 */
export const useFormattedDate = (date: string | number | Date, format: "short" | "long" = "short") => {
  return useMemo(() => {
    try {
      const d = new Date(date);
      if (format === "short") {
        return d.toLocaleDateString();
      }
      return d.toLocaleString();
    } catch {
      return "-";
    }
  }, [date, format]);
};
