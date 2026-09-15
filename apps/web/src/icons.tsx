import type { AppRouteKey } from "./routes";

type IconProps = { className?: string | undefined };

const base = { className: "nav-icon", viewBox: "0 0 24 24", "aria-hidden": true as const, focusable: "false" as const };

export function NowIcon({ className = "nav-icon" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function DirectionIcon({ className = "nav-icon" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </svg>
  );
}

export function ExecuteIcon({ className = "nav-icon" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function ReflectIcon({ className = "nav-icon" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  );
}

export function MeIcon({ className = "nav-icon" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </svg>
  );
}

export function ClarityIcon({ className = "nav-icon" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 6h16M4 12h10M4 18h7" />
    </svg>
  );
}

export function ShieldIcon({ className = "nav-icon" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6z" />
    </svg>
  );
}

export function RouteIcon({ routeKey, className }: { routeKey: AppRouteKey; className?: string }) {
  if (routeKey === "now") return <NowIcon className={className} />;
  if (routeKey === "direction") return <DirectionIcon className={className} />;
  if (routeKey === "execute") return <ExecuteIcon className={className} />;
  if (routeKey === "reflect") return <ReflectIcon className={className} />;
  if (routeKey === "me") return <MeIcon className={className} />;
  return <ClarityIcon className={className} />;
}
