import { ExternalLink } from "lucide-react";
import {
  OCHB_REGLAMENT_BLOCKS,
  OCHB_REGLAMENT_DOC_URL,
  type OchbReglamentRun,
} from "@/lib/ochb-reglament";

function Runs({ runs }: { runs: OchbReglamentRun[] }) {
  return runs.map((run, index) => {
    if (typeof run === "string") return <span key={index}>{run}</span>;
    if ("break" in run) return <br key={index} />;
    if ("bold" in run) {
      return (
        <strong key={index} className="font-semibold">
          {run.bold}
        </strong>
      );
    }
    return (
      <a key={index} href={run.href} className="text-accent hover:underline">
        {run.href}
      </a>
    );
  });
}

export function OchbReglamentPage() {
  return (
    <div id="page-ochb-reglament" className="space-y-3 text-sm leading-relaxed">
      <p className="text-muted">
        <a
          href={OCHB_REGLAMENT_DOC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-accent hover:underline"
        >
          Google Документ
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </p>
      {OCHB_REGLAMENT_BLOCKS.map((block, index) => {
        if ("heading" in block) {
          return (
            <h2 key={index} className="pt-3 text-base font-semibold tracking-tight">
              <Runs runs={block.heading} />
            </h2>
          );
        }
        if ("items" in block) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Runs runs={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index}>
            <Runs runs={block.text} />
          </p>
        );
      })}
    </div>
  );
}
