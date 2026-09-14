import type { ReactElement, ReactNode, MouseEvent } from "react";
import { APP_ROUTES, type AppRoute, type AppRouteKey } from "./routes";

/*
 * Shell ported from the approved Figma Make prototype (src/App.tsx in the export):
 * desktop sidebar with icon nav, mobile topbar and bottom tab bar. Only the
 * prototype's local tab state is replaced by the app's real routes; markup,
 * tokens and spacing are kept as designed.
 */

type NavIcon = (active: boolean) => ReactElement;

const NAV_ICONS: Record<AppRouteKey, NavIcon> = {
  now: (a) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" fill={a ? "var(--nav-icon-active)" : "none"} stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="8.5" stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.6" />
    </svg>
  ),
  direction: (a) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="12,2.5 21.5,20.5 12,16.5 2.5,20.5" fill={a ? "var(--nav-icon-active)" : "none"} stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  execute: (a) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" fill={a ? "var(--nav-icon-active)" : "none"} stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.8" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill={a ? "var(--nav-icon-active)" : "none"} stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.8" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill="none" stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.8" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill="none" stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.8" />
    </svg>
  ),
  reflect: (a) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 12.8A9.5 9.5 0 1111.2 3 7.3 7.3 0 0021 12.8z" fill={a ? "var(--nav-icon-active)" : "none"} stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.8" />
    </svg>
  ),
  me: (a) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="4" fill={a ? "var(--nav-icon-active)" : "none"} stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.8" />
      <path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5" stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  clarity: (a) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26C17.81 13.47 19 11.38 19 9c0-3.87-3.13-7-7-7z" stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.7" />
      <path d="M9 21h6" stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  coach: (a) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l2 5h5l-4 3.2 1.5 5.3L12 13.6 7.5 16.5 9 11.2 5 8h5z" stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  incubator: (a) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3a6 6 0 00-3.5 10.9V17h7v-3.1A6 6 0 0012 3z" stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 20h4" stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  inbox: (a) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 13h5l1.5 3h5L16 13h5" stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 5h14l2 8v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4z" stroke={a ? "var(--nav-icon-active)" : "var(--text-3)"} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
};

const NAV_LABELS: Record<AppRouteKey, string> = {
  now: "NOW",
  direction: "DIR",
  execute: "EXECUTE",
  reflect: "REFLECT",
  me: "ME",
  clarity: "Clarity Reset",
  inbox: "Captures",
  incubator: "Incubator",
  coach: "AI Coach"
};

export type AppShellProps = {
  route: AppRoute | null;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, path: string) => void;
  statusSlot: ReactNode;
  children: ReactNode;
};

