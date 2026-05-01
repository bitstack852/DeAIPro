import React, { useCallback, useEffect, useState } from "react";
import { useData } from "../contexts/DataContext";
import { AdminStatusData, PendingRequest } from "../types";
import { getAdminStatus, approveAccess } from "../services/api";

const STAFF_DOMAIN = "@deaistrategies.io";

// ── Admin Stat Card ───────────────────────────────────────────────────────────

const AdminStatCard: React.FC<{
  label: string;
  value: number;
  accent: string;
  icon: string;
}> = ({ label, value, accent, icon }) => (
  <div
    style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderLeft: `3px solid ${accent}`,
      borderRadius: 12,
      padding: 20,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${accent}1a`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{icon}</div>
    </div>
    <p style={{ fontSize: 32, fontWeight: 700, color: "var(--text)", margin: 0, lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</p>
  </div>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────

const StatSkeleton = () => (
  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
    <div className="skeleton" style={{ width: 60, height: 11, borderRadius: 4, marginBottom: 14 }} />
    <div className="skeleton" style={{ width: 40, height: 32, borderRadius: 6 }} />
  </div>
);

// ── Admin Page ────────────────────────────────────────────────────────────────

const AdminPage: React.FC = () => {
  const { state } = useData();
  const { user, token } = state;

  const [adminData, setAdminData]   = useState<AdminStatusData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [approving, setApproving]   = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isStaff = !!user?.email?.toLowerCase().endsWith(STAFF_DOMAIN);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminStatus(token);
      setAdminData(res.data);
    } catch (e: any) {
      setError(e.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isStaff && token) fetchStatus();
  }, [isStaff, token, fetchStatus]);

  const handleApprove = async (email: string) => {
    if (!token) return;
    setApproving(email);
    setSuccessMsg(null);
    try {
      await approveAccess(email, token);
      setSuccessMsg(`Access approved for ${email}`);
      fetchStatus();
    } catch (e: any) {
      setError(e.message || "Approval failed");
    } finally {
      setApproving(null);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <GuardMessage
        icon="🔐"
        title="Sign in required"
        message="Please sign in to access the admin panel."
        color="var(--warning)"
      />
    );
  }

  if (!isStaff) {
    return (
      <GuardMessage
        icon="🚫"
        title="Access denied"
        message={`This panel requires a ${STAFF_DOMAIN} account.`}
        color="var(--danger)"
      />
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "20px 24px 40px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Section title */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        Access Management
      </h2>

      {/* Banners */}
      {error && (
        <Banner color="var(--danger)" bg="var(--danger-bg)" onClose={() => setError(null)}>
          {error}
        </Banner>
      )}
      {successMsg && (
        <Banner color="var(--success)" bg="var(--success-bg)" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Banner>
      )}

      {/* Stat cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[...Array(4)].map((_, i) => <StatSkeleton key={i} />)}
        </div>
      ) : adminData ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <AdminStatCard label="Pending"  value={adminData.counts.pending}  accent="var(--warning)" icon="⏳" />
          <AdminStatCard label="Approved" value={adminData.counts.approved} accent="var(--success)" icon="✓" />
          <AdminStatCard label="Revoked"  value={adminData.counts.revoked}  accent="var(--danger)"  icon="✕" />
          <AdminStatCard label="Expired"  value={adminData.counts.expired}  accent="var(--text-dim)" icon="⌛" />
        </div>
      ) : null}

      {/* Pending requests table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>Pending Requests</h3>
          <button
            onClick={fetchStatus}
            disabled={loading}
            style={{ fontSize: 12, color: "var(--accent-light)", background: "none", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, fontWeight: 600 }}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
            <LoadingIndicator />
          </div>
        ) : !adminData || adminData.pending_requests.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>✓</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 4px" }}>No pending requests</p>
            <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0 }}>All access requests have been processed.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Email", "Requested", "Expires", "Requests", ""].map((h, i) => (
                    <th key={i} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--surface-2)", textAlign: i === 4 ? "right" : "left", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adminData.pending_requests.map((req: PendingRequest) => (
                  <tr
                    key={req.email}
                    style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{req.email}</td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--text-muted)" }}>{new Date(req.created_at).toLocaleString()}</td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--text-muted)" }}>{new Date(req.expires_at).toLocaleString()}</td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--text-muted)" }}>{req.request_count}</td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => handleApprove(req.email)}
                        disabled={approving === req.email}
                        style={{
                          padding: "6px 16px",
                          borderRadius: 8,
                          border: "none",
                          background: approving === req.email ? "var(--surface-3)" : "linear-gradient(135deg, var(--accent), var(--accent-light))",
                          color: approving === req.email ? "var(--text-dim)" : "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: approving === req.email ? "not-allowed" : "pointer",
                          boxShadow: approving === req.email ? "none" : "0 2px 12px var(--accent-glow)",
                          transition: "all 0.15s",
                        }}
                      >
                        {approving === req.email ? "Approving…" : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const GuardMessage: React.FC<{ icon: string; title: string; message: string; color: string }> = ({ icon, title, message, color }) => (
  <div style={{ padding: "80px 24px", display: "flex", justifyContent: "center" }}>
    <div style={{ background: "var(--surface)", border: `1px solid ${color}44`, borderRadius: 14, padding: "40px 48px", textAlign: "center", maxWidth: 400 }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>{title}</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{message}</p>
    </div>
  </div>
);

const Banner: React.FC<{ children: React.ReactNode; color: string; bg: string; onClose: () => void }> = ({ children, color, bg, onClose }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: 10, background: bg, border: `1px solid ${color}33`, color }}>
    <span style={{ fontSize: 13, fontWeight: 500 }}>{children}</span>
    <button onClick={onClose} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.7, fontSize: 15 }}>✕</button>
  </div>
);

const LoadingIndicator = () => (
  <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="3" />
    <path d="M4 12a8 8 0 018-8" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export default AdminPage;
