import type { Metadata } from "next";
import { BrainRingClient } from "./BrainRingClient";

export const metadata: Metadata = {
  title: "Брейн-ринг · Syrenki Mazowieckie Lite",
  description: "Результаты брейн-ринга Syrenki Mazowieckie Lite в реальном времени.",
};

export default function SyrenyLiteBrainRingPage() {
  return <BrainRingClient />;
}
