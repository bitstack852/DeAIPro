import React, { useCallback, useEffect, useState } from "react";
import { Header, Container } from "../components/layout/Layout";
import { useData } from "../contexts/DataContext";
import { AdminStatusData, PendingRequest } from "../types";
import { getAdminStatus, approveAccess } from "../services/api";

const STAFF_DOMAIN = "@deaistrategies.io";

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="bg-white rounded-lg border p-5">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
  </div>
);

const AdminPage: React.FC = () => {
  const { state } = useData();
  const { user, token } = state;

  const [adminData, setAdminData] = useState<AdminStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null); // email being approved
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
      setSuccessMsg(`Approved ${email}`);
      await fetchStatus();
    } catch (e: any) {
      setError(e.message || "Approval failed");
    } finally {
      setApproving(null);
    }
  };

  if (!user) {
    return (
      <>
        <Header title="Admin" subtitle="Access management" />
        <Container>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">Sign in to access the admin panel.</p>
          </div>
        </Container>
      </>
    );
  }

  if (!isStaff) {
    return (
      <>
        <Header title="Admin" subtitle="Access management" />
        <Container>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Access denied.</p>
            <p className="text-red-600 text-sm mt-1">
              This page requires a <strong>{STAFF_DOMAIN}</strong> account.
            </p>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <Header title="Admin" subtitle="Access management" />
      <Container>
        <div className="space-y-6">

          {/* Error / success banners */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <p className="text-red-700 text-sm">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
              <p className="text-green-700 text-sm">{successMsg}</p>
              <button onClick={() => setSuccessMsg(null)} className="text-green-400 hover:text-green-600 ml-4">✕</button>
            </div>
          )}

          {/* Stats */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border p-5 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-16 mb-3" />
                  <div className="h-8 bg-gray-200 rounded w-10" />
                </div>
              ))}
            </div>
          ) : adminData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Pending" value={adminData.counts.pending} color="text-yellow-600" />
              <StatCard label="Approved" value={adminData.counts.approved} color="text-green-600" />
              <StatCard label="Revoked" value={adminData.counts.revoked} color="text-red-600" />
              <StatCard label="Expired" value={adminData.counts.expired} color="text-gray-500" />
            </div>
          ) : null}

          {/* Pending requests table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Pending Access Requests</h2>
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : !adminData || adminData.pending_requests.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No pending requests</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-gray-600 font-medium">Email</th>
                      <th className="text-left px-6 py-3 text-gray-600 font-medium">Requested</th>
                      <th className="text-left px-6 py-3 text-gray-600 font-medium">Expires</th>
                      <th className="text-left px-6 py-3 text-gray-600 font-medium">Requests</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {adminData.pending_requests.map((req: PendingRequest) => (
                      <tr key={req.email} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">{req.email}</td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(req.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(req.expires_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{req.request_count}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleApprove(req.email)}
                            disabled={approving === req.email}
                            className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </Container>
    </>
  );
};

export default AdminPage;
