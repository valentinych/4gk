import { Suspense } from "react";
import type { Metadata } from "next";
import { WithdrawClient } from "./WithdrawClient";

export const metadata: Metadata = {
  title: "Отзыв заявки | Mazowieckie Syreny Lite",
  description: "Отзыв заявки команды на турнир Mazowieckie Syreny Lite",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WithdrawClient />
    </Suspense>
  );
}
