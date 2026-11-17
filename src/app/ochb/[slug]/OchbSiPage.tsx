import { ExternalLink } from "lucide-react";
import { SHEET_ACCESS_ERROR } from "@/lib/google-sheets";
import { loadOchbSi, OCHB_SI_VIEW_URL, type OchbSiBoard as Board } from "@/lib/ochb-si";
import { OchbSiBoard } from "./OchbSiBoard";

export async function OchbSiPage() {
  let board: Board | null = null;
  let message = SHEET_ACCESS_ERROR;
  try {
    board = await loadOchbSi();
  } catch (e) {
    if (e instanceof Error && e.message) message = e.message;
  }
  if (!board) {
    return (
      <div id="page-ochb-results-si" className="space-y-3">
        <p className="text-sm text-red-600">{message}</p>
        <a
          href={OCHB_SI_VIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          Google Sheets <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }
  return <OchbSiBoard board={board} />;
}
