import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth";
import {
  loadOchchControversialAdmin,
  loadOchchControversialGraveyard,
  loadOchchControversialLeaders,
  loadOchchControversialMine,
  loadOchchControversialMineByPlayer,
  resolveOchchControversialPageAccess,
} from "@/lib/ochch-controversial";
import { OchchControversialAutoRefresh } from "./OchchControversialAutoRefresh";
import {
  OchchControversialAdminTable,
  OchchControversialVerdictMark,
} from "./OchchControversialAdminTable";
import { OchchControversialForm } from "./OchchControversialForm";

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
    <GateMessage id="page-ochch-controversial-no-id">
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
  items: Awaited<ReturnType<typeof loadOchchControversialMine>>;
}) {
  return (
    <section id="page-ochch-controversial-mine" className="space-y-3">
      <h2 className="text-lg font-bold">Мои спорные</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Пока нет поданных спорных.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 px-4 py-3 text-sm">
              <OchchControversialVerdictMark status={item.status} />
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

export async function OchchControversialPage() {
  await cookies();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <NoIdMessage />;
  }

  const access = await resolveOchchControversialPageAccess(session.user.id);

  if (access.gate === "no-id") {
    return <NoIdMessage />;
  }

  if (access.gate === "not-in-roster") {
    return (
      <GateMessage id="page-ochch-controversial-not-in-roster">
        Состав вашей команды не подан либо вы не находитесь в поданном составе вашей
        команды. Подать состав можно здесь:{" "}
        <Link href="/ochch/roster" className="font-medium text-accent hover:underline">
          https://4gk.pl/ochch/roster
        </Link>
      </GateMessage>
    );
  }

  const [adminRows, graveyardRows, mineItems, leaders] = await Promise.all([
    access.isPageAdmin ? loadOchchControversialAdmin() : Promise.resolve(null),
    access.isPageAdmin ? loadOchchControversialGraveyard() : Promise.resolve(null),
    access.teamChgkId
      ? loadOchchControversialMine(access.teamChgkId)
      : access.isPageAdmin
        ? loadOchchControversialMineByPlayer(access.chgkId)
        : Promise.resolve(null),
    access.canGraveyard ? loadOchchControversialLeaders() : Promise.resolve(null),
  ]);

  return (
    <div id="page-ochch-controversial" className="space-y-8">
      <OchchControversialAutoRefresh />
      {access.canSubmit ? <OchchControversialForm /> : null}
      {adminRows ? (
        <OchchControversialAdminTable
          initialRows={adminRows}
          initialGraveyard={graveyardRows ?? []}
          canGraveyard={access.canGraveyard}
          leaders={leaders}
        />
      ) : null}
      {mineItems ? <MineList items={mineItems} /> : null}
    </div>
  );
}
