"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, Mail, Calendar, Shield } from "lucide-react";

export default function AccountPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <h1 className="text-xl font-bold">Вы не авторизованы</h1>
        <p className="mt-2 text-sm text-muted">Войдите чтобы увидеть свой профиль</p>
        <Link
          href="/auth/signin"
          className="mt-6 rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Войти
        </Link>
      </div>
    );
  }

  const user = session.user;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Аккаунт</h1>
      <p className="mt-1 text-sm text-muted">Управление профилем</p>

      {/* Profile Card */}
      <div className="mt-8 rounded-xl border border-border bg-white p-6">
        <div className="flex items-center gap-4">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? ""}
              width={64}
              height={64}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl font-bold text-white">
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{user.name}</h2>
            <p className="text-sm text-muted truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-4 rounded-xl border border-border bg-white divide-y divide-border">
        <div className="flex items-center gap-3 px-5 py-4">
          <Mail className="h-4 w-4 text-muted shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted">Email</p>
            <p className="text-sm font-medium truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <Shield className="h-4 w-4 text-muted shrink-0" />
          <div>
            <p className="text-xs text-muted">Провайдер</p>
            <p className="text-sm font-medium">Google</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <Calendar className="h-4 w-4 text-muted shrink-0" />
          <div>
            <p className="text-xs text-muted">ID пользователя</p>
            <p className="text-sm font-mono text-muted">{user.id}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
