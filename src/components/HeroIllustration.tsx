"use client";

import { useTheme } from "@/components/ThemeProvider";

export function HeroIllustration() {
  const { theme } = useTheme();
  const accent = theme.vars["--accent"];
  const accentLight = theme.vars["--accent-light"];

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      className="mx-auto h-auto w-full max-w-md opacity-80"
      aria-hidden="true"
    >
      {/* Controller body */}
      <rect x="100" y="80" width="200" height="120" rx="40" fill={accent} fillOpacity="0.12" stroke={accent} strokeWidth="2" strokeOpacity="0.3" />
      {/* D-pad */}
      <rect x="140" y="120" width="12" height="36" rx="3" fill={accentLight} fillOpacity="0.5" />
      <rect x="128" y="132" width="36" height="12" rx="3" fill={accentLight} fillOpacity="0.5" />
      {/* Buttons */}
      <circle cx="270" cy="125" r="8" fill={accent} fillOpacity="0.5" />
      <circle cx="290" cy="138" r="8" fill={accentLight} fillOpacity="0.5" />
      <circle cx="250" cy="138" r="8" fill={accent} fillOpacity="0.4" />
      <circle cx="270" cy="151" r="8" fill={accentLight} fillOpacity="0.3" />
      {/* Joysticks */}
      <circle cx="170" cy="165" r="14" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="1.5" strokeOpacity="0.4" />
      <circle cx="230" cy="165" r="14" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="1.5" strokeOpacity="0.4" />
      {/* Screen/Center */}
      <rect x="185" y="110" width="30" height="18" rx="4" fill={accent} fillOpacity="0.15" stroke={accentLight} strokeWidth="1" strokeOpacity="0.5" />
      {/* Decorative particles */}
      <circle cx="80" cy="60" r="4" fill={accentLight} fillOpacity="0.4">
        <animate attributeName="cy" values="60;50;60" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="320" cy="70" r="3" fill={accent} fillOpacity="0.5">
        <animate attributeName="cy" values="70;58;70" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="200" r="5" fill={accentLight} fillOpacity="0.3">
        <animate attributeName="cy" values="200;190;200" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="340" cy="210" r="4" fill={accent} fillOpacity="0.4">
        <animate attributeName="cy" values="210;198;210" dur="3.5s" repeatCount="indefinite" />
      </circle>
      {/* Stars */}
      <polygon points="50,100 53,110 63,110 55,116 58,126 50,120 42,126 45,116 37,110 47,110" fill={accentLight} fillOpacity="0.3">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
      </polygon>
      <polygon points="350,150 352,156 358,156 353,160 355,166 350,162 345,166 347,160 342,156 348,156" fill={accent} fillOpacity="0.4">
        <animate attributeName="opacity" values="0.4;0.7;0.4" dur="2.5s" repeatCount="indefinite" />
      </polygon>
      {/* Connection lines */}
      <line x1="90" y1="140" x2="100" y2="140" stroke={accent} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;8" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1="300" y1="140" x2="310" y2="140" stroke={accent} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;8" dur="1s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}
