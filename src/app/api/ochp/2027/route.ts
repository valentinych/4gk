import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  deleteOchp2027Tests,
  isOchpDbUnavailable,
  loadOchp2027,
  Ochp2027HttpError,
  setOchp2027OpensAt,
  submitOchp2027,
} from "@/lib/ochp-2027";

export const dynamic = "force-dynamic";

function fail(e: unknown, fallback: string) {
  if (e instanceof Ochp2027HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  if (isOchpDbUnavailable(e)) {
    return NextResponse.json({ error: "Приём заявок сейчас недоступен" }, { status: 503 });
  }
  console.error(e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    return NextResponse.json(await loadOchp2027(session));
  } catch (e) {
    return fail(e, "Не удалось загрузить заявки");
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = (await req.json()) as Record<string, unknown>;
    await submitOchp2027(session, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e, "Не удалось сохранить заявку");
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = (await req.json()) as { opensAt?: unknown };
    await setOchp2027OpensAt(session, body.opensAt);
    return NextResponse.json(await loadOchp2027(session));
  } catch (e) {
    return fail(e, "Не удалось сохранить время");
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const all = url.searchParams.get("all") === "1";
    await deleteOchp2027Tests(session, id, all);
    return NextResponse.json(await loadOchp2027(session));
  } catch (e) {
    return fail(e, "Не удалось удалить тестовую заявку");
  }
}
