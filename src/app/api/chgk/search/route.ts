import { NextResponse } from "next/server";

const BASE = "https://api.rating.chgk.info";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type") ?? "player"; // "player" | "team"

  if (!q) return NextResponse.json([]);

  try {
    if (type === "team") {
      const isId = /^\d+$/.test(q);
      if (isId) {
        const res = await fetch(`${BASE}/teams/${q}.json`, { next: { revalidate: 0 } });
        if (!res.ok) return NextResponse.json([]);
        const team = await res.json();
        return NextResponse.json([team]);
      }
      const res = await fetch(
        `${BASE}/teams?name=${encodeURIComponent(q)}&limit=10`,
        { next: { revalidate: 0 } },
      );
      if (!res.ok) return NextResponse.json([]);
      const data = await res.json();
      return NextResponse.json(Array.isArray(data) ? data : (data.items ?? []));
    }

    // player search
    const isId = /^\d+$/.test(q);
    if (isId) {
      const res = await fetch(`${BASE}/players/${q}.json`, { next: { revalidate: 0 } });
      if (!res.ok) return NextResponse.json([]);
      const player = await res.json();
      return NextResponse.json([player]);
    }
    const res = await fetch(
      `${BASE}/players?surname=${encodeURIComponent(q)}&limit=15`,
      { next: { revalidate: 0 } },
    );
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : (data.items ?? []));
  } catch {
    return NextResponse.json([]);
  }
}
