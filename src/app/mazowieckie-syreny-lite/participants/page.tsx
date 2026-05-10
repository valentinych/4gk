import type { Metadata } from "next";
import { ParticipantsClient } from "./ParticipantsClient";

export const metadata: Metadata = {
  title: "Список команд | Syrenki Mazowieckie Lite",
  description: "Список заявленных команд на Syrenki Mazowieckie Lite — 6–7 июня 2026, Варшава",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <ParticipantsClient />;
}
