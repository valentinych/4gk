import { ExternalLink } from "lucide-react";
import { SHEET_ACCESS_ERROR } from "@/lib/google-sheets";
import {
  loadOchbQuiz,
  OCHB_QUIZ_VIEW_URL,
  type OchbQuizBoard as Board,
} from "@/lib/ochb-quiz";
import { OchbQuizBoard } from "./OchbQuizBoard";

export async function OchbQuizPage() {
  let board: Board | null = null;
  let message = SHEET_ACCESS_ERROR;
  try {
    board = await loadOchbQuiz();
  } catch (e) {
    if (e instanceof Error && e.message) message = e.message;
  }
  if (!board) {
    return (
      <div id="page-ochb-results-quiz" className="space-y-3">
        <p className="text-sm text-red-600">{message}</p>
        <a
          href={OCHB_QUIZ_VIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          Google Sheets <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }
  return <OchbQuizBoard board={board} />;
}
