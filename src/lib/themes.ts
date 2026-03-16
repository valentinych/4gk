import type { LogoVariant } from "@/components/Logo";

export interface Theme {
  id: string;
  name: string;
  description: string;
  logoVariant: LogoVariant;
  preview: { bg: string; accent: string; text: string };
  vars: Record<string, string>;
  heroGradient: string;
  gameColors: {
    quiz: { gradient: string; border: string };
    reaction: { gradient: string; border: string };
    memory: { gradient: string; border: string };
  };
}

export const themes: Theme[] = [
  {
    id: "neon",
    name: "Neon Night",
    description: "Тёмная тема с неоновыми акцентами",
    logoVariant: "neon",
    preview: { bg: "#0a0a1a", accent: "#6c5ce7", text: "#e8e8ed" },
    vars: {
      "--background": "#0a0a0f",
      "--foreground": "#e8e8ed",
      "--accent": "#6c5ce7",
      "--accent-light": "#a29bfe",
      "--surface": "#16161f",
      "--surface-light": "#1e1e2a",
      "--border": "#2a2a3a",
      "--success": "#00d2d3",
      "--warning": "#feca57",
      "--danger": "#ff6b6b",
      "--header-bg": "rgba(10, 10, 15, 0.8)",
      "--glow-color": "rgba(108, 92, 231, 0.3)",
      "--glow-color-strong": "rgba(108, 92, 231, 0.6)",
    },
    heroGradient: "radial-gradient(ellipse at top, rgba(108,92,231,0.15), transparent 60%)",
    gameColors: {
      quiz: { gradient: "from-violet-500/20 to-purple-600/20", border: "border-violet-500/30" },
      reaction: { gradient: "from-cyan-500/20 to-blue-600/20", border: "border-cyan-500/30" },
      memory: { gradient: "from-amber-500/20 to-orange-600/20", border: "border-amber-500/30" },
    },
  },
  {
    id: "arcade",
    name: "Retro Arcade",
    description: "Ретро-стиль с пиксельным духом аркад",
    logoVariant: "arcade",
    preview: { bg: "#1a1a2e", accent: "#e94560", text: "#eee" },
    vars: {
      "--background": "#0f0f23",
      "--foreground": "#eeeeee",
      "--accent": "#e94560",
      "--accent-light": "#ff6b81",
      "--surface": "#1a1a2e",
      "--surface-light": "#222240",
      "--border": "#2a2a4a",
      "--success": "#00ff88",
      "--warning": "#ffdd00",
      "--danger": "#ff4444",
      "--header-bg": "rgba(15, 15, 35, 0.9)",
      "--glow-color": "rgba(233, 69, 96, 0.3)",
      "--glow-color-strong": "rgba(233, 69, 96, 0.6)",
    },
    heroGradient: "radial-gradient(ellipse at top, rgba(233,69,96,0.15), transparent 60%)",
    gameColors: {
      quiz: { gradient: "from-pink-500/20 to-red-600/20", border: "border-pink-500/30" },
      reaction: { gradient: "from-green-500/20 to-emerald-600/20", border: "border-green-500/30" },
      memory: { gradient: "from-yellow-500/20 to-amber-600/20", border: "border-yellow-500/30" },
    },
  },
  {
    id: "minimal",
    name: "Clean Light",
    description: "Минималистичная светлая тема",
    logoVariant: "minimal",
    preview: { bg: "#ffffff", accent: "#1a1a1a", text: "#1a1a1a" },
    vars: {
      "--background": "#ffffff",
      "--foreground": "#1a1a1a",
      "--accent": "#1a1a1a",
      "--accent-light": "#444444",
      "--surface": "#f5f5f5",
      "--surface-light": "#eeeeee",
      "--border": "#e0e0e0",
      "--success": "#16a34a",
      "--warning": "#ca8a04",
      "--danger": "#dc2626",
      "--header-bg": "rgba(255, 255, 255, 0.85)",
      "--glow-color": "rgba(0, 0, 0, 0.08)",
      "--glow-color-strong": "rgba(0, 0, 0, 0.15)",
    },
    heroGradient: "radial-gradient(ellipse at top, rgba(0,0,0,0.03), transparent 60%)",
    gameColors: {
      quiz: { gradient: "from-gray-100 to-gray-200", border: "border-gray-300" },
      reaction: { gradient: "from-gray-100 to-gray-200", border: "border-gray-300" },
      memory: { gradient: "from-gray-100 to-gray-200", border: "border-gray-300" },
    },
  },
  {
    id: "gradient",
    name: "Aurora",
    description: "Градиентная тема с яркими переливами",
    logoVariant: "gradient",
    preview: { bg: "#13111c", accent: "#667eea", text: "#e8e8f0" },
    vars: {
      "--background": "#13111c",
      "--foreground": "#e8e8f0",
      "--accent": "#667eea",
      "--accent-light": "#9b8cff",
      "--surface": "#1c1929",
      "--surface-light": "#252236",
      "--border": "#322e48",
      "--success": "#34d399",
      "--warning": "#fbbf24",
      "--danger": "#f87171",
      "--header-bg": "rgba(19, 17, 28, 0.8)",
      "--glow-color": "rgba(102, 126, 234, 0.3)",
      "--glow-color-strong": "rgba(102, 126, 234, 0.6)",
    },
    heroGradient: "radial-gradient(ellipse at top left, rgba(102,126,234,0.2), transparent 40%), radial-gradient(ellipse at top right, rgba(118,75,162,0.15), transparent 40%)",
    gameColors: {
      quiz: { gradient: "from-indigo-500/20 to-violet-600/20", border: "border-indigo-500/30" },
      reaction: { gradient: "from-teal-500/20 to-cyan-600/20", border: "border-teal-500/30" },
      memory: { gradient: "from-rose-500/20 to-pink-600/20", border: "border-rose-500/30" },
    },
  },
];

export function getTheme(id: string): Theme {
  return themes.find((t) => t.id === id) ?? themes[0];
}
