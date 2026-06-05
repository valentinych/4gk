import type { Metadata } from "next";
import { KsiResultsClient } from "./KsiResultsClient";

export const metadata: Metadata = {
  title: "КСИ | Syrenki Mazowieckie Lite",
  description: "Результаты Командной «Своей игры» на Syrenki Mazowieckie Lite 2026",
};

export const dynamic = "force-dynamic";

export default function SyrenyLiteKsiPage() {
  return <KsiResultsClient />;
}
