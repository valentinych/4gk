interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 36, className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#fafafa" stroke="#e0e0e0" strokeWidth="1.5" />
      <text x="32" y="30" textAnchor="middle" dominantBaseline="central" fill="#111" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="20">4GK</text>
      <line x1="20" y1="39" x2="44" y2="39" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
      <text x="32" y="50" textAnchor="middle" dominantBaseline="central" fill="#888" fontFamily="system-ui, sans-serif" fontWeight="500" fontSize="10">.pl</text>
    </svg>
  );
}
