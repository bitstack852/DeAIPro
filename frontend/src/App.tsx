import React, { useState, useEffect } from "react";

const APP_VERSION = "2026-05-01.10";
console.log(`[DeAIPro] version ${APP_VERSION} loaded`);

import { DataProvider, useData } from "./contexts/DataContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DashboardPage } from "./pages/DashboardPage";
import { NewsPage, ResearchPage, LessonsPage } from "./pages/ContentPages";
import { SignInOverlay } from "./pages/DetailPages";
import { LandingPage } from "./pages/LandingPage";
import AdminPage from "./pages/AdminPage";
import { SettingsPage } from "./pages/SettingsPage";
import { Sidebar, AppHeader } from "./components/layout/Layout";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

type PageType = "dashboard" | "news" | "research" | "lessons" | "portfolio" | "settings" | "access" | "admin";

const STAFF_DOMAIN = "@deaistrategies.io";

const PAGE_TITLES: Record<PageType, string> = {
  dashboard: "Dashboard",
  news:      "News Feed",
  research:  "Research",
  lessons:   "Education",
  portfolio: "Portfolio",
  settings:  "Settings",
  access:    "Access",
  admin:     "Admin",
};

// ── Placeholder pages ─────────────────────────────────────────────────────────

const PortfolioPage: React.FC = () => {
  const { state } = useData();
  return (
    <div style={{ padding: "20px 24px 40px" }}>
      {state.portfolio.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4 }}>💼</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>No holdings yet</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Add subnets to your portfolio from the dashboard.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {state.portfolio.items.map(item => (
            <div key={item.subnetId} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "0 0 2px" }}>Subnet #{item.subnetId}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{item.amount} units @ ${item.purchasePrice}</p>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                ${(item.amount * item.purchasePrice).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// ── App Layout ────────────────────────────────────────────────────────────────

const AppLayout: React.FC<{ currentPage: PageType; onPageChange: (p: PageType) => void }> = ({
  currentPage,
  onPageChange,
}) => {
  const { state } = useData();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const isStaff = !!state.user?.email?.toLowerCase().endsWith(STAFF_DOMAIN);

  const sidebarItems = [
    { icon: "📊", label: "Dashboard", href: "dashboard" },
    { icon: "📰", label: "News Feed", href: "news" },
    { icon: "🔬", label: "Research",  href: "research" },
    { icon: "📚", label: "Education", href: "lessons" },
    { icon: "💼", label: "Portfolio", href: "portfolio" },
    { icon: "⚙️", label: "Settings",  href: "settings" },
    ...(isStaff ? [{ icon: "🛡️", label: "Admin", href: "admin" }] : []),
  ];

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": return <DashboardPage />;
      case "news":      return <NewsPage />;
      case "research":  return <ResearchPage />;
      case "lessons":   return <LessonsPage />;
      case "portfolio": return <PortfolioPage />;
      case "settings":  return <SettingsPage />;
      case "admin":     return <AdminPage />;
      default:          return <DashboardPage />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      <Sidebar
        items={sidebarItems}
        activeLocation={currentPage}
        onItemClick={p => onPageChange(p as PageType)}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(x => !x)}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AppHeader
          title={PAGE_TITLES[currentPage]}
          user={state.user}
          onSignOut={() => auth && signOut(auth)}
          onMenuToggle={() => setSidebarExpanded(x => !x)}
        />
        <main style={{ flex: 1, overflowY: "auto" }} className="animate-fadeIn">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

// ── App Content ───────────────────────────────────────────────────────────────

const AppContent: React.FC = () => {
  const { state } = useData();
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  if (!state.user) {
    return (
      <>
        {isSignInOpen && <SignInOverlay onClose={() => setIsSignInOpen(false)} />}
        <LandingPage onSignIn={() => setIsSignInOpen(true)} />
      </>
    );
  }

  return <AppLayout currentPage={currentPage} onPageChange={setCurrentPage} />;
};

// ── App Root ──────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => { setReady(true); }, []);

  if (!ready) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0b0d1a" }}>
        <div style={{ textAlign: "center" }}>
          <svg width="40" height="40" viewBox="0 0 18 18" fill="none" style={{ marginBottom: 16 }}>
            <polygon points="9,1.5 16.5,5.5 16.5,12.5 9,16.5 1.5,12.5 1.5,5.5" stroke="#7c7fff" strokeWidth="1.5" fill="none" />
            <circle cx="9" cy="9" r="2.4" fill="#5b5ef4" />
          </svg>
          <p style={{ color: "#dde4f8", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>DeAIPro</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ThemeProvider>
  );
};

export default App;
