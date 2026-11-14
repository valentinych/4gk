import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import {
  OCHP_REGISTRATION_YEAR,
  ochpYearHref,
  parseKnownOchpYearSlug,
} from "@/lib/ochp-seasons";

const PROGRAM = [
  "105 вопросов ЧГК (Иванов, Карпук, Лёгенький,  Мерзликин, Мерзляков, Рождествин, Саксонов)",
  "Дневные субботние игры (мы пока работаем над программой в связи с новым местом)",
  'Вечерняя "тёмная" программа в субботу',
  "в пятницу - синхрон вечером прямо в МПИ (за небольшую доплату)",
  "в пятницу мы предложим принять участие в бесплатных экскурсиях.",
];

const QUOTAS = [
  "25 мест для польских команд (игроки - имеют легализацию или ждут её; не более одного легионера). Места распределяются по рейтингу.",
  "25 мест - рейтинг общий для всех (релиз 31.12.2026)",
  "5 мест - первые заявившиеся",
  "5 мест - вайлд-кард",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (parseKnownOchpYearSlug(slug) !== OCHP_REGISTRATION_YEAR) return {};
  return {
    title: "О турнире",
    description: "Программа, время, оргвзнос и квоты Открытого чемпионата Польши 2027.",
  };
}

export default async function OchpAboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (parseKnownOchpYearSlug(slug) !== OCHP_REGISTRATION_YEAR) notFound();

  return (
    <div id="page-ochp-about" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href={ochpYearHref(OCHP_REGISTRATION_YEAR)}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Назад к ОЧП
      </Link>
      <div id="page-ochp-about-header" className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">О турнире</h1>
        <Image
          src="/ochp-logo.png"
          alt=""
          width={56}
          height={70}
          className="hidden shrink-0 sm:block"
        />
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-surface p-6" aria-labelledby="ochp-about-program">
          <h2 id="ochp-about-program" className="mb-3 text-base font-bold">
            В программе
          </h2>
          <ul className="space-y-2">
            {PROGRAM.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm leading-relaxed">
                <span className="mt-1.5 text-xs text-accent" aria-hidden="true">
                  ●
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6" aria-labelledby="ochp-about-time">
          <h2 id="ochp-about-time" className="mb-3 flex items-center gap-2 text-base font-bold">
            <Clock className="h-4 w-4 text-muted" aria-hidden="true" />
            Время
          </h2>
          <p className="text-sm leading-relaxed">
            Время начала основной программы ОЧП: 17.04.2027, 11.00
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Время окончания: 18.04.2027, не позднее 16.00
          </p>
        </section>

        <p className="text-sm leading-relaxed">
          С Регламентом и окончательной Программой турнира можно будет ознакомиться ближе к весне.
        </p>

        <section className="rounded-xl border border-border bg-surface p-6" aria-labelledby="ochp-about-fee">
          <h2 id="ochp-about-fee" className="mb-3 text-base font-bold">
            Оргвзнос
          </h2>
          <p className="text-sm leading-relaxed">
            Оргвзнос: 1350 zł или 300 euro (уплаченный вовремя и 360 евро - не вовремя).
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Его нужно сдать до 1 февраля, согласовав с оргкомитетом варианты передачи (вам напишут).
          </p>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6" aria-labelledby="ochp-about-deadlines">
          <h2 id="ochp-about-deadlines" className="mb-3 text-base font-bold">
            Заявки
          </h2>
          <p className="text-sm leading-relaxed">
            Формирование общего списка и приём заявок по квотам - до 1 января. Далее тоже можно будет
            заявляться, но только в лист ожидания.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6" aria-labelledby="ochp-about-quotas">
          <h2 id="ochp-about-quotas" className="mb-3 text-base font-bold">
            Квоты (по порядку)
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            {QUOTAS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
