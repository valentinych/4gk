import { Suspense } from "react";
import type { Metadata } from "next";
import { WithdrawClient } from "./WithdrawClient";

export const metadata: Metadata = {
  title: "Отзыв заявки | Syrenki Mazowieckie Lite",
  description: "Отзыв заявки команды на турнир Syrenki Mazowieckie Lite",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WithdrawClient />
    </Suspense>
  );
}
