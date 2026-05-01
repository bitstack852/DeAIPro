import React, { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";

// ── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

interface SidebarProps {
  items: SidebarItem[];
  activeLocation?: string;
  onItemClick?: (href: string) => void;
  expanded: boolean;
  onToggle: () => void;
}

const SIDEBAR_COLLAPSED = 60;
const SIDEBAR_EXPANDED  = 220;

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeLocation,
  onItemClick,
  expanded,
  onToggle,
}) => {
  const width = expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  return (
    <aside
      style={{
        width,
        minWidth: width,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        transition: "width 0.25s ease, min-width 0.25s ease",
        overflow: "hidden",
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid var(--border)",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <svg width="28" height="28" viewBox="0 0 18 18" fill="none">
            <polygon
              points="9,1.5 16.5,5.5 16.5,12.5 9,16.5 1.5,12.5 1.5,5.5"
              stroke="var(--accent-light)"
              strokeWidth="1.5"
              fill="none"
            />
            <circle cx="9" cy="9" r="2.4" fill="var(--accent)" />
          </svg>
        </div>
        {expanded && (
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text)",
              whiteSpace: "nowrap",
              letterSpacing: "-0.02em",
            }}
          >
            DeAIPro
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto", overflowX: "hidden" }}>
        {items.map((item) => {
          const isActive = activeLocation === item.href;
          return (
            <button
              key={item.href}
              onClick={() => onItemClick?.(item.href)}
              title={!expanded ? item.label : undefined}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: expanded ? "10px 14px" : "10px 0",
                justifyContent: expanded ? "flex-start" : "center",
                background: isActive ? "var(--accent-glow)" : "transparent",
                border: "none",
                borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                color: isActive ? "var(--accent-light)" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text)";
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {expanded && (
                <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
              )}
              {expanded && item.badge && item.badge > 0 && (
                <span
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: "1px 6px",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Toggle */}
      <button
        onClick={onToggle}
        title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: expanded ? "flex-start" : "center",
          gap: 8,
          padding: expanded ? "12px 16px" : "12px 0",
          width: "100%",
          background: "none",
          border: "none",
          borderTop: "1px solid var(--border)",
          color: "var(--text-dim)",
          cursor: "pointer",
          fontSize: 12,
          flexShrink: 0,
          transition: "color 0.15s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-muted)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.25s ease", flexShrink: 0 }}
        >
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {expanded && <span>Collapse</span>}
      </button>
    </aside>
  );
};

// ── App Header ───────────────────────────────────────────────────────────────

interface AppHeaderProps {
  title: string;
  user?: { email?: string | null } | null;
  onSignOut?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, user, onSignOut }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      <h1
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--text)",
          margin: 0,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h1>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 15,
            transition: "all 0.15s ease",
          }}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* User email */}
        {user?.email && (
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.email}
          </span>
        )}

        {/* Sign out */}
        {onSignOut && (
          <button
            onClick={onSignOut}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--danger)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--danger)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
};

// ── Legacy Header (kept for compatibility) ────────────────────────────────────

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actions }) => (
  <div
    style={{
      padding: "20px 24px 0",
      marginBottom: 4,
    }}
  >
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  </div>
);

// ── Container ─────────────────────────────────────────────────────────────────

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({ children }) => (
  <div style={{ padding: "20px 24px 40px" }}>{children}</div>
);

// ── Grid ──────────────────────────────────────────────────────────────────────

interface GridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export const Grid: React.FC<GridProps> = ({ children, columns = 3, gap = "md" }) => {
  const gapPx = { sm: 8, md: 16, lg: 24 }[gap];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: gapPx,
      }}
    >
      {children}
    </div>
  );
};

// ── Empty State ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = "📭", title, message, action }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "64px 24px",
      textAlign: "center",
      background: "var(--surface)",
      borderRadius: 12,
      border: "1px solid var(--border)",
    }}
  >
    <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.5 }}>{icon}</div>
    <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{title}</h3>
    <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 320 }}>{message}</p>
    {action && <div style={{ marginTop: 20 }}>{action}</div>}
  </div>
);

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24 }}>
    <PageBtn disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>← Prev</PageBtn>
    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
      const page = i + Math.max(1, currentPage - 2);
      if (page > totalPages) return null;
      return (
        <PageBtn key={page} active={page === currentPage} onClick={() => onPageChange(page)}>
          {page}
        </PageBtn>
      );
    })}
    <PageBtn disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>Next →</PageBtn>
  </div>
);

const PageBtn: React.FC<{ children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }> = ({
  children, onClick, disabled, active,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "6px 12px",
      borderRadius: 8,
      border: "1px solid var(--border)",
      background: active ? "var(--accent)" : "var(--surface-2)",
      color: active ? "#fff" : "var(--text-muted)",
      fontSize: 13,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1,
      transition: "all 0.15s",
    }}
  >
    {children}
  </button>
);

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = "md" }) => {
  if (!isOpen) return null;
  const maxWidth = { sm: 400, md: 520, lg: 680 }[size];
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)", width: "100%", maxWidth, boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "20px", maxHeight: 400, overflowY: "auto" }}>{children}</div>
        {footer && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>{footer}</div>
        )}
      </div>
    </div>
  );
};
