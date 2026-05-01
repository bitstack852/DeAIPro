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

// ── Shared types ──────────────────────────────────────────────────────────────

interface TestResult { ok: boolean; latency_ms: number | null; detail: string }

// ── TestBadge ─────────────────────────────────────────────────────────────────

const TestBadge: React.FC<{ result: TestResult }> = ({ result }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
    background: result.ok ? "var(--success-bg)" : "var(--danger-bg)",
    color: result.ok ? "var(--success)" : "var(--danger)",
    whiteSpace: "nowrap",
  }}>
    {result.ok ? "✓" : "✕"}{" "}
    {result.ok
      ? `Connected${result.latency_ms != null ? ` · ${result.latency_ms} ms` : ""}`
      : result.detail}
  </span>
);

// ── Integration Settings Modal ────────────────────────────────────────────────

interface ModalProps {
  entry: ConfigEntry;
  meta: IntegrationMeta | undefined;
  onClose: () => void;
  onSaved: (key: string, value: string) => void;
}

const IntegrationModal: React.FC<ModalProps> = ({ entry, meta, onClose, onSaved }) => {
  const [value, setValue]       = useState(entry.value);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const testTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDirty = value !== entry.value;
  const testService = TESTABLE[entry.key];

  const handleSave = async () => {
    const token = await getFreshToken();
    if (!token) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateAdminConfig(entry.key, value, token);
      setSaveMsg({ ok: true, text: "Saved successfully" });
      onSaved(entry.key, value);
    } catch (e: any) {
      setSaveMsg({ ok: false, text: e.message || "Save failed" });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
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

  const handleChange = (v: string) => {
    setValue(v);
    setTestResult(null);
    if (testTimeout.current) clearTimeout(testTimeout.current);
  };

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          width: "100%", maxWidth: 480,
          margin: "0 16px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: "20px 24px 18px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10, flexShrink: 0,
            background: meta?.logoBg ?? "var(--surface-3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, color: meta?.logoColor ?? "var(--text)", fontWeight: 700,
          }}>
            {meta?.logoText ?? "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              {meta?.label ?? entry.label}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)" }}>
              {meta?.description ?? ""}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "var(--surface-3)", border: "1px solid var(--border)",
              color: "var(--text-muted)", cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal body */}
        <div style={{ padding: "24px" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            API Key
          </label>

          {/* Input row */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <input
              type={entry.is_secret && !revealed ? "password" : "text"}
              value={value}
              onChange={e => handleChange(e.target.value)}
              placeholder={entry.is_secret ? "Enter key…" : ""}
              autoFocus
              style={{
                width: "100%", padding: "10px 14px",
                paddingRight: entry.is_secret ? 42 : 14,
                borderRadius: 9,
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
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-dim)", fontSize: 15, padding: 0,
                }}
                title={revealed ? "Hide" : "Show"}
              >
                {revealed ? "🙈" : "👁"}
              </button>
            )}
          </div>

          {entry.updated_by && (
            <p style={{ margin: "0 0 16px", fontSize: 11, color: "var(--text-dim)" }}>
              Last updated by {entry.updated_by}
            </p>
          )}

          {/* Test result */}
          {testResult && (
            <div style={{ marginBottom: 16 }}>
              <TestBadge result={testResult} />
            </div>
          )}

          {/* Save message */}
          {saveMsg && (
            <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, color: saveMsg.ok ? "var(--success)" : "var(--danger)" }}>
              {saveMsg.ok ? "✓" : "✕"} {saveMsg.text}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            {testService && (
              <button
                onClick={handleTest}
                disabled={testing}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 9, fontSize: 13, fontWeight: 600,
                  border: "1px solid var(--border)", background: "var(--surface-2)",
                  color: testing ? "var(--text-dim)" : "var(--text-muted)",
                  cursor: testing ? "not-allowed" : "pointer", transition: "all 0.15s",
                }}
              >
                {testing ? "Testing…" : "Test Connection"}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 9, fontSize: 13, fontWeight: 600,
                border: "none",
                background: isDirty && !saving
                  ? "linear-gradient(135deg, var(--accent), var(--accent-light))"
                  : "var(--surface-3)",
                color: isDirty && !saving ? "#fff" : "var(--text-dim)",
                cursor: isDirty && !saving ? "pointer" : "not-allowed",
                transition: "all 0.15s",
                boxShadow: isDirty && !saving ? "0 2px 12px var(--accent-glow)" : "none",
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Integration Card ──────────────────────────────────────────────────────────

