import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth";
import {
  OCHCH_APPEAL_KIND_LABELS,
  loadOchchAppealAdmin,
  loadOchchAppealGraveyard,
  loadOchchAppealMine,
  loadOchchAppealMineByPlayer,
  resolveOchchAppealPageAccess,
} from "@/lib/ochch-appeals";
import {
  OchchAppealAdminTable,
  OchchAppealVerdictMark,
} from "./OchchAppealAdminTable";
import { OchchAppealForm } from "./OchchAppealForm";

function GateMessage({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950"
    >
      {children}
    </div>
  );
}

function NoIdMessage() {
  return (
    <GateMessage id="page-ochch-appeals-no-id">
      Привяжите свой ID на странице{" "}
      <Link href="/account" className="font-medium text-accent hover:underline">
        https://4gk.pl/account
      </Link>
    </GateMessage>
  );
}

function MineList({
  items,
}: {
  items: Awaited<ReturnType<typeof loadOchchAppealMine>>;
}) {
  return (
    <section id="page-ochch-appeals-mine" className="space-y-3">
      <h2 className="text-lg font-bold">Мои апелляции</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Пока нет поданных апелляций.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="space-y-3 overflow-hidden rounded-xl border border-border bg-surface px-4 py-3 text-sm"
            >
              <div className="flex gap-3">
                <OchchAppealVerdictMark status={item.status} />
                <p>
                  <span className="text-muted">
                    {OCHCH_APPEAL_KIND_LABELS[item.kind]}
                  </span>{" "}
                  <span className="font-mono tabular-nums text-muted">
                    {item.questionNumber}.
                  </span>{" "}
                  {item.answerText}
                </p>
              </div>
              <div className="w-full">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  Аргументация
                </p>
                <p className="mt-1.5 whitespace-pre-wrap">{item.argumentation}</p>
              </div>
              {item.adminRationale ? (
                <div className="w-full">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    Обоснование жюри
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap">{item.adminRationale}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export async function OchchAppealPage() {
  await cookies();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <NoIdMessage />;
  }

  const access = await resolveOchchAppealPageAccess(session.user.id);

  if (access.gate === "no-id") {
    return <NoIdMessage />;
  }

  if (access.gate === "not-in-roster") {
    return (
      <GateMessage id="page-ochch-appeals-not-in-roster">
        Состав вашей команды не подан либо вы не находитесь в поданном составе вашей
        команды. Подать состав можно здесь:{" "}
        <Link href="/ochch/roster" className="font-medium text-accent hover:underline">
          https://4gk.pl/ochch/roster
        </Link>
      </GateMessage>
    );
  }

  const [adminRows, graveyardRows, mineItems] = await Promise.all([
    access.isPageAdmin ? loadOchchAppealAdmin() : Promise.resolve(null),
    access.isPageAdmin ? loadOchchAppealGraveyard() : Promise.resolve(null),
    access.teamChgkId
      ? loadOchchAppealMine(access.teamChgkId)
      : access.isPageAdmin
        ? loadOchchAppealMineByPlayer(access.chgkId)
        : Promise.resolve(null),
  ]);

  return (
    <div id="page-ochch-appeals" className="space-y-8">
      {access.canSubmit ? <OchchAppealForm /> : null}
      {adminRows ? (
        <OchchAppealAdminTable
          initialRows={adminRows}
          initialGraveyard={graveyardRows ?? []}
        />
      ) : null}
      {mineItems ? <MineList items={mineItems} /> : null}
    </div>
  );
}
