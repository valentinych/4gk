import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth";
import {
  loadOchbControversialAdmin,
  loadOchbControversialGraveyard,
  loadOchbControversialLeaders,
  loadOchbControversialMine,
  loadOchbControversialMineByPlayer,
  resolveOchbControversialPageAccess,
} from "@/lib/ochb-controversial";
import { OchbControversialAutoRefresh } from "./OchbControversialAutoRefresh";
import {
  OchbControversialAdminTable,
  OchbControversialVerdictMark,
} from "./OchbControversialAdminTable";
import { OchbControversialForm } from "./OchbControversialForm";

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
    <GateMessage id="page-ochb-controversial-no-id">
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
  items: Awaited<ReturnType<typeof loadOchbControversialMine>>;
}) {
  return (
    <section id="page-ochb-controversial-mine" className="space-y-3">
      <h2 className="text-lg font-bold">Мои спорные</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Пока нет поданных спорных.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 px-4 py-3 text-sm">
              <OchbControversialVerdictMark status={item.status} />
              <div className="min-w-0">
                <p>
                  <span className="font-mono tabular-nums text-muted">
                    {item.questionNumber}.
                  </span>{" "}
                  {item.answerText}
                </p>
                {item.rationale ? (
                  <p className="mt-1 text-muted">{item.rationale}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export async function OchbControversialPage() {
  await cookies();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <NoIdMessage />;
  }

  const access = await resolveOchbControversialPageAccess(session.user.id);

  if (access.gate === "no-id") {
    return <NoIdMessage />;
  }

  if (access.gate === "not-in-roster") {
    return (
      <GateMessage id="page-ochb-controversial-not-in-roster">
        Состав вашей команды не подан либо вы не находитесь в поданном составе вашей
        команды. Подать состав можно здесь:{" "}
        <Link href="/ochb/roster" className="font-medium text-accent hover:underline">
          https://4gk.pl/ochb/roster
        </Link>
      </GateMessage>
    );
  }

  const scope = access.moderationScope;
  const [adminRows, graveyardRows, mineItems, leaders] = await Promise.all([
    scope ? loadOchbControversialAdmin(scope) : Promise.resolve(null),
    scope ? loadOchbControversialGraveyard(scope) : Promise.resolve(null),
    access.teamChgkId
      ? loadOchbControversialMine(access.teamChgkId)
      : access.chgkId != null && access.isPageAdmin
        ? loadOchbControversialMineByPlayer(access.chgkId)
        : Promise.resolve(null),
    access.canGraveyard && scope
      ? loadOchbControversialLeaders(scope)
      : Promise.resolve(null),
  ]);

  return (
    <div id="page-ochb-controversial" className="space-y-8">
      <OchbControversialAutoRefresh />
      {access.canSubmit ? (
        <OchbControversialForm
          minQuestion={
            access.moderationScope?.kind === "range"
              ? access.moderationScope.from
              : undefined
          }
          maxQuestion={
            access.moderationScope?.kind === "range"
              ? access.moderationScope.to
              : undefined
          }
        />
      ) : null}
      {adminRows ? (
        <OchbControversialAdminTable
          initialRows={adminRows}
          initialGraveyard={graveyardRows ?? []}
          canGraveyard={access.canGraveyard}
          canUnlock={access.canUnlock}
          leaders={leaders}
          questionRange={
            access.moderationScope?.kind === "range"
              ? {
                  from: access.moderationScope.from,
                  to: access.moderationScope.to,
                }
              : null
          }
        />
      ) : null}
      {mineItems ? <MineList items={mineItems} /> : null}
    </div>
  );
}
