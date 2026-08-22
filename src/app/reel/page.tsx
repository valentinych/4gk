import type { Metadata } from "next";
import { ReelClient } from "./ReelClient";

export const metadata: Metadata = {
  title: "Reel",
  robots: { index: false, follow: false },
};

export default function ReelPage() {
  return <ReelClient />;
}
