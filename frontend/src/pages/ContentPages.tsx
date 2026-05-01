import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import { EmptyState } from "../components/layout/Layout";
import { LoadingSpinner, Input } from "../components/ui/Button";

// ── Shared ────────────────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
    {children}
  </h2>
);

const FilterPill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: "6px 14px",
      borderRadius: 999,
      border: "1px solid var(--border)",
      background: active ? "var(--accent)" : "var(--surface-2)",
      color: active ? "#fff" : "var(--text-muted)",
      fontSize: 12,
      fontWeight: active ? 600 : 400,
      cursor: "pointer",
      transition: "all 0.15s",
    }}
  >
    {children}
  </button>
);

const PAGE: React.CSSProperties = { padding: "20px 24px 40px" };

// ── News Page ─────────────────────────────────────────────────────────────────

const NEWS_ICONS: Record<string, string> = {
  Market: "📈", Subnet: "🔗", Protocol: "⚙️", Ecosystem: "🌍",
  Institutional: "🏢", Analysis: "📊", Analytics: "📉",
  Media: "📻", Community: "👥", Research: "🔬",
};

export const NewsPage: React.FC = () => {
  const { state } = useData();
  const [category, setCategory] = useState("");
  const [search, setSearch]     = useState("");

  const safeNews = Array.isArray(state.news) ? state.news : [];
  const categories = Array.from(new Set(safeNews.map(n => n.tg))).sort();

  const filtered = safeNews.filter(n =>
    (!category || n.tg === category) &&
    (!search || n.t.toLowerCase().includes(search.toLowerCase()) || n.s.toLowerCase().includes(search.toLowerCase()))
  );

  if (state.isLoading && safeNews.length === 0) {
    return <div style={{ ...PAGE, display: "flex", justifyContent: "center", paddingTop: 80 }}><LoadingSpinner text="Loading news…" /></div>;
  }

  return (
    <div style={PAGE}>
      <SectionTitle>News Feed</SectionTitle>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <Input placeholder="Search news…" value={search} onChange={e => setSearch(e.target.value)} icon="🔍" />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <FilterPill active={!category} onClick={() => setCategory("")}>All</FilterPill>
          {categories.map(c => (
            <FilterPill key={c} active={category === c} onClick={() => setCategory(c)}>{c}</FilterPill>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📭" title="No news found" message={search || category ? "Try adjusting your filters" : "No news available"} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((n, i) => (
            <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 16px var(--accent-glow)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {NEWS_ICONS[n.tg] ?? "📰"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.t}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
                    <span style={{ background: "var(--accent-glow)", color: "var(--accent-light)", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>{n.tg}</span>
                    <span style={{ color: "var(--text-muted)" }}>{n.s}</span>
                    <span style={{ color: "var(--text-dim)" }}>{n.tm}</span>
                  </div>
                </div>
                <span style={{ color: "var(--text-dim)", fontSize: 16, flexShrink: 0 }}>↗</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Research Page ─────────────────────────────────────────────────────────────

export const ResearchPage: React.FC = () => {
  const { state } = useData();
  const [category, setCategory] = useState("");

  const safeResearch = Array.isArray(state.research) ? state.research : [];
  const categories = Array.from(new Set(safeResearch.map(r => r.c))).sort();
  const filtered   = safeResearch.filter(r => !category || r.c === category);

  return (
    <div style={PAGE}>
      <SectionTitle>Research</SectionTitle>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <FilterPill active={!category} onClick={() => setCategory("")}>All</FilterPill>
        {categories.map(c => (
          <FilterPill key={c} active={category === c} onClick={() => setCategory(c)}>{c}</FilterPill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📭" title="No articles found" message="Check back soon for more research" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {filtered.map((article, i) => (
            <div
              key={i}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 10, transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px var(--accent-glow)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              <div style={{ fontSize: 32 }}>{article.i}</div>
              <span style={{ background: "var(--accent-glow)", color: "var(--accent-light)", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, alignSelf: "flex-start" }}>
                {article.c}
              </span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, lineHeight: 1.4 }}>{article.t}</h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }} className="truncate-2">{article.ex}</p>
              <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0 }}>{article.d}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Lessons Page ──────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  beginner:     { bg: "rgba(16,185,129,0.12)",  color: "var(--success)" },
  intermediate: { bg: "rgba(245,158,11,0.12)",  color: "var(--warning)" },
  advanced:     { bg: "rgba(239,68,68,0.12)",   color: "var(--danger)"  },
};

export const LessonsPage: React.FC = () => {
  const { state } = useData();
  const [level, setLevel] = useState("");

  const safeLessons = Array.isArray(state.lessons) ? state.lessons : [];
  const filtered = safeLessons.filter(l => !level || l.level === level);

  return (
    <div style={PAGE}>
      <SectionTitle>Education</SectionTitle>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <FilterPill active={!level} onClick={() => setLevel("")}>All Levels</FilterPill>
        {["beginner", "intermediate", "advanced"].map(l => (
          <FilterPill key={l} active={level === l} onClick={() => setLevel(l)}>
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </FilterPill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📚" title="No lessons found" message="Check back soon for more educational content" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {filtered.map(lesson => {
            const lc = LEVEL_COLORS[lesson.level] ?? LEVEL_COLORS.beginner;
            return (
              <div
                key={lesson.id}
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 10, transition: "all 0.15s", cursor: "pointer" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px var(--accent-glow)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                <span style={{ ...lc, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, alignSelf: "flex-start", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {lesson.level}
                </span>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, lineHeight: 1.4 }}>{lesson.title}</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{lesson.category}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>⏱ {lesson.duration} min</span>
                  <span style={{ fontSize: 11, color: "var(--accent-light)", fontWeight: 600 }}>Read →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
