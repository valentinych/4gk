import type { Metadata } from "next";
import { ChgkResultsClient } from "./ChgkResultsClient";
import { SYRENY_LITE_CHGK } from "@/lib/syreny-lite";

export const metadata: Metadata = {
  title: `${SYRENY_LITE_CHGK.title} · Syrenki Mazowieckie Lite`,
  description: "Результаты ЧГК Syrenki Mazowieckie Lite с трансляции haza.online.",
};

export default function SyrenyLiteChgkPage() {
  return <ChgkResultsClient />;
}
