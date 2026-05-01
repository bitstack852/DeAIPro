import React, { useCallback, useEffect, useRef, useState } from "react";
import { useData } from "../contexts/DataContext";
import { LoadingSpinner } from "../components/ui/Button";
import {
  ConfigEntry,
  ConfigGroups,
  getAdminConfig,
  testAdminConfig,
  updateAdminConfig,
} from "../services/api";
import { auth } from "../firebase";

const getFreshToken = async (): Promise<string | null> =>
  auth?.currentUser ? auth.currentUser.getIdToken(true) : null;

const STAFF_DOMAIN = "@deaistrategies.io";

// ── Category metadata ─────────────────────────────────────────────────────────

const CATEGORIES: Array<{ key: string; label: string; icon: string }> = [
  { key: "data_sources",   label: "Data Sources",   icon: "🔌" },
  { key: "sync_intervals", label: "Sync Intervals",  icon: "⏱" },
  { key: "notifications",  label: "Notifications",   icon: "📬" },
  { key: "app_behaviour",  label: "App Behaviour",   icon: "⚙️" },
  { key: "feature_flags",  label: "Feature Flags",   icon: "🚩" },
];

// Which keys have a Test button
const TESTABLE: Record<string, "taostats" | "coingecko" | "github" | "sendgrid"> = {
  TAOSTATS_API_KEY:  "taostats",
  COINGECKO_API_KEY: "coingecko",
  GITHUB_API_TOKEN:  "github",
  SENDGRID_API_KEY:  "sendgrid",
};

// ── Integration card metadata ─────────────────────────────────────────────────

interface IntegrationMeta {
  label: string;
  description: string;
  logoBg: string;
  logoText: string;
  logoColor: string;
}

const INTEGRATION_META: Record<string, IntegrationMeta> = {
  TAOSTATS_API_KEY: {
    label: "TaoStats",
    description: "Bittensor Network Data — Subnet & validator analytics",
    logoBg: "#1a1f3a",
    logoText: "τ",
    logoColor: "#6ee7f7",
  },
  COINGECKO_API_KEY: {
    label: "CoinGecko",
    description: "Price Data Service — TAO market price & history",
    logoBg: "#1a2e1a",
    logoText: "🦎",
    logoColor: "#8cc63f",
  },
  GITHUB_API_TOKEN: {
    label: "GitHub",
    description: "Repository Service — Commit activity & code metrics",
    logoBg: "#1a1a1a",
    logoText: "⌥",
    logoColor: "#e6edf3",
  },
  SENDGRID_API_KEY: {
    label: "SendGrid",
    description: "Email Delivery — Transactional & notification emails",
    logoBg: "#0d1f2e",
    logoText: "✉",
    logoColor: "#1a82e2",
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

const PAGE: React.CSSProperties = { padding: "20px 24px 40px", display: "flex", flexDirection: "column", gap: 24 };
const SECTION_TITLE = "Staff-only. Changes take effect on the next background service cycle.";

// ── Integration card (data_sources view)
interface IntegrationCardProps {
  entry: ConfigEntry;
  onSaved: (key: string, value: string) => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ entry, onSaved }) => {
  const [open, setOpen] = useState(false);
  const meta = INTEGRATION_META[entry.key];

  return (
    <div style={{
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover, var(--accent))"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
    >
      {/* Card header */}
      <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Top row: logo + actions */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          {/* Logo box */}
          <div style={{
            width: 52, height: 52, borderRadius: 10,
            background: meta?.logoBg ?? "var(--surface-3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: meta?.logoText.length === 1 && !/\p{Emoji}/u.test(meta.logoText) ? 24 : 20,
            color: meta?.logoColor ?? "var(--text)",
            fontWeight: 700, letterSpacing: -1,
            flexShrink: 0,
          }}>
            {meta?.logoText ?? "?"}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setOpen(o => !o)}
              title="Settings"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: open ? "var(--accent-glow)" : "var(--surface-3)",
                border: `1px solid ${open ? "var(--accent)" : "var(--border)"}`,
                color: open ? "var(--accent-light)" : "var(--text-muted)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, transition: "all 0.15s",
              }}
            >
              ⚙
            </button>
            <button
              onClick={() => setOpen(o => !o)}
              style={{
                padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: open ? "var(--accent)" : "var(--surface-3)",
                border: `1px solid ${open ? "var(--accent)" : "var(--border)"}`,
                color: open ? "#fff" : "var(--text-muted)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {open ? "Close" : "Details"}
            </button>
          </div>
        </div>

        {/* Name + description */}
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            {meta?.label ?? entry.label}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)" }}>
            {meta?.description ?? ""}
          </p>
        </div>
      </div>

      {/* Expandable detail panel */}
      {open && (
        <div style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "16px 20px 20px",
          background: "var(--surface)",
        }}>
          <ConfigRow entry={entry} onSaved={onSaved} borderless />
        </div>
      )}
    </div>
  );
};

