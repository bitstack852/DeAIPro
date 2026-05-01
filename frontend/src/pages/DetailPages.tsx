import React from "react";
import { useData } from "../contexts/DataContext";
import { Subnet } from "../types";
import {
  Header,
  Container,
  Grid,
  EmptyState,
  Modal,
} from "../components/layout/Layout";
import { Card, Badge, Button, LoadingSpinner, Alert } from "../components/ui/Button";
import { StatCard, SubnetTable } from "../components/ui/SubnetCard";
import {
  formatCurrency,
  formatCompactNumber,
  getCategoryIcon,
  getCategoryColor,
  getTrendIndicator,
  getScoreColor,
} from "../utils/formatters";
import { useSubnetById } from "../utils/hooks";

export const SubnetDetailPage: React.FC<{ subnetId: number }> = ({
  subnetId,
}) => {
  const { state, selectSubnet } = useData();
  const subnet = useSubnetById(state.subnets, subnetId);
  const [showPortfolioModal, setShowPortfolioModal] = React.useState(false);
  const [portfolioAmount, setPortfolioAmount] = React.useState(1);

  if (!subnet) {
    return (
      <>
        <Header title="Subnet Details" />
        <Container>
          <EmptyState
            icon="🔍"
            title="Subnet not found"
            message="The subnet you're looking for doesn't exist"
          />
        </Container>
      </>
    );
  }

  const trend = getTrendIndicator(subnet.trend);
  const relatedSubnets = state.subnets
    .filter((s) => s.cat === subnet.cat && s.id !== subnet.id)
    .slice(0, 5);

  const handleAddToPortfolio = () => {
    // This would connect to portfolio context action
    setShowPortfolioModal(false);
  };

  return (
    <>
      <Header
        title={subnet.n}
        subtitle={`Subnet #${subnet.id} • ${subnet.cat}`}
      />

      <Container>
        {/* Hero Section */}
        <Card className="p-8 mb-8 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="text-5xl">{getCategoryIcon(subnet.cat)}</div>
              <div>
                <h1 className="text-3xl font-bold mb-2">{subnet.n}</h1>
                <div className="flex items-center gap-3">
                  <Badge variant="info" size="md">
                    {subnet.cat}
                  </Badge>
                  <Badge
                    variant={
                      subnet.trend === "up"
                        ? "success"
                        : subnet.trend === "down"
                        ? "danger"
                        : "warning"
                    }
                    size="md"
                  >
                    {trend.icon} {subnet.trend}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowPortfolioModal(true)}
            >
              Add to Portfolio
            </Button>
          </div>

          {/* Key Metrics */}
          <Grid columns={4} gap="md">
            <div>
              <p className="text-sm text-gray-600">Market Cap</p>
              <p className="text-2xl font-bold">
                {formatCurrency(subnet.mc * 1_000_000)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(subnet.score)}`}>
                {subnet.score}/100
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Daily Emissions</p>
              <p className="text-2xl font-bold">
                {formatCompactNumber(subnet.dailyTao)} TAO
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Uptime</p>
              <p className="text-2xl font-bold">{subnet.uptime}%</p>
            </div>
          </Grid>
        </Card>

        {/* Main Details */}
        <Grid columns={2} gap="lg" className="mb-8">
          <div>
            <h2 className="text-xl font-bold mb-4">Performance Metrics</h2>
            <Grid columns={2} gap="md">
              <StatCard
                title="P/E Ratio"
                value={subnet.pe.toFixed(2)}
                color="blue"
              />
              <StatCard
                title="Validators"
                value={subnet.validators}
                color="green"
              />
              <StatCard
                title="Miners"
                value={subnet.miners}
                color="orange"
              />
              <StatCard
                title="Emissions"
                value={formatCompactNumber(subnet.em)}
                color="purple"
              />
              <StatCard
                title="Emissions (Hourly)"
                value={formatCompactNumber(subnet.emission)}
                color="blue"
              />
              <StatCard
                title="Registration"
                value={subnet.reg.toFixed(2)}
                color="green"
              />
            </Grid>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Quality Metrics</h2>
            <Grid columns={2} gap="md">
              <StatCard
                title="GitHub Score"
                value={subnet.github}
                color="blue"
              />
              <StatCard
                title="Test Coverage"
                value={`${subnet.testCov}%`}
                color="green"
              />
              <StatCard
                title="Documentation"
                value={subnet.docScore}
                color="orange"
              />
              <StatCard
                title="Momentum"
                value={subnet.momentum.toFixed(1)}
                color="purple"
              />
              <StatCard
                title="Liquidity"
                value={subnet.liquidity}
                color="blue"
              />
              <StatCard
                title="Alpha"
                value={subnet.alpha.toFixed(2)}
                color="green"
              />
            </Grid>
          </div>
        </Grid>

        {/* Rating Components */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Rating Components</h2>
          <Grid columns={3} gap="md">
            <Card className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Network Score</h3>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{ width: `${(subnet.network / 100) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-2xl font-bold">{subnet.network}/100</p>
            </Card>

            <Card className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Economic Score</h3>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-green-600 h-3 rounded-full"
                    style={{ width: `${(subnet.economic / 100) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-2xl font-bold">{subnet.economic}/100</p>
            </Card>

            <Card className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Fundamental Score</h3>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-purple-600 h-3 rounded-full"
                    style={{ width: `${(subnet.fundamental / 100) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-2xl font-bold">{subnet.fundamental}/100</p>
            </Card>
          </Grid>
        </div>

        {/* Related Subnets */}
        {relatedSubnets.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">
              Similar Subnets in {subnet.cat}
            </h2>
            <SubnetTable
              subnets={relatedSubnets}
              columns={[
                "rank",
                "name",
                "marketCap",
                "score",
                "dailyTao",
                "uptime",
              ]}
              onSubnetClick={(subnet) => selectSubnet(subnet)}
            />
          </div>
        )}
      </Container>

      {/* Add to Portfolio Modal */}
      <Modal
        isOpen={showPortfolioModal}
        onClose={() => setShowPortfolioModal(false)}
        title={`Add ${subnet.n} to Portfolio`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <input
              type="number"
              min="1"
              value={portfolioAmount}
              onChange={(e) => setPortfolioAmount(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <Alert
            type="info"
            message={`You're adding ${portfolioAmount} unit(s) at ${formatCurrency(subnet.mc)} per unit`}
          />
        </div>
      </Modal>
    </>
  );
};

import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export const SignInOverlay: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) { setError("Firebase is not configured."); return; }
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (onClose) onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(6,7,15,0.85)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div
        style={{
          background: "#10131f",
          border: "1px solid rgba(91,94,244,0.28)",
          borderRadius: "18px",
          padding: "40px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 8px 64px rgba(91,94,244,0.22)",
          position: "relative",
          color: "#dde4f8",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "none",
              border: "none",
              color: "#8492be",
              fontSize: "20px",
              cursor: "pointer",
              lineHeight: 1,
              padding: "4px 8px",
              borderRadius: "6px",
            }}
            onMouseOver={e => (e.currentTarget.style.color = "#dde4f8")}
            onMouseOut={e => (e.currentTarget.style.color = "#8492be")}
          >
            ✕
          </button>
        )}

        <>
            {/* Logo mark */}
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "12px",
                background: "rgba(91,94,244,0.15)", border: "1px solid rgba(91,94,244,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
                  <polygon points="9,1.5 16.5,5.5 16.5,12.5 9,16.5 1.5,12.5 1.5,5.5" stroke="#7c7fff" strokeWidth="1.5" fill="none" />
                  <circle cx="9" cy="9" r="2.4" fill="#7c7fff" />
                </svg>
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>
                Sign In to DeAIPro
              </h2>
              <p style={{ color: "#8492be", fontSize: "14px", lineHeight: 1.6 }}>
                Enter your credentials to access the platform.
              </p>
            </div>

            {error && (
              <div style={{
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.3)",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "16px",
                color: "#f87171",
                fontSize: "13px",
                lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#8492be", marginBottom: "8px", fontWeight: 500 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@deaistrategies.io"
                  style={{
                    width: "100%",
                    background: "#0b0d1a",
                    border: "1px solid rgba(91,94,244,0.25)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    color: "#dde4f8",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(91,94,244,0.7)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(91,94,244,0.25)")}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#8492be", marginBottom: "8px", fontWeight: 500 }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    background: "#0b0d1a",
                    border: "1px solid rgba(91,94,244,0.25)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    color: "#dde4f8",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(91,94,244,0.7)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(91,94,244,0.25)")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: loading ? "rgba(91,94,244,0.5)" : "linear-gradient(135deg,#5b5ef4,#7c7fff)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "13px",
                  color: "#fff",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.02em",
                  boxShadow: "0 4px 24px rgba(91,94,244,0.35)",
                }}
              >
                {loading ? "Signing in…" : "Sign In →"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: "#3d4870" }}>
              Platform access is by invitation only. © 2026 DeAI Strategies Corp.
            </p>
          </>
      </div>
    </div>
  );
};