interface IntegrationCardProps {
  entry: ConfigEntry;
  onSaved: (key: string, value: string) => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ entry, onSaved }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const meta = INTEGRATION_META[entry.key];

  return (
    <>
      <div style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "20px",
        display: "flex", flexDirection: "column", gap: 14,
        transition: "border-color 0.15s",
      }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
      >
        {/* Top row: logo + gear */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 10,
            background: meta?.logoBg ?? "var(--surface-3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, color: meta?.logoColor ?? "var(--text)", fontWeight: 700,
            flexShrink: 0,
          }}>
            {meta?.logoText ?? "?"}
          </div>

          <button
            onClick={() => setModalOpen(true)}
            title="Settings"
            style={{
              width: 34, height: 34, borderRadius: 8,
              background: "var(--surface-3)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "var(--accent-glow)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLElement).style.color = "var(--accent-light)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "var(--surface-3)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
            }}
          >
            ⚙
          </button>
        </div>

        {/* Name + description */}
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            {meta?.label ?? entry.label}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
            {meta?.description ?? ""}
          </p>
        </div>
      </div>

      {modalOpen && (
        <IntegrationModal
          entry={entry}
          meta={meta}
          onClose={() => setModalOpen(false)}
          onSaved={(key, val) => { onSaved(key, val); setModalOpen(false); }}
        />
      )}
    </>
  );
};

// ── Toggle switch ─────────────────────────────────────────────────────────────

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
      background: "#fff", transition: "left 0.2s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    }} />
  </button>
);

// ── Config row ────────────────────────────────────────────────────────────────

interface ConfigRowProps {
  entry: ConfigEntry;
  onSaved: (key: string, value: string) => void;
}

const ConfigRow: React.FC<ConfigRowProps> = ({ entry, onSaved }) => {
  const [value, setValue]       = useState(entry.value);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const testTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleChange = (v: string) => {
    setValue(v);
    setTestResult(null);
    if (testTimeout.current) clearTimeout(testTimeout.current);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{entry.label}</label>
        {entry.updated_by && (
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>Updated by {entry.updated_by}</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
        {testService && (
          <button
            onClick={handleTest}
            disabled={testing}
            style={{
              padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: "1px solid var(--border)", background: "var(--surface-2)",
              color: testing ? "var(--text-dim)" : "var(--text-muted)",
              cursor: testing ? "not-allowed" : "pointer",
              whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
            }}
          >
            {testing ? "Testing…" : "Test"}
          </button>
        )}
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

// ── Feature flag row ──────────────────────────────────────────────────────────

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
      setEnabled(!next);
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

// ── Guard card ────────────────────────────────────────────────────────────────

const GuardCard: React.FC<{ icon: string; title: string; message: string; color: string }> = ({ icon, title, message, color }) => (
  <div style={{ background: "var(--surface)", border: `1px solid ${color}44`, borderRadius: 14, padding: "40px 48px", textAlign: "center", maxWidth: 380 }}>
    <div style={{ fontSize: 36, marginBottom: 14 }}>{icon}</div>
    <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>{title}</h2>
    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{message}</p>
  </div>
);

// ── Main Settings Page ────────────────────────────────────────────────────────

const PAGE: React.CSSProperties = { padding: "20px 24px 40px", display: "flex", flexDirection: "column", gap: 20 };

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

  const handleSaved = (key: string, value: string) => {
    setConfig(prev => {
      const next = { ...prev };
      for (const cat of Object.keys(next)) {
        next[cat] = next[cat].map(e => e.key === key ? { ...e, value } : e);
      }
      return next;
    });
  };

  if (!user) return (
    <div style={{ ...PAGE, alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <GuardCard icon="🔐" title="Sign in required" message="Please sign in to access settings." color="var(--warning)" />
    </div>
  );

  if (!isStaff) return (
    <div style={{ ...PAGE, alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <GuardCard icon="🚫" title="Staff only" message={`Settings require a ${STAFF_DOMAIN} account.`} color="var(--danger)" />
    </div>
  );

  if (loading) return (
    <div style={{ ...PAGE, alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <LoadingSpinner text="Loading settings…" />
    </div>
  );

  if (error) return (
    <div style={PAGE}>
      <div style={{ background: "var(--danger-bg)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "var(--danger)", fontSize: 13 }}>
        {error}
        <button onClick={fetchConfig} style={{ marginLeft: 12, background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Retry</button>
      </div>
    </div>
  );

  const entries = config[activeCategory] ?? [];

  return (
    <div style={PAGE}>
      <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0, fontStyle: "italic" }}>
        Staff-only. Changes take effect on the next background service cycle.
      </p>

      {/* Horizontal tab bar */}
      <div style={{
        display: "flex", gap: 4,
        borderBottom: "1px solid var(--border)",
        paddingBottom: 0,
      }}>
        {CATEGORIES.map(cat => {
          const isActive = cat.key === activeCategory;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: "9px 16px",
                background: "none", border: "none",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                color: isActive ? "var(--accent-light)" : "var(--text-muted)",
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "all 0.15s",
                marginBottom: -1,
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
            >
              <span style={{ marginRight: 6 }}>{cat.icon}</span>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px" }}>
        {entries.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-dim)" }}>No settings in this category.</p>
        ) : activeCategory === "feature_flags" ? (
          entries.map(entry => <FlagRow key={entry.key} entry={entry} onSaved={handleSaved} />)
        ) : activeCategory === "data_sources" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {entries.map(entry => (
              <IntegrationCard key={entry.key} entry={entry} onSaved={handleSaved} />
            ))}
          </div>
        ) : (
          entries.map(entry => <ConfigRow key={entry.key} entry={entry} onSaved={handleSaved} />)
        )}
      </div>
    </div>
  );
};