// ── Test result badge
interface TestResult { ok: boolean; latency_ms: number | null; detail: string }

const TestBadge: React.FC<{ result: TestResult }> = ({ result }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
    background: result.ok ? "var(--success-bg)" : "var(--danger-bg)",
    color: result.ok ? "var(--success)" : "var(--danger)",
    whiteSpace: "nowrap",
  }}>
    {result.ok ? "✓" : "✕"}{" "}
    {result.ok
      ? `Connected${result.latency_ms != null ? ` (${result.latency_ms} ms)` : ""}`
      : result.detail}
  </span>
);

// ── Toggle switch for feature flags
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  checked, onChange, disabled,
}) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    style={{
      width: 44, height: 24, borderRadius: 12,
      background: checked ? "var(--accent)" : "var(--surface-3)",
      border: "none", cursor: disabled ? "not-allowed" : "pointer",
      position: "relative", transition: "background 0.2s", flexShrink: 0,
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <span style={{
      position: "absolute", top: 3,
      left: checked ? 23 : 3,
      width: 18, height: 18, borderRadius: "50%",
      background: "#fff",
      transition: "left 0.2s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    }} />
  </button>
);

// ── Config row (non-flag)
interface ConfigRowProps {
  entry: ConfigEntry;
  onSaved: (key: string, value: string) => void;
  borderless?: boolean;
}

const ConfigRow: React.FC<ConfigRowProps> = ({ entry, onSaved, borderless }) => {
  const [value, setValue]         = useState(entry.value);
  const [revealed, setRevealed]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const testTimeout                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDirty = value !== entry.value;
  const testService = TESTABLE[entry.key];

  const handleSave = async () => {
    const token = await getFreshToken();
    if (!token) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateAdminConfig(entry.key, value, token);
      setSaveMsg({ ok: true, text: "Saved" });
      onSaved(entry.key, value);
    } catch (e: any) {
      setSaveMsg({ ok: false, text: e.message || "Save failed" });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleTest = async () => {
    if (!testService) return;
    const token = await getFreshToken();
    if (!token) return;
    setTesting(true);
    setTestResult(null);
    if (testTimeout.current) clearTimeout(testTimeout.current);
    try {
      const result = await testAdminConfig(testService, token);
      setTestResult(result);
      testTimeout.current = setTimeout(() => setTestResult(null), 30_000);
    } catch {
      setTestResult({ ok: false, latency_ms: null, detail: "Request failed" });
    } finally {
      setTesting(false);
    }
  };

  // Clear test result when field changes
  const handleChange = (v: string) => {
    setValue(v);
    setTestResult(null);
    if (testTimeout.current) clearTimeout(testTimeout.current);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: borderless ? "0" : "16px 0", borderBottom: borderless ? "none" : "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{entry.label}</label>
        {entry.updated_by && (
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
            Updated by {entry.updated_by}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* Input */}
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type={entry.is_secret && !revealed ? "password" : "text"}
            value={value}
            onChange={e => handleChange(e.target.value)}
            placeholder={entry.is_secret ? "Enter key…" : ""}
            style={{
              width: "100%", padding: "9px 12px",
              paddingRight: entry.is_secret ? 40 : 12,
              borderRadius: 8,
              border: `1px solid ${isDirty ? "var(--accent)" : "var(--border)"}`,
              background: "var(--surface-2)",
              color: "var(--text)", fontSize: 13,
              outline: "none", transition: "border-color 0.15s",
              boxSizing: "border-box",
            }}
          />
          {entry.is_secret && (
            <button
              onClick={() => setRevealed(r => !r)}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-dim)", fontSize: 14, padding: 0,
              }}
              title={revealed ? "Hide" : "Show"}
            >
              {revealed ? "🙈" : "👁"}
            </button>
          )}
        </div>

        {/* Test button */}
        {testService && (
          <button
            onClick={handleTest}
            disabled={testing}
            style={{
              padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: "1px solid var(--border)", background: "var(--surface-2)",
              color: testing ? "var(--text-dim)" : "var(--text-muted)",
              cursor: testing ? "not-allowed" : "pointer",
              whiteSpace: "nowrap", transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {testing ? "Testing…" : "Test"}
          </button>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          style={{
            padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: "none",
            background: isDirty && !saving
              ? "linear-gradient(135deg, var(--accent), var(--accent-light))"
              : "var(--surface-3)",
            color: isDirty && !saving ? "#fff" : "var(--text-dim)",
            cursor: isDirty && !saving ? "pointer" : "not-allowed",
            whiteSpace: "nowrap", transition: "all 0.15s",
            boxShadow: isDirty && !saving ? "0 2px 12px var(--accent-glow)" : "none",
            flexShrink: 0,
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Feedback row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 20 }}>
        {saveMsg && (
          <span style={{ fontSize: 11, fontWeight: 600, color: saveMsg.ok ? "var(--success)" : "var(--danger)" }}>
            {saveMsg.ok ? "✓" : "✕"} {saveMsg.text}
          </span>
        )}
        {testResult && <TestBadge result={testResult} />}
      </div>
    </div>
  );
};

// ── Feature flag row
interface FlagRowProps {
  entry: ConfigEntry;
  onSaved: (key: string, value: string) => void;
}

const FlagRow: React.FC<FlagRowProps> = ({ entry, onSaved }) => {
  const [enabled, setEnabled] = useState(entry.value === "true");
  const [saving, setSaving]   = useState(false);

  const handleToggle = async (next: boolean) => {
    const token = await getFreshToken();
    if (!token) return;
    setEnabled(next);
    setSaving(true);
    try {
      await updateAdminConfig(entry.key, next ? "true" : "false", token);
      onSaved(entry.key, next ? "true" : "false");
    } catch {
      setEnabled(!next); // revert on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 0", borderBottom: "1px solid var(--border-subtle)",
    }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "0 0 2px" }}>{entry.label}</p>
        <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0 }}>
          {enabled ? "Running on schedule" : "Paused — will not run"}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {saving && <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Saving…</span>}
        <Toggle checked={enabled} onChange={handleToggle} disabled={saving} />
      </div>
    </div>
  );
};

// ── Main Settings Page ────────────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const { state } = useData();
  const { user } = state;

  const [activeCategory, setActiveCategory] = useState("data_sources");
  const [config, setConfig]   = useState<ConfigGroups>({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const isStaff = !!user?.email?.toLowerCase().endsWith(STAFF_DOMAIN);

  const fetchConfig = useCallback(async () => {
    const freshToken = await getFreshToken();
    if (!freshToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminConfig(freshToken);
      setConfig(data);
    } catch (e: any) {
      setError(e.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff && user) fetchConfig();
  }, [isStaff, user, fetchConfig]);

  // Update local state after a save so dirty detection resets
  const handleSaved = (key: string, value: string) => {
    setConfig(prev => {
      const next = { ...prev };
      for (const cat of Object.keys(next)) {
        next[cat] = next[cat].map(e => e.key === key ? { ...e, value } : e);
      }
      return next;
    });
  };

  // ── Guards ───────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div style={{ ...PAGE, alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <GuardCard icon="🔐" title="Sign in required" message="Please sign in to access settings." color="var(--warning)" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div style={{ ...PAGE, alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <GuardCard icon="🚫" title="Staff only" message={`Settings require a ${STAFF_DOMAIN} account.`} color="var(--danger)" />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ ...PAGE, alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <LoadingSpinner text="Loading settings…" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={PAGE}>
        <div style={{ background: "var(--danger-bg)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "var(--danger)", fontSize: 13 }}>
          {error}
          <button onClick={fetchConfig} style={{ marginLeft: 12, background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Retry</button>
        </div>
      </div>
    );
  }

  const activeCat = CATEGORIES.find(c => c.key === activeCategory);
  const entries   = config[activeCategory] ?? [];

  return (
    <div style={PAGE}>
      <div>
        <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0, fontStyle: "italic" }}>{SECTION_TITLE}</p>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* Left nav */}
        <nav style={{
          width: 200, flexShrink: 0,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, overflow: "hidden",
        }}>
          {CATEGORIES.map(cat => {
            const isActive = cat.key === activeCategory;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 14px",
                  background: isActive ? "var(--accent-glow)" : "transparent",
                  border: "none",
                  borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                  color: isActive ? "var(--accent-light)" : "var(--text-muted)",
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                <span style={{ fontSize: 15 }}>{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </nav>

        {/* Main panel */}
        <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            {activeCat?.icon} {activeCat?.label}
          </h2>

          {entries.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 24 }}>No settings in this category.</p>
          ) : activeCategory === "feature_flags" ? (
            entries.map(entry => (
              <FlagRow key={entry.key} entry={entry} onSaved={handleSaved} />
            ))
          ) : activeCategory === "data_sources" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginTop: 8 }}>
              {entries.map(entry => (
                <IntegrationCard key={entry.key} entry={entry} onSaved={handleSaved} />
              ))}
            </div>
          ) : (
            entries.map(entry => (
              <ConfigRow key={entry.key} entry={entry} onSaved={handleSaved} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const GuardCard: React.FC<{ icon: string; title: string; message: string; color: string }> = ({ icon, title, message, color }) => (
  <div style={{ background: "var(--surface)", border: `1px solid ${color}44`, borderRadius: 14, padding: "40px 48px", textAlign: "center", maxWidth: 380 }}>
    <div style={{ fontSize: 36, marginBottom: 14 }}>{icon}</div>
    <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>{title}</h2>
    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{message}</p>
  </div>
);
