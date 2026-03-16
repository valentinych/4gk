export type LogoVariant = "neon" | "arcade" | "minimal" | "gradient";

interface LogoProps {
  variant?: LogoVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ variant = "neon", size = "md", className = "" }: LogoProps) {
  const sizes = { sm: 36, md: 48, lg: 72 };
  const s = sizes[size];

  switch (variant) {
    case "neon":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="2" y="2" width="60" height="60" rx="16" fill="#0a0a1a" stroke="#6c5ce7" strokeWidth="2" />
          <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#neonGlow)" fillOpacity="0.15" />
          <text x="32" y="28" textAnchor="middle" dominantBaseline="central" fill="#a29bfe" fontFamily="monospace" fontWeight="900" fontSize="22">4GK</text>
          <rect x="14" y="38" width="36" height="2" rx="1" fill="#6c5ce7" opacity="0.6" />
          <text x="32" y="50" textAnchor="middle" dominantBaseline="central" fill="#6c5ce7" fontFamily="monospace" fontWeight="600" fontSize="9">.PL</text>
          <defs>
            <radialGradient id="neonGlow" cx="0.5" cy="0.3" r="0.7">
              <stop offset="0%" stopColor="#6c5ce7" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
        </svg>
      );

    case "arcade":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="4" y="4" width="56" height="56" rx="4" fill="#1a1a2e" stroke="#e94560" strokeWidth="3" />
          <rect x="8" y="8" width="48" height="48" rx="2" fill="#16213e" />
          <rect x="8" y="8" width="48" height="16" fill="#e94560" rx="2" />
          <text x="32" y="18" textAnchor="middle" dominantBaseline="central" fill="#fff" fontFamily="monospace" fontWeight="900" fontSize="14">4GK.PL</text>
          <circle cx="22" cy="40" r="5" fill="#e94560" opacity="0.8" />
          <circle cx="42" cy="40" r="5" fill="#0f3460" stroke="#e94560" strokeWidth="2" />
          <rect x="30" y="34" width="4" height="12" rx="2" fill="#e94560" opacity="0.5" />
          <rect x="16" y="50" width="32" height="3" rx="1.5" fill="#e94560" opacity="0.3" />
        </svg>
      );

    case "minimal":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="2" y="2" width="60" height="60" rx="14" fill="#fafafa" stroke="#e0e0e0" strokeWidth="1.5" />
          <text x="32" y="30" textAnchor="middle" dominantBaseline="central" fill="#1a1a1a" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="20">4GK</text>
          <line x1="20" y1="39" x2="44" y2="39" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
          <text x="32" y="50" textAnchor="middle" dominantBaseline="central" fill="#888" fontFamily="system-ui, sans-serif" fontWeight="500" fontSize="10">.pl</text>
        </svg>
      );

    case "gradient":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
            <linearGradient id="textGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="100%" stopColor="#e0d4ff" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#bgGrad)" />
          <text x="32" y="28" textAnchor="middle" dominantBaseline="central" fill="url(#textGrad)" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="22">4GK</text>
          <rect x="16" y="37" width="32" height="2" rx="1" fill="white" opacity="0.4" />
          <text x="32" y="50" textAnchor="middle" dominantBaseline="central" fill="white" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="10" opacity="0.8">.PL</text>
        </svg>
      );
  }
}
