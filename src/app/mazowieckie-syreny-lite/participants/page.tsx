import type { Metadata } from "next";
import { ParticipantsClient } from "./ParticipantsClient";

export const metadata: Metadata = {
  title: "Список команд | Mazowieckie Syreny Lite",
  description: "Список заявленных команд на Mazowieckie Syreny Lite — 6–7 июня 2026, Варшава",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <ParticipantsClient />;
}
