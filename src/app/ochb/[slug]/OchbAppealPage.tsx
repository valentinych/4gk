import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth";
import {
  OCHB_APPEAL_KIND_LABELS,
  loadOchbAppealAdmin,
  loadOchbAppealGraveyard,
  loadOchbAppealLeaders,
  loadOchbAppealMine,
  loadOchbAppealMineByPlayer,
  resolveOchbAppealPageAccess,
} from "@/lib/ochb-appeals";
import {
  OchbAppealAdminTable,
  OchbAppealVerdictMark,
} from "./OchbAppealAdminTable";
import { OchbAppealForm } from "./OchbAppealForm";

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
    <GateMessage id="page-ochb-appeals-no-id">
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
  items: Awaited<ReturnType<typeof loadOchbAppealMine>>;
}) {
  return (
    <section id="page-ochb-appeals-mine" className="space-y-3">
      <h2 className="text-lg font-bold">Мои апелляции</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Пока нет поданных апелляций.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`space-y-3 overflow-hidden rounded-xl border border-border px-4 py-3 text-sm ${item.trashed ? "bg-surface-hover text-muted" : "bg-surface"}`}
            >
              <div className="flex gap-3">
                <OchbAppealVerdictMark status={item.status} />
                <p>
                  <span className="text-muted">
                    {OCHB_APPEAL_KIND_LABELS[item.kind]}
                  </span>{" "}
                  <span className="font-mono tabular-nums text-muted">
                    {item.questionNumber}.
                  </span>{" "}
                  {item.answerText}
                  {item.trashed ? (
                    <span className="ml-2 text-xs font-medium text-muted">
                      На кладбище
                    </span>
                  ) : null}
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

export async function OchbAppealPage() {
  await cookies();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <NoIdMessage />;
  }

  const access = await resolveOchbAppealPageAccess(session.user.id);

  if (access.gate === "no-id") {
    return <NoIdMessage />;
  }

  if (access.gate === "not-in-roster") {
    return (
      <GateMessage id="page-ochb-appeals-not-in-roster">
        Состав вашей команды не подан либо вы не находитесь в поданном составе вашей
        команды. Подать состав можно здесь:{" "}
        <Link href="/ochb/roster" className="font-medium text-accent hover:underline">
          https://4gk.pl/ochb/roster
        </Link>
      </GateMessage>
    );
  }

  const [adminRows, graveyardRows, mineItems, leaders] = await Promise.all([
    access.isPageAdmin ? loadOchbAppealAdmin() : Promise.resolve(null),
    access.isPageAdmin ? loadOchbAppealGraveyard() : Promise.resolve(null),
    access.teamChgkId
      ? loadOchbAppealMine(access.teamChgkId)
      : access.isPageAdmin
        ? loadOchbAppealMineByPlayer(access.chgkId)
        : Promise.resolve(null),
    access.canGraveyard ? loadOchbAppealLeaders() : Promise.resolve(null),
  ]);

  return (
    <div id="page-ochb-appeals" className="space-y-8">
      {access.canSubmit ? <OchbAppealForm /> : null}
      {adminRows ? (
        <OchbAppealAdminTable
          initialRows={adminRows}
          initialGraveyard={graveyardRows ?? []}
          canGraveyard={access.canGraveyard}
          canUnlock={access.canUnlock}
          leaders={leaders}
        />
      ) : null}
      {mineItems ? <MineList items={mineItems} /> : null}
    </div>
  );
}
