"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ExternalLink, Link2, Unlink, Loader2, Trophy, Users, Hash } from "lucide-react";

interface ChgkPlayer {
  id: number;
  name: string;
  patronymic: string;
  surname: string;
  gotQuestionsTag: number | null;
}

interface ChgkTeam {
  id: number;
  name: string;
  town?: { id: number; name: string; country?: { id: number; name: string } };
}

interface SeasonEntry {
  idplayer: number;
  idseason: number;
  idteam: number;
}

export default function ChgkProfile() {
  const { data: session, update } = useSession();
  const chgkId = session?.user?.chgkId;

  const [inputId, setInputId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [player, setPlayer] = useState<ChgkPlayer | null>(null);
  const [currentTeam, setCurrentTeam] = useState<ChgkTeam | null>(null);
  const [tournamentsCount, setTournamentsCount] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (id: number) => {
    setProfileLoading(true);
    try {
      const [playerRes, seasonsRes, tournamentsRes] = await Promise.all([
        fetch(`https://api.rating.chgk.info/players/${id}.json`),
        fetch(`https://api.rating.chgk.info/players/${id}/seasons.json`),
        fetch(`https://api.rating.chgk.info/players/${id}/tournaments.json`),
      ]);

      if (playerRes.ok) {
        const p: ChgkPlayer = await playerRes.json();
        setPlayer(p);
      }

      if (tournamentsRes.ok) {
        const t = await tournamentsRes.json();
        setTournamentsCount(Array.isArray(t) ? t.length : 0);
      }

      if (seasonsRes.ok) {
        const seasons: SeasonEntry[] = await seasonsRes.json();
        if (seasons.length > 0) {
          const latest = seasons.sort((a, b) => b.idseason - a.idseason)[0];
          const teamRes = await fetch(`https://api.rating.chgk.info/teams/${latest.idteam}.json`);
          if (teamRes.ok) {
            setCurrentTeam(await teamRes.json());
          }
        }
      }
    } catch {
      /* API unavailable, keep whatever we have */
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (chgkId) loadProfile(chgkId);
  }, [chgkId, loadProfile]);

  async function linkAccount() {
    const id = parseInt(inputId, 10);
    if (!id || id <= 0) {
      setError("Введите корректный числовой ID");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/account/chgk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chgkId: id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка привязки");
        return;
      }

      await update();
      setInputId("");
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  async function unlinkAccount() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/account/chgk", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка отвязки");
        return;
      }

      setPlayer(null);
      setCurrentTeam(null);
      setTournamentsCount(0);
      await update();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  if (!chgkId) {
    return (
      <div className="rounded-xl border border-border bg-white p-6">
        <h3 className="text-sm font-bold tracking-tight">Рейтинг ЧГК</h3>
        <p className="mt-1 text-xs text-muted">
          Привяжите свой профиль с{" "}
          <a
            href="https://rating.chgk.info"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            rating.chgk.info
          </a>{" "}
          для отображения статистики
        </p>

        <div className="mt-4 flex gap-2">
          <input
            type="number"
            placeholder="ID игрока (напр. 23294)"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={linkAccount}
            disabled={loading || !inputId}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Привязать
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  if (profileLoading && !player) {
    return (
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка профиля ЧГК…
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="text-sm font-bold tracking-tight">Рейтинг ЧГК</h3>
        <a
          href={`https://rating.chgk.info/player/${chgkId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          rating.chgk.info
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {player && (
        <div className="px-5 pt-4 pb-2">
          <p className="text-lg font-bold">
            {player.surname} {player.name} {player.patronymic}
          </p>
        </div>
      )}

      <div className="divide-y divide-border">
        <div className="flex items-center gap-3 px-5 py-3">
          <Hash className="h-4 w-4 text-muted shrink-0" />
          <div>
            <p className="text-xs text-muted">ID игрока</p>
            <p className="text-sm font-medium">{chgkId}</p>
          </div>
        </div>

        {currentTeam && (
          <div className="flex items-center gap-3 px-5 py-3">
            <Users className="h-4 w-4 text-muted shrink-0" />
            <div>
              <p className="text-xs text-muted">Текущая команда</p>
              <p className="text-sm font-medium">
                {currentTeam.name}
                {currentTeam.town && (
                  <span className="text-muted font-normal"> — {currentTeam.town.name}</span>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-5 py-3">
          <Trophy className="h-4 w-4 text-muted shrink-0" />
          <div>
            <p className="text-xs text-muted">Турниров сыграно</p>
            <p className="text-sm font-medium">{tournamentsCount}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-5 py-3">
        <button
          onClick={unlinkAccount}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-danger transition-colors"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
          Отвязать профиль
        </button>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