export function AppShell({ route, onNavigate, statusSlot, children }: AppShellProps) {
  const activeKey = route?.key ?? null;

  return (
    <div className="h-full flex overflow-hidden" style={{ background: "var(--bg)" }}>
      <aside
        className="hidden md:flex flex-col flex-shrink-0 h-full overflow-y-auto"
        style={{ width: 236, background: "var(--surface)", borderRight: "1px solid var(--border)" }}
        aria-label="LifeOS navigation"
      >
        <div className="flex items-center justify-between px-4 pt-5 pb-4 flex-shrink-0">
          <a className="flex items-center gap-2.5" href="/" onClick={(event) => onNavigate(event, "/")} style={{ textDecoration: "none" }}>
            <LogoMark size={36} />
            <span>
              <span className="text-[16px] block leading-none font-display" style={{ color: "var(--text)" }}>LifeOS</span>
              <span className="text-[9px] font-extrabold tracking-widest" style={{ color: "var(--text-3)" }}>BETA</span>
            </span>
          </a>
          {statusSlot}
        </div>

        <div className="px-4 mb-1 flex-shrink-0">
          <p className="text-[9px] font-extrabold tracking-widest" style={{ color: "var(--text-3)", letterSpacing: "0.14em" }}>TỔNG QUAN</p>
        </div>
        <nav className="px-3 space-y-0.5 flex-shrink-0">
          {APP_ROUTES.map((item) => (
            <SidebarItem key={item.key} routeKey={item.key} path={item.path} active={activeKey === item.key} onNavigate={onNavigate} />
          ))}
        </nav>

        <div className="mx-4 mt-4 mb-1 flex-shrink-0">
          <p className="text-[9px] font-extrabold tracking-widest" style={{ color: "var(--text-3)", letterSpacing: "0.14em" }}>CÔNG CỤ</p>
        </div>
        <nav className="px-3 space-y-0.5 flex-1">
          <SidebarItem routeKey="clarity" path="/clarity" active={activeKey === "clarity"} onNavigate={onNavigate} small />
          <SidebarItem routeKey="inbox" path="/inbox" active={activeKey === "inbox"} onNavigate={onNavigate} small />
          <SidebarItem routeKey="incubator" path="/incubator" active={activeKey === "incubator"} onNavigate={onNavigate} small />
          <SidebarItem routeKey="coach" path="/coach" active={activeKey === "coach"} onNavigate={onNavigate} small />
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="md:hidden flex-shrink-0 flex items-center justify-between px-4"
          style={{ height: 56, background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <a className="flex items-center gap-2.5" href="/" onClick={(event) => onNavigate(event, "/")} style={{ textDecoration: "none" }}>
            <LogoMark size={32} />
            <span className="text-[16px] font-display" style={{ color: "var(--text)" }}>LifeOS</span>
          </a>
          <div className="flex items-center gap-1.5">
            <TopBarLink path="/inbox" routeKey="inbox" active={activeKey === "inbox"} onNavigate={onNavigate} />
            <TopBarLink path="/incubator" routeKey="incubator" active={activeKey === "incubator"} onNavigate={onNavigate} />
            <TopBarLink path="/coach" routeKey="coach" active={activeKey === "coach"} onNavigate={onNavigate} />
            <TopBarLink path="/clarity" routeKey="clarity" active={activeKey === "clarity"} onNavigate={onNavigate} />
            {statusSlot}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-[72px] md:pb-0">
          <div key={activeKey ?? "unknown"} className="page-enter">
            {children}
          </div>
        </main>

        <nav
          className="md:hidden flex-shrink-0 flex z-20"
          style={{ height: 72, background: "var(--surface)", borderTop: "1px solid var(--border)", backdropFilter: "blur(16px)" }}
          aria-label="LifeOS navigation"
        >
          {APP_ROUTES.map((item) => (
            <BottomNavItem key={item.key} routeKey={item.key} path={item.path} active={activeKey === item.key} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>
    </div>
  );
}

/** Tools are not in the mobile tab bar, so they live as icons in the mobile top bar. */
function TopBarLink({
  path,
  routeKey,
  active,
  onNavigate
}: {
  path: string;
  routeKey: AppRouteKey;
  active: boolean;
  onNavigate: AppShellProps["onNavigate"];
}) {
  return (
    <a
      href={path}
      onClick={(event) => onNavigate(event, path)}
      aria-label={NAV_LABELS[routeKey]}
      aria-current={active ? "page" : undefined}
      className="w-8 h-8 rounded-xl flex items-center justify-center"
      style={{ background: active ? "var(--primary-bg)" : "transparent", textDecoration: "none" }}
    >
      {NAV_ICONS[routeKey](active)}
    </a>
  );
}

function SidebarItem({
  routeKey,
  path,
  active,
  onNavigate,
  small = false
}: {
  routeKey: AppRouteKey;
  path: string;
  active: boolean;
  onNavigate: AppShellProps["onNavigate"];
  small?: boolean;
}) {
  return (
    <a
      href={path}
      onClick={(event) => onNavigate(event, path)}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all ${active ? "sidebar-active" : ""}`}
      style={{
        background: active ? undefined : "transparent",
        color: active ? "var(--text)" : "var(--text-2)",
        fontWeight: active ? 800 : 600,
        border: active ? undefined : "1px solid transparent",
        textDecoration: "none"
      }}
    >
      <span className="flex-shrink-0">{NAV_ICONS[routeKey](active)}</span>
      <span style={small ? { fontSize: "0.82rem" } : undefined}>{NAV_LABELS[routeKey]}</span>
    </a>
  );
}

function BottomNavItem({
  routeKey,
  path,
  active,
  onNavigate
}: {
  routeKey: AppRouteKey;
  path: string;
  active: boolean;
  onNavigate: AppShellProps["onNavigate"];
}) {
  return (
    <a
      href={path}
      onClick={(event) => onNavigate(event, path)}
      aria-current={active ? "page" : undefined}
      className="flex-1 flex flex-col items-center justify-center gap-0 relative"
      style={{ paddingTop: 10, paddingBottom: 10, textDecoration: "none" }}
    >
      <span className="flex flex-col items-center gap-1 transition-all" style={{ transform: active ? "translateY(-1px)" : "translateY(0)" }}>
        {NAV_ICONS[routeKey](active)}
        <span className="text-[9px] font-extrabold tracking-wider" style={{ color: active ? "var(--text)" : "var(--text-3)" }}>
          {NAV_LABELS[routeKey]}
        </span>
      </span>
      {active ? (
        <span className="absolute rounded-full" style={{ bottom: 6, width: 6, height: 6, background: "var(--accent)", border: "1.5px solid var(--text)" }} />
      ) : null}
    </a>
  );
}

function LogoMark({ size }: { size: number }) {
  return (
    <span
      className="rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: "var(--logo-bg)", boxShadow: "0 4px 14px rgba(0,0,0,0.20)" }}
    >
      <svg width={size / 2} height={size / 2} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--logo-fg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
