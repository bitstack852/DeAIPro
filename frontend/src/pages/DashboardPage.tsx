import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import { EmptyState, Pagination } from "../components/layout/Layout";
import { StatCard, SubnetCard, SubnetTable, CategoryDistribution } from "../components/ui/SubnetCard";
import { LoadingSpinner, Input, Select } from "../components/ui/Button";
import { useFilteredAndSortedSubnets, usePaginatedItems, useSubnetStats } from "../utils/hooks";
import { formatCurrency, formatCompactNumber } from "../utils/formatters";

export const DashboardPage: React.FC = () => {
  const { state } = useData();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const safeSubnets = Array.isArray(state.subnets) ? state.subnets : [];

  const filteredSubnets = useFilteredAndSortedSubnets(
    safeSubnets,
    { searchTerm, category: categoryFilter || undefined },
    "mc",
    "desc"
  );

  const { items: paginatedSubnets, totalPages } = usePaginatedItems(filteredSubnets, page, viewMode === "grid" ? 9 : 20);
  const stats = useSubnetStats(safeSubnets);

  const categories = Array.from(new Set(safeSubnets.map(s => s.cat))).sort();

  if (state.isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 400 }}>
        <LoadingSpinner text="Loading dashboard…" />
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 40px", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Key Metrics */}
      <section>
        <SectionTitle>Key Metrics</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 12 }}>
          <StatCard
            icon="💰" title="Total Market Cap" color="blue"
            value={formatCurrency(state.stats?.market_cap || 0)}
            subtitle="Entire ecosystem"
          />
          <StatCard
            icon="🪙" title="TAO Price" color="green"
            value={formatCurrency(state.stats?.tao_price || 0)}
            trend={state.stats?.tao_price_change_24h}
          />
          <StatCard
            icon="📡" title="Active Subnets" color="purple"
            value={state.stats?.active_subnets || 0}
            subtitle="Live on network"
          />
          <StatCard
            icon="💵" title="24h Volume" color="orange"
            value={formatCurrency(state.stats?.volume_24h || 0)}
            subtitle="Trading volume"
          />
        </div>
      </section>

      {/* Ecosystem Overview */}
      <section>
        <SectionTitle>Ecosystem Overview</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <StatCard title="Avg Score"       color="blue"   value={stats.averageScore.toFixed(1)} />
            <StatCard title="Median Mkt Cap"  color="green"  value={formatCurrency(stats.medianMarketCap * 1_000_000)} />
            <StatCard title="Total Emissions" color="orange" value={formatCompactNumber(stats.totalEmissions)} />
            <StatCard title="Total Mkt Cap"   color="purple" value={formatCurrency(stats.totalMarketCap * 1_000_000)} />
          </div>
          <CategoryDistribution subnets={safeSubnets} />
        </div>
      </section>

      {/* Subnets */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <SectionTitle style={{ margin: 0 }}>Subnets</SectionTitle>
          <div style={{ display: "flex", gap: 6 }}>
            <ViewToggle active={viewMode === "table"} onClick={() => setViewMode("table")}>☰ Table</ViewToggle>
            <ViewToggle active={viewMode === "grid"}  onClick={() => setViewMode("grid")}>⊞ Grid</ViewToggle>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10, marginBottom: 14 }}>
          <Input
            placeholder="Search subnets…"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            icon="🔍"
          />
          <Select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            options={[{ value: "", label: "All Categories" }, ...categories.map(c => ({ value: c, label: c }))]}
          />
        </div>

        {paginatedSubnets.length === 0 ? (
          <EmptyState icon="🔍" title="No subnets found" message={searchTerm || categoryFilter ? "Try adjusting your filters" : "No subnet data available yet"} />
        ) : viewMode === "table" ? (
          <SubnetTable subnets={paginatedSubnets} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {paginatedSubnets.map(s => <SubnetCard key={s.id} subnet={s} />)}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </section>

      {/* Latest News */}
      {state.news.length > 0 && (
        <section>
          <SectionTitle>Latest News</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {state.news.slice(0, 5).map((n, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>📰</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.t}</p>
                  <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--text-dim)" }}>
                    <span style={{ background: "var(--accent-glow)", color: "var(--accent-light)", padding: "1px 7px", borderRadius: 999, fontWeight: 600 }}>{n.tg}</span>
                    <span>{n.s}</span>
                    <span>{n.tm}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.07em", ...style }}>{children}</h2>
);

const ViewToggle: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: "6px 12px",
      borderRadius: 8,
      border: "1px solid var(--border)",
      background: active ? "var(--accent-glow)" : "var(--surface-2)",
      color: active ? "var(--accent-light)" : "var(--text-muted)",
      fontSize: 12,
      fontWeight: active ? 600 : 400,
      cursor: "pointer",
      transition: "all 0.15s",
    }}
  >
    {children}
  </button>
);
