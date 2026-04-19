import { NextResponse } from "next/server";

const BASE = "https://api.rating.chgk.info";

async function fetchPlayers(
  params: { name?: string; surname?: string },
  limit = 15,
): Promise<unknown[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (params.name)    qs.set("name",    params.name);
  if (params.surname) qs.set("surname", params.surname);
  try {
    const res = await fetch(`${BASE}/players?${qs}`, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items ?? []);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type") ?? "player"; // "player" | "team"

  if (!q) return NextResponse.json([]);

  try {
    // ── Team search ───────────────────────────────────────────────────────────
    if (type === "team") {
      const isId = /^\d+$/.test(q);
      if (isId) {
        const res = await fetch(`${BASE}/teams/${q}.json`, { next: { revalidate: 0 } });
        if (!res.ok) return NextResponse.json([]);
        return NextResponse.json([await res.json()]);
      }
      const res = await fetch(
        `${BASE}/teams?name=${encodeURIComponent(q)}&limit=10`,
        { next: { revalidate: 0 } },
      );
      if (!res.ok) return NextResponse.json([]);
      const data = await res.json();
      return NextResponse.json(Array.isArray(data) ? data : (data.items ?? []));
    }

    // ── Player search ─────────────────────────────────────────────────────────
    // Direct ID lookup
    if (/^\d+$/.test(q)) {
      const res = await fetch(`${BASE}/players/${q}.json`, { next: { revalidate: 0 } });
      if (!res.ok) return NextResponse.json([]);
      return NextResponse.json([await res.json()]);
    }

    const parts = q.split(/\s+/).filter(Boolean);
    let results: unknown[];

    if (parts.length === 1) {
      // Single token: search as surname AND as name in parallel, merge
      const [bySurname, byName] = await Promise.all([
        fetchPlayers({ surname: parts[0] }),
        fetchPlayers({ name: parts[0] }),
      ]);
      const seen = new Set<number>();
      results = [];
      for (const p of [...bySurname, ...byName] as { id: number }[]) {
        if (!seen.has(p.id)) { seen.add(p.id); (results as typeof p[]).push(p); }
      }
    } else {
      // Multiple tokens: "Имя Фам" → try name=Имя&surname=Фам AND surname=Имя&name=Фам
      const first = parts[0];
      const rest  = parts.slice(1).join(" ");
      const [r1, r2] = await Promise.all([
        fetchPlayers({ name: first, surname: rest }),   // "Аким М…"
        fetchPlayers({ surname: first, name: rest }),   // flipped, just in case
      ]);
      const seen = new Set<number>();
      results = [];
      for (const p of [...r1, ...r2] as { id: number }[]) {
        if (!seen.has(p.id)) { seen.add(p.id); (results as typeof p[]).push(p); }
      }
    }

    return NextResponse.json((results as unknown[]).slice(0, 20));
  } catch {
    return NextResponse.json([]);
  }
}
