import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth";
import { resolveOchchControversialAccess } from "@/lib/ochch-controversial";
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

export async function OchchControversialPage() {
  await cookies();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <NoIdMessage />;
  }

  const access = await resolveOchchControversialAccess(session.user.id);

  if (!access.ok && access.reason === "no-id") {
    return <NoIdMessage />;
  }

  if (!access.ok) {
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

  return (
    <div id="page-ochch-controversial" className="space-y-4">
      <OchchControversialForm />
    </div>
  );
}
