"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const REFRESH_MS = 60_000;
const TICK_MS = 1_000;

export function OchchControversialAutoRefresh() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_MS / TICK_MS);

  useEffect(() => {
    let left = REFRESH_MS / TICK_MS;
    const id = setInterval(() => {
      if (document.hidden) return;
      left -= 1;
      if (left <= 0) {
        router.refresh();
        left = REFRESH_MS / TICK_MS;
      }
      setSecondsLeft(left);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <p
      id="page-ochch-controversial-refresh"
      className="text-sm text-muted tabular-nums"
    >
      Обновление через {secondsLeft} с
    </p>
  );
}
