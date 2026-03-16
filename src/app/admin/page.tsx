"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Shield,
  ShieldOff,
  Link2,
  Unlink,
  Loader2,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  chgkId: number | null;
  role: "PLAYER" | "ADMIN";
  createdAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingChgk, setEditingChgk] = useState<string | null>(null);
  const [chgkInput, setChgkInput] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") fetchUsers();
  }, [session, fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (session?.user?.role === "ADMIN") fetchUsers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, session, fetchUsers]);

  async function updateUser(id: string, data: Record<string, unknown>) {
    setSaving(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Ошибка");
        return;
      }
      const updated: UserRow = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      setEditingChgk(null);
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(null);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <h1 className="text-xl font-bold">Доступ запрещён</h1>
        <p className="mt-2 text-sm text-muted">У вас нет прав администратора</p>
        <Link
          href="/"
          className="mt-6 rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          На главную
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/account" className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Управление</h1>
          <p className="mt-0.5 text-sm text-muted">Пользователи портала</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium hover:underline">✕</button>
        </div>
      )}

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Поиск по имени или email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wider">
              <th className="px-4 py-3 font-medium">Пользователь</th>
              <th className="px-4 py-3 font-medium">Rating ID</th>
              <th className="px-4 py-3 font-medium">Роль</th>
              <th className="px-4 py-3 font-medium">Регистрация</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  Пользователи не найдены
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.image ? (
                        <Image src={u.image} alt="" width={32} height={32} className="rounded-full shrink-0" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                          {u.name?.[0]?.toUpperCase() ?? "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.name || "—"}</p>
                        <p className="text-xs text-muted truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {editingChgk === u.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={chgkInput}
                          onChange={(e) => setChgkInput(e.target.value)}
                          placeholder="ID"
                          className="w-24 rounded-md border border-border px-2 py-1 text-sm outline-none focus:border-accent"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const id = parseInt(chgkInput, 10);
                            if (id > 0) updateUser(u.id, { chgkId: id });
                          }}
                          disabled={saving === u.id}
                          className="rounded-md p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"
                        >
                          {saving === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => setEditingChgk(null)}
                          className="rounded-md p-1 text-muted hover:bg-surface"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {u.chgkId ? (
                          <>
                            <a
                              href={`https://rating.chgk.info/player/${u.chgkId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:underline font-mono"
                            >
                              {u.chgkId}
                            </a>
                            <button
                              onClick={() => updateUser(u.id, { chgkId: null })}
                              disabled={saving === u.id}
                              className="rounded-md p-1 text-muted hover:text-danger hover:bg-red-50 disabled:opacity-50"
                              title="Отвязать"
                            >
                              {saving === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingChgk(u.id);
                              setChgkInput("");
                            }}
                            className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Привязать
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateUser(u.id, { role: u.role === "ADMIN" ? "PLAYER" : "ADMIN" })}
                      disabled={saving === u.id || u.id === session.user.id}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        u.role === "ADMIN"
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={u.id === session.user.id ? "Нельзя изменить свою роль" : u.role === "ADMIN" ? "Снять админа" : "Назначить админом"}
                    >
                      {saving === u.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : u.role === "ADMIN" ? (
                        <Shield className="h-3 w-3" />
                      ) : (
                        <ShieldOff className="h-3 w-3" />
                      )}
                      {u.role === "ADMIN" ? "Admin" : "Player"}
                    </button>
                  </td>

                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        Всего пользователей: {users.length}
      </p>
    </div>
  );
}
