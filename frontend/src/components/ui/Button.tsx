import React from "react";

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  disabled,
  children,
  style,
  ...props
}) => {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontWeight: 600,
    borderRadius: 8,
    cursor: isLoading || disabled ? "not-allowed" : "pointer",
    opacity: isLoading || disabled ? 0.5 : 1,
    border: "none",
    transition: "all 0.15s ease",
    fontFamily: "inherit",
    fontSize: size === "sm" ? 12 : size === "lg" ? 15 : 13,
    padding: size === "sm" ? "6px 12px" : size === "lg" ? "12px 24px" : "8px 16px",
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary:   { background: "linear-gradient(135deg, var(--accent), var(--accent-light))", color: "#fff", boxShadow: "0 4px 16px var(--accent-glow)" },
    secondary: { background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" },
    danger:    { background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger)" },
    ghost:     { background: "transparent", color: "var(--text-muted)" },
  };

  return (
    <button style={{ ...base, ...variantStyles[variant], ...style }} disabled={isLoading || disabled} {...props}>
      {isLoading ? <Spinner /> : icon}
      {children}
    </button>
  );
};

const Spinner = () => (
  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  accent?: "blue" | "green" | "orange" | "purple" | "red" | "none";
}

export const Card: React.FC<CardProps> = ({ children, hover = false, accent = "none", style, ...props }) => {
  const accentColor: Record<string, string> = {
    blue:   "var(--accent)",
    green:  "var(--success)",
    orange: "var(--warning)",
    purple: "var(--accent-light)",
    red:    "var(--danger)",
    none:   "transparent",
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        borderLeft: accent !== "none" ? `3px solid ${accentColor[accent]}` : "1px solid var(--border)",
        transition: hover ? "all 0.15s ease" : undefined,
        cursor: hover ? "pointer" : undefined,
        ...style,
      }}
      onMouseEnter={hover ? e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px var(--accent-glow)"; } : undefined}
      onMouseLeave={hover ? e => { (e.currentTarget as HTMLElement).style.borderColor = accent !== "none" ? accentColor[accent] : "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; } : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

// ── Badge ─────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "default", size = "md", className }) => {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: "var(--surface-2)", color: "var(--text-muted)" },
    success: { background: "var(--success-bg)", color: "var(--success)" },
    warning: { background: "var(--warning-bg)", color: "var(--warning)" },
    danger:  { background: "var(--danger-bg)",  color: "var(--danger)" },
    info:    { background: "var(--accent-glow)", color: "var(--accent-light)" },
  };

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        fontWeight: 600,
        fontSize: size === "sm" ? 10 : 11,
        padding: size === "sm" ? "2px 7px" : "3px 9px",
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 16,
  borderRadius = 6,
  count = 1,
}) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="skeleton"
        style={{ width, height, borderRadius, marginBottom: count > 1 ? 8 : 0 }}
      />
    ))}
  </>
);

// ── LoadingSpinner ────────────────────────────────────────────────────────────

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = "md", text }) => {
  const sz = { sm: 20, md: 36, lg: 52 }[size];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg className="animate-spin" width={sz} height={sz} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="3" />
        <path d="M4 12a8 8 0 018-8" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {text && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{text}</p>}
    </div>
  );
};

// ── Alert ─────────────────────────────────────────────────────────────────────

interface AlertProps {
  type?: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ type = "info", title, message, onClose }) => {
  const styles: Record<string, { bg: string; color: string; icon: string }> = {
    success: { bg: "var(--success-bg)", color: "var(--success)", icon: "✓" },
    error:   { bg: "var(--danger-bg)",  color: "var(--danger)",  icon: "✕" },
    warning: { bg: "var(--warning-bg)", color: "var(--warning)", icon: "⚠" },
    info:    { bg: "var(--accent-glow)",color: "var(--accent-light)", icon: "ℹ" },
  };
  const s = styles[type];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 10,
        background: s.bg,
        border: `1px solid ${s.color}22`,
        color: s.color,
      }}
    >
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{s.icon}</span>
      <div style={{ flex: 1 }}>
        {title && <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{title}</p>}
        <p style={{ fontSize: 13 }}>{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} style={{ background: "none", border: "none", color: "currentColor", cursor: "pointer", opacity: 0.6, flexShrink: 0 }}>✕</button>
      )}
    </div>
  );
};

// ── Tabs ──────────────────────────────────────────────────────────────────────

interface TabsProps {
  tabs: { label: string; value: string; icon?: React.ReactNode }[];
  activeTab: string;
  onTabChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange, children }) => (
  <div>
    <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            background: "none",
            border: "none",
            borderBottom: activeTab === tab.value ? "2px solid var(--accent)" : "2px solid transparent",
            color: activeTab === tab.value ? "var(--accent-light)" : "var(--text-muted)",
            cursor: "pointer",
            marginBottom: -1,
            transition: "all 0.15s",
          }}
        >
          {tab.icon}{tab.label}
        </button>
      ))}
    </div>
    {children}
  </div>
);

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, icon, style, ...props }) => (
  <div style={{ width: "100%" }}>
    {label && <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 6 }}>{label}</label>}
    <div style={{ position: "relative" }}>
      {icon && <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }}>{icon}</div>}
      <input
        style={{
          width: "100%",
          padding: icon ? "9px 12px 9px 36px" : "9px 12px",
          background: "var(--surface-2)",
          border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
          borderRadius: 8,
          color: "var(--text)",
          fontSize: 13,
          outline: "none",
          fontFamily: "inherit",
          transition: "border-color 0.15s",
          ...style,
        }}
        onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
        onBlur={e => (e.currentTarget.style.borderColor = error ? "var(--danger)" : "var(--border)")}
        {...props}
      />
    </div>
    {error && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>{error}</p>}
    {helperText && !error && <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{helperText}</p>}
  </div>
);

// ── Select ────────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, style, ...props }) => (
  <div style={{ width: "100%" }}>
    {label && <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 6 }}>{label}</label>}
    <select
      style={{
        width: "100%",
        padding: "9px 12px",
        background: "var(--surface-2)",
        border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
        borderRadius: 8,
        color: "var(--text)",
        fontSize: 13,
        outline: "none",
        fontFamily: "inherit",
        cursor: "pointer",
        ...style,
      }}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} style={{ background: "var(--surface)" }}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>{error}</p>}
  </div>
);
