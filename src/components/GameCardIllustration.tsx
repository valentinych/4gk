"use client";

interface Props {
  type: "quiz" | "reaction" | "memory";
}

export function GameCardIllustration({ type }: Props) {
  switch (type) {
    case "quiz":
      return (
        <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16 opacity-50" aria-hidden="true">
          <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
          <text x="40" y="44" textAnchor="middle" fill="currentColor" fontSize="28" fontWeight="bold" opacity="0.5">?</text>
          <circle cx="20" cy="18" r="3" fill="currentColor" opacity="0.2">
            <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="62" cy="22" r="2" fill="currentColor" opacity="0.3">
            <animate attributeName="r" values="2;4;2" dur="2.5s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    case "reaction":
      return (
        <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16 opacity-50" aria-hidden="true">
          <polygon points="40,10 48,32 72,32 52,46 60,68 40,54 20,68 28,46 8,32 32,32" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" fill="currentColor" fillOpacity="0.05">
            <animate attributeName="fill-opacity" values="0.05;0.15;0.05" dur="1.5s" repeatCount="indefinite" />
          </polygon>
        </svg>
      );
    case "memory":
      return (
        <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16 opacity-50" aria-hidden="true">
          <rect x="10" y="10" width="25" height="25" rx="4" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
          <rect x="45" y="10" width="25" height="25" rx="4" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" fill="currentColor" fillOpacity="0.1" />
          <rect x="10" y="45" width="25" height="25" rx="4" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" fill="currentColor" fillOpacity="0.1" />
          <rect x="45" y="45" width="25" height="25" rx="4" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
          <circle cx="22.5" cy="22.5" r="5" fill="currentColor" opacity="0.2">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="57.5" cy="57.5" r="5" fill="currentColor" opacity="0.2">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
  }
}
