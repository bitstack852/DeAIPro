import React, { useState, useEffect } from "react";
import { DataProvider, useData } from "./contexts/DataContext";
import { DashboardPage } from "./pages/DashboardPage";
import { NewsPage, ResearchPage, LessonsPage } from "./pages/ContentPages";
import { SubnetDetailPage, SignInOverlay } from "./pages/DetailPages";
import { LandingPage } from "./pages/LandingPage";
import AdminPage from "./pages/AdminPage";
import { Header, Sidebar, Footer, Container } from "./components/layout/Layout";
import { Alert, Button } from "./components/ui/Button";
import { getCategoryIcon } from "./utils/formatters";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

type PageType =
  | "dashboard"
  | "news"
  | "research"
  | "lessons"
  | "portfolio"
  | "settings"
  | "access"
  | "admin";

interface AppLayoutProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  selectedSubnetId?: number;
}

const STAFF_DOMAIN = "@deaistrategies.io";

const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onPageChange,
  selectedSubnetId,
}) => {
  const { state } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isStaff = !!state.user?.email?.toLowerCase().endsWith(STAFF_DOMAIN);

  const sidebarItems = [
    { icon: "📊", label: "Dashboard", href: "dashboard" },
    { icon: "📰", label: "News Feed", href: "news" },
    { icon: "🔬", label: "Research", href: "research" },
    { icon: "📚", label: "Education", href: "lessons" },
    { icon: "💼", label: "Portfolio", href: "portfolio" },
    { icon: "⚙️", label: "Settings", href: "settings" },
    ...(isStaff ? [{ icon: "🛡️", label: "Admin", href: "admin" }] : []),
  ];

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "news":
        return <NewsPage />;
      case "research":
        return <ResearchPage />;
      case "lessons":
        return <LessonsPage />;
      case "portfolio":
        return <PortfolioPage />;
      case "settings":
        return <SettingsPage />;
      case "access":
        return <DashboardPage />;
      case "admin":
        return <AdminPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        items={sidebarItems}
        activeLocation={currentPage}
        onItemClick={(href) => {
          onPageChange(href as PageType);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="DeAIPro"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          actions={
            state.user ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  signOut(auth);
                }}
              >
                Sign Out
              </Button>
            ) : null
          }
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">{renderPage()}</main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

const PortfolioPage: React.FC = () => {
  const { state } = useData();

  return (
    <>
      <Header title="Portfolio" subtitle="Your subnet holdings" />
      <Container>
        {state.portfolio.items.length > 0 ? (
          <div className="space-y-4">
            {state.portfolio.items.map((item) => {
              const subnet = state.subnets.find((s) => s.id === item.subnetId);
              return (
                <div key={item.subnetId} className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{subnet?.n || "Unknown"}</h3>
                      <p className="text-sm text-gray-600">
                        {item.amount} units @ ${item.purchasePrice}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${(item.amount * item.purchasePrice).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="bg-white p-4 rounded-lg border-2 border-blue-600 font-bold">
              <div className="flex items-center justify-between">
                <span>Total Value:</span>
                <span>${state.portfolio.totalValue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No portfolio items yet</p>
          </div>
        )}
      </Container>
    </>
  );
};

const SettingsPage: React.FC = () => {
  const [theme, setTheme] = React.useState("light");
  const [notifications, setNotifications] = React.useState(true);

  return (
    <>
      <Header title="Settings" subtitle="Customize your experience" />
      <Container>
        <div className="bg-white p-6 rounded-lg border max-w-md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Enable notifications</span>
              </label>
            </div>

            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              Save Settings
            </button>
          </div>
        </div>
      </Container>
    </>
  );
};

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");
  const [selectedSubnetId, setSelectedSubnetId] = useState<number | undefined>();
  const { state } = useData();

  const [isSignInOpen, setIsSignInOpen] = useState(false);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      // Data is already auto-syncing in DataContext
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  if (!state.user) {
    return (
      <>
        {isSignInOpen && <SignInOverlay onClose={() => setIsSignInOpen(false)} />}
        <LandingPage onSignIn={() => setIsSignInOpen(true)} />
      </>
    );
  }

  return (
    <AppLayout
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      selectedSubnetId={selectedSubnetId}
    />
  );
};

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    // Initialize app
    setIsInitialized(true);
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-4xl font-bold text-white mb-4">DeAIPro</div>
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;
