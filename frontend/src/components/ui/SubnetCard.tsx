import React from "react";
import { Subnet } from "../../types";
import { formatCurrency, getCategoryIcon, formatCompactNumber } from "../../utils/formatters";

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon?: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  color?: "blue" | "green" | "orange" | "purple" | "red";
  onClick?: () => void;
}

const accentMap: Record<string, string> = {
  blue:   "var(--accent)",
  green:  "var(--success)",
  orange: "var(--warning)",
  purple: "var(--accent-light)",
  red:    "var(--danger)",
};

const glowMap: Record<string, string> = {
  blue:   "rgba(91,94,244,0.12)",
  green:  "rgba(16,185,129,0.12)",
  orange: "rgba(245,158,11,0.12)",
  purple: "rgba(124,127,255,0.12)",
  red:    "rgba(239,68,68,0.12)",
};

export const StatCard: React.FC<StatCardProps> = ({
  icon, title, value, subtitle, trend, trendLabel = "24h", color = "blue", onClick,
}) => {
  const accent = accentMap[color];
  const glow   = glowMap[color];

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 12,
        padding: "20px",
        cursor: onClick ? "pointer" : undefined,
        transition: "all 0.15s ease",
      }}
      onMouseEnter={onClick ? e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px ${glow}`; } : undefined}
      onMouseLeave={onClick ? e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; } : undefined}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </p>
        {icon && (
          <div style={{ width: 32, height: 32, borderRadius: 8, background: glow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
            {icon}
          </div>
        )}
      </div>

      <p style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", margin: "0 0 6px", lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </p>

      {subtitle && <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0 }}>{subtitle}</p>}

      {trend !== undefined && (
        <div
          style={{
            marginTop: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            background: trend >= 0 ? "var(--success-bg)" : "var(--danger-bg)",
            color: trend >= 0 ? "var(--success)" : "var(--danger)",
          }}
        >
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(2)}% {trendLabel}
        </div>
      )}
    </div>
  );
};

// ── Subnet Card ───────────────────────────────────────────────────────────────

interface SubnetCardProps {
  subnet: Subnet;
  onClick?: () => void;
  isSelected?: boolean;
}

export const SubnetCard: React.FC<SubnetCardProps> = ({ subnet, onClick, isSelected }) => {
  const trendColor = subnet.trend === "up" ? "var(--success)" : subnet.trend === "down" ? "var(--danger)" : "var(--warning)";
  const trendBg    = subnet.trend === "up" ? "var(--success-bg)" : subnet.trend === "down" ? "var(--danger-bg)" : "var(--warning-bg)";
  const trendIcon  = subnet.trend === "up" ? "▲" : subnet.trend === "down" ? "▼" : "●";

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: isSelected ? "0 0 0 1px var(--accent), 0 4px 24px var(--accent-glow)" : "none",
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px var(--accent-glow)";
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
            {getCategoryIcon(subnet.cat)}
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>{subnet.n}</h3>
            <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0 }}>#{subnet.id} · {subnet.cat}</p>
          </div>
        </div>
        <span style={{ background: trendBg, color: trendColor, fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 999, flexShrink: 0 }}>
          {trendIcon} {subnet.trend}
        </span>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <Metric label="Market Cap" value={formatCurrency(subnet.mc * 1_000_000)} />
        <Metric label="Score" value={subnet.score} highlight />
        <Metric label="Daily TAO" value={formatCompactNumber(subnet.dailyTao)} />
        <Metric label="Uptime" value={`${subnet.uptime}%`} />
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--border-subtle)", fontSize: 11, color: "var(--text-dim)" }}>
        <span>Validators: {subnet.validators}</span>
        <span>Miners: {subnet.miners}</span>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "8px 10px" }}>
    <p style={{ fontSize: 10, color: "var(--text-dim)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
    <p style={{ fontSize: 13, fontWeight: 700, color: highlight ? "var(--accent-light)" : "var(--text)", margin: 0 }}>{value}</p>
  </div>
);

// ── Subnet Table ──────────────────────────────────────────────────────────────

interface SubnetTableProps {
  subnets: Subnet[];
  isLoading?: boolean;
  onSubnetClick?: (subnet: Subnet) => void;
  selectedSubnetId?: number;
  columns?: Array<"rank" | "name" | "category" | "marketCap" | "score" | "dailyTao" | "uptime" | "trend">;
}

export const SubnetTable: React.FC<SubnetTableProps> = ({
  subnets,
  isLoading = false,
  onSubnetClick,
  selectedSubnetId,
  columns = ["rank", "name", "category", "marketCap", "score", "dailyTao", "uptime"],
}) => {
  if (isLoading) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 52, margin: "0 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 16 }}>
            <div className="skeleton" style={{ width: 24, height: 14, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4, marginLeft: "auto" }} />
          </div>
        ))}
      </div>
    );
  }

  const thStyle: React.CSSProperties = { padding: "11px 14px", fontSize: 11, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--surface-2)", textAlign: "left", whiteSpace: "nowrap" };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {columns.includes("rank")      && <th style={thStyle}>#</th>}
              {columns.includes("name")      && <th style={thStyle}>Name</th>}
              {columns.includes("category")  && <th style={thStyle}>Category</th>}
              {columns.includes("marketCap") && <th style={{ ...thStyle, textAlign: "right" }}>Market Cap</th>}
              {columns.includes("score")     && <th style={{ ...thStyle, textAlign: "center" }}>Score</th>}
              {columns.includes("dailyTao")  && <th style={{ ...thStyle, textAlign: "right" }}>Daily TAO</th>}
              {columns.includes("uptime")    && <th style={{ ...thStyle, textAlign: "center" }}>Uptime</th>}
              {columns.includes("trend")     && <th style={{ ...thStyle, textAlign: "center" }}>Trend</th>}
            </tr>
          </thead>
          <tbody>
            {subnets.map((subnet, index) => {
              const isActive = selectedSubnetId === subnet.id;
              const trendColor = subnet.trend === "up" ? "var(--success)" : subnet.trend === "down" ? "var(--danger)" : "var(--warning)";
              const trendIcon  = subnet.trend === "up" ? "▲" : subnet.trend === "down" ? "▼" : "●";

              return (
                <tr
                  key={subnet.id}
                  onClick={() => onSubnetClick?.(subnet)}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    background: isActive ? "var(--accent-glow)" : "transparent",
                    cursor: onSubnetClick ? "pointer" : undefined,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {columns.includes("rank") && (
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>{index + 1}</td>
                  )}
                  {columns.includes("name") && (
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{getCategoryIcon(subnet.cat)}</span>
                        {subnet.n}
                      </div>
                    </td>
                  )}
                  {columns.includes("category") && (
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ background: "var(--accent-glow)", color: "var(--accent-light)", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 999 }}>
                        {subnet.cat}
                      </span>
                    </td>
                  )}
                  {columns.includes("marketCap") && (
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "var(--text)", textAlign: "right" }}>
                      {formatCurrency(subnet.mc * 1_000_000)}
                    </td>
                  )}
                  {columns.includes("score") && (
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <span style={{ background: "var(--surface-2)", color: "var(--accent-light)", fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                        {subnet.score}
                      </span>
                    </td>
                  )}
                  {columns.includes("dailyTao") && (
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-muted)", textAlign: "right" }}>
                      {formatCompactNumber(subnet.dailyTao)} TAO
                    </td>
                  )}
                  {columns.includes("uptime") && (
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                      {subnet.uptime}%
                    </td>
                  )}
                  {columns.includes("trend") && (
                    <td style={{ padding: "12px 14px", textAlign: "center", color: trendColor, fontSize: 13, fontWeight: 700 }}>
                      {trendIcon}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Category Distribution ──────────────────────────────────────────────────────

interface CategoryDistributionProps {
  subnets: Subnet[];
}

export const CategoryDistribution: React.FC<CategoryDistributionProps> = ({ subnets }) => {
  const safe = Array.isArray(subnets) ? subnets : [];
  const stats = safe.reduce((acc, s) => {
    acc[s.cat] = acc[s.cat] ?? { count: 0, mc: 0 };
    acc[s.cat].count++;
    acc[s.cat].mc += s.mc;
    return acc;
  }, {} as Record<string, { count: number; mc: number }>);

  const sorted = Object.entries(stats).sort((a, b) => b[1].count - a[1].count);
  const max = sorted[0]?.[1].count ?? 1;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 16px", letterSpacing: "-0.01em" }}>
        By Category
      </h3>
      {sorted.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-dim)", textAlign: "center", padding: "24px 0" }}>No data yet</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map(([cat, s]) => (
            <div key={cat}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  {getCategoryIcon(cat)} {cat}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{s.count}</span>
              </div>
              <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 99 }}>
                <div style={{ height: 4, width: `${(s.count / max) * 100}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-light))", borderRadius: 99, transition: "width 0.4s ease" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
