"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toaster";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MapPin,
  ExternalLink,
  Plus,
  X,
  Loader2,
  Trash2,
  Megaphone,
  Pencil,
  LayoutTemplate,
  Users,
  CheckCircle2,
  Download,
} from "lucide-react";
import {
  getCityColor,
  EVENT_TYPES,
  CITY_OPTIONS,
  type CalendarEvent,
} from "@/data/calendar";

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const TYPE_LABELS: Record<string, string> = {
  "multi-day": "Многодневный",
  "one-day": "Однодневный",
  "sync-chgk": "Синхрон ЧГК",
  "si": "ИСИ",
  "brain-ring": "Брейн-Ринг",
  "other": "Другое",
  tournament: "Турнир",
  sync: "Синхрон",
  league: "Лига",
};

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toDateKey(isoOrDateStr: string) {
  return isoOrDateStr.slice(0, 10);
}

function parseDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function eachDay(start: string, end?: string | null): string[] {
  const startKey = toDateKey(start);
  const days: string[] = [startKey];
  if (!end) return days;
  const endKey = toDateKey(end);
  const s = parseDate(startKey);
  const e = parseDate(endKey);
  const cur = new Date(s);
  cur.setDate(cur.getDate() + 1);
  while (cur <= e) {
    days.push(dateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function buildEventMap(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    for (const day of eachDay(ev.startDate, ev.endDate)) {
      const list = map.get(day) ?? [];
      list.push(ev);
      map.set(day, list);
    }
  }
  return map;
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  let startDay = first.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const remainder = cells.length % 7;
  if (remainder) {
    for (let i = 0; i < 7 - remainder; i++) cells.push(null);
  }
  return cells;
}

function formatEventDateTime(
  start: string,
  end?: string | null,
  startTime?: string | null,
  endTime?: string | null,
) {
  const s = parseDate(start);
  const e = end ? parseDate(end) : null;

  const sameDay = !e || (s.getTime() === e.getTime());
  const sameMonth = e && s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();

  if (sameDay) {
    let result = `${s.getDate()} ${MONTHS_GEN[s.getMonth()]}`;
    if (startTime) {
      result += ` ${startTime}`;
      if (endTime) result += `–${endTime}`;
    }
    return result;
  }

  if (startTime || endTime) {
    const startStr = `${s.getDate()} ${MONTHS_GEN[s.getMonth()]}${startTime ? ` ${startTime}` : ""}`;
    const endStr = `${e!.getDate()} ${MONTHS_GEN[e!.getMonth()]}${endTime ? ` ${endTime}` : ""}`;
    return `${startStr} – ${endStr}`;
  }

  if (sameMonth) {
    return `${s.getDate()}–${e!.getDate()} ${MONTHS_GEN[s.getMonth()]}`;
  }
  return `${s.getDate()} ${MONTHS_GEN[s.getMonth()]} – ${e!.getDate()} ${MONTHS_GEN[e!.getMonth()]}`;
}

const emptyForm = {
  title: "",
  type: "one-day",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  city: "Варшава",
  venue: "",
  venueMapUrl: "",
  description: "",
  registrationLink: "",
  mediaLink: "",
  mediaLinkLabel: "",
};

interface Template {
  id: string;
  name: string;
  title?: string | null;
  type?: string | null;
  city?: string | null;
  venue?: string | null;
  venueMapUrl?: string | null;
  description?: string | null;
  registrationLink?: string | null;
  mediaLink?: string | null;
  mediaLinkLabel?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export default function CalendarPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canManageEvents = role === "ADMIN" || role === "ORGANIZER";
  const isAdmin = role === "ADMIN";

  const { toast } = useToast();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterCounts, setRosterCounts] = useState<Record<string, number>>({});
  const [myRosterEventIds, setMyRosterEventIds] = useState<string[]>([]);
  const [myRegisteredEventIds, setMyRegisteredEventIds] = useState<string[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [templateForm, setTemplateForm] = useState({ ...emptyForm, name: "" });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/calendar");
      if (res.ok) setEvents(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRosterCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/roster/counts");
      if (res.ok) {
        const data = await res.json();
        setRosterCounts(data.counts ?? {});
        setMyRosterEventIds(data.mine ?? []);
        setMyRegisteredEventIds(data.registered ?? []);
      }
    } catch {}
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/calendar/templates");
      if (res.ok) setTemplates(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (canManageEvents) fetchTemplates();
  }, [canManageEvents, fetchTemplates]);

  useEffect(() => {
    if (role) fetchRosterCounts();
  }, [role, fetchRosterCounts]);

  const eventMap = useMemo(() => buildEventMap(events), [events]);
  const cells = useMemo(() => getMonthDays(year, month), [year, month]);

  const monthEvents = useMemo(() => {
    const seen = new Set<string>();
    const result: CalendarEvent[] = [];
    for (const ev of events) {
      const s = parseDate(ev.startDate);
      const e = ev.endDate ? parseDate(ev.endDate) : s;
      if (
        (s.getFullYear() === year && s.getMonth() === month) ||
        (e.getFullYear() === year && e.getMonth() === month)
      ) {
        if (!seen.has(ev.id)) {
          seen.add(ev.id);
          result.push(ev);
        }
      }
    }
    return result.sort(
      (a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime()
    );
  }, [events, year, month]);

  const selectedEvents = selectedDay ? (eventMap.get(selectedDay) ?? []) : [];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDay(null);
  }

  function handleEdit(ev: CalendarEvent) {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      type: ev.type,
      startDate: ev.startDate.slice(0, 10),
      endDate: ev.endDate?.slice(0, 10) ?? "",
      startTime: ev.startTime ?? "",
      endTime: ev.endTime ?? "",
      city: ev.city,
      venue: ev.venue ?? "",
      venueMapUrl: ev.venueMapUrl ?? "",
      description: ev.description ?? "",
      registrationLink: ev.registrationLink ?? "",
      mediaLink: ev.mediaLink ?? "",
      mediaLinkLabel: ev.mediaLinkLabel ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const isEditing = !!editingId;
    try {
      const url = editingId
        ? `/api/admin/calendar/${editingId}`
        : "/api/admin/calendar";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка при сохранении");
        return;
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      await fetchEvents();
      toast(isEditing ? "Мероприятие обновлено" : "Мероприятие создано");
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить мероприятие?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/calendar/${id}`, { method: "DELETE" });
      if (res.ok) { await fetchEvents(); toast("Мероприятие удалено"); }
    } finally {
      setDeleting(null);
    }
  }

  function applyTemplate(t: Template) {
    setForm({
      ...emptyForm,
      title: t.title ?? "",
      type: t.type ?? "one-day",
      city: t.city ?? "Варшава",
      venue: t.venue ?? "",
      venueMapUrl: t.venueMapUrl ?? "",
      description: t.description ?? "",
      registrationLink: t.registrationLink ?? "",
      mediaLink: t.mediaLink ?? "",
      mediaLinkLabel: t.mediaLinkLabel ?? "",
      startTime: t.startTime ?? "",
      endTime: t.endTime ?? "",
    });
    setEditingId(null);
    setShowForm(true);
    setShowTemplateForm(false);
  }

  function handleEditTemplate(t: Template) {
    setEditingTemplateId(t.id);
    setTemplateForm({
      name: t.name,
      title: t.title ?? "",
      type: t.type ?? "one-day",
      startDate: "",
      endDate: "",
      startTime: t.startTime ?? "",
      endTime: t.endTime ?? "",
      city: t.city ?? "Варшава",
      venue: t.venue ?? "",
      venueMapUrl: t.venueMapUrl ?? "",
      description: t.description ?? "",
      registrationLink: t.registrationLink ?? "",
      mediaLink: t.mediaLink ?? "",
      mediaLinkLabel: t.mediaLinkLabel ?? "",
    });
    setShowTemplateForm(true);
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    setSavingTemplate(true);
    setError(null);
    const isEditing = !!editingTemplateId;
    try {
      const url = editingTemplateId
        ? `/api/admin/calendar/templates/${editingTemplateId}`
        : "/api/admin/calendar/templates";
      const method = editingTemplateId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateForm),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка при сохранении шаблона");
        return;
      }
      setTemplateForm({ ...emptyForm, name: "" });
      setEditingTemplateId(null);
      setShowTemplateForm(false);
      await fetchTemplates();
      toast(isEditing ? "Шаблон обновлён" : "Шаблон сохранён");
    } catch {
      setError("Ошибка сети");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Удалить шаблон?")) return;
    try {
      const res = await fetch(`/api/admin/calendar/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (editingTemplateId === id) {
          setEditingTemplateId(null);
          setTemplateForm({ ...emptyForm, name: "" });
          setShowTemplateForm(false);
        }
        await fetchTemplates();
        toast("Шаблон удалён");
      }
    } catch {}
  }

  const todayKey = dateKey(today);

  const usedCities = useMemo(() => {
    const cities = new Set<string>();
    for (const ev of events) cities.add(ev.city);
    return Array.from(cities);
  }, [events]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Календарь
          </h1>
          <p className="mt-2 text-sm text-muted">
            Расписание интеллектуальных игр и турниров в Польше
          </p>
        </div>
        {canManageEvents && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => {
                setShowTemplateForm(false);
                if (showForm) { setEditingId(null); setForm(emptyForm); }
                setShowForm(!showForm);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? "Закрыть" : "Добавить"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                if (showTemplateForm) { setEditingTemplateId(null); setTemplateForm({ ...emptyForm, name: "" }); }
                setShowTemplateForm(!showTemplateForm);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                showTemplateForm
                  ? "border-accent bg-accent text-white hover:bg-accent-hover"
                  : "border-border bg-white text-foreground hover:bg-surface"
              }`}
            >
              {showTemplateForm ? <X className="h-4 w-4" /> : <LayoutTemplate className="h-4 w-4" />}
              Шаблон
            </button>
          </div>
        )}
      </div>

      {/* Template form */}
      {canManageEvents && showTemplateForm && (
        <div className="mb-8 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-5">
          <h3 className="text-sm font-bold">{editingTemplateId ? "Редактирование шаблона" : "Новый шаблон"}</h3>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
              {error}
              <button onClick={() => setError(null)} className="ml-2 font-medium hover:underline">✕</button>
            </div>
          )}

          <form onSubmit={handleSaveTemplate} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Имя шаблона *</label>
              <input
                type="text"
                required
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Синхрон ЧГК Варшава"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <p className="text-xs text-muted">Заполните поля, которые будут предзаполняться при создании мероприятия из этого шаблона. Все поля ниже необязательны.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Название</label>
                <input
                  type="text"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  placeholder="VII Открытый Чемпионат Польши"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Тип</label>
                <select
                  value={templateForm.type}
                  onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Время начала</label>
                <input
                  type="time"
                  value={templateForm.startTime}
                  onChange={(e) => setTemplateForm({ ...templateForm, startTime: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Время окончания</label>
                <input
                  type="time"
                  value={templateForm.endTime}
                  onChange={(e) => setTemplateForm({ ...templateForm, endTime: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Город</label>
                <select
                  value={templateForm.city}
                  onChange={(e) => setTemplateForm({ ...templateForm, city: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  {CITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Место проведения</label>
                <input
                  type="text"
                  value={templateForm.venue}
                  onChange={(e) => setTemplateForm({ ...templateForm, venue: e.target.value })}
                  placeholder="Название площадки"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Ссылка на Google Maps</label>
              <input
                type="url"
                value={templateForm.venueMapUrl}
                onChange={(e) => setTemplateForm({ ...templateForm, venueMapUrl: e.target.value })}
                placeholder="https://maps.google.com/..."
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Описание</label>
              <textarea
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                rows={3}
                placeholder="Краткое описание мероприятия"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Ссылка на регистрацию</label>
                <input
                  type="url"
                  value={templateForm.registrationLink}
                  onChange={(e) => setTemplateForm({ ...templateForm, registrationLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Медиа-ссылка (Telegram и др.)</label>
                <input
                  type="url"
                  value={templateForm.mediaLink}
                  onChange={(e) => setTemplateForm({ ...templateForm, mediaLink: e.target.value })}
                  placeholder="https://t.me/..."
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="sm:w-1/2">
              <label className="mb-1 block text-xs font-medium text-muted">Название медиа-ссылки</label>
              <input
                type="text"
                value={templateForm.mediaLinkLabel}
                onChange={(e) => setTemplateForm({ ...templateForm, mediaLinkLabel: e.target.value })}
                placeholder="Telegram-группа"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setEditingTemplateId(null); setTemplateForm({ ...emptyForm, name: "" }); setShowTemplateForm(false); }}
                className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-surface"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={savingTemplate}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {savingTemplate && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTemplateId ? "Сохранить" : "Создать шаблон"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Event form */}
      {canManageEvents && showForm && (
        <div className="mb-8 rounded-xl border border-border bg-white p-5">
          {/* Template tiles */}
          {templates.length > 0 && !editingId && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-muted">Из шаблона:</p>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <span
                    key={t.id}
                    className="group relative inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent"
                  >
                    <button
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-accent-hover"
                    >
                      <LayoutTemplate className="h-3 w-3" />
                      {t.name}
                    </button>
                    <span className="ml-1 hidden items-center gap-0.5 group-hover:inline-flex">
                      <button
                        type="button"
                        onClick={() => handleEditTemplate(t)}
                        className="rounded p-0.5 text-muted hover:text-accent"
                        title="Редактировать"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="rounded p-0.5 text-muted hover:text-danger"
                        title="Удалить"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-sm font-bold">{editingId ? "Редактирование мероприятия" : "Новое мероприятие"}</h3>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
              {error}
              <button onClick={() => setError(null)} className="ml-2 font-medium hover:underline">✕</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Название *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VII Открытый Чемпионат Польши"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Тип</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Дата начала *</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Дата окончания</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Время начала</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Время окончания</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Город *</label>
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  {CITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Место проведения</label>
                <input
                  type="text"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  placeholder="Название площадки"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Ссылка на Google Maps</label>
              <input
                type="url"
                value={form.venueMapUrl}
                onChange={(e) => setForm({ ...form, venueMapUrl: e.target.value })}
                placeholder="https://maps.google.com/..."
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Описание</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Краткое описание мероприятия: редакторы, стоимость и т.д."
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Ссылка на регистрацию</label>
                <input
                  type="url"
                  value={form.registrationLink}
                  onChange={(e) => setForm({ ...form, registrationLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Медиа-ссылка (Telegram и др.)</label>
                <input
                  type="url"
                  value={form.mediaLink}
                  onChange={(e) => setForm({ ...form, mediaLink: e.target.value })}
                  placeholder="https://t.me/..."
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="sm:w-1/2">
              <label className="mb-1 block text-xs font-medium text-muted">Название медиа-ссылки</label>
              <input
                type="text"
                value={form.mediaLinkLabel}
                onChange={(e) => setForm({ ...form, mediaLinkLabel: e.target.value })}
                placeholder="Telegram-группа"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(false); }}
                  className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-surface"
                >
                  Отмена
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Сохранить" : "Создать мероприятие"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* City legend */}
      {usedCities.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {usedCities.map((city) => {
            const c = getCityColor(city);
            return (
              <span
                key={city}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text} ${c.border}`}
              >
                <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                {city}
              </span>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Calendar grid */}
          <div className="rounded-xl border border-border bg-white">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <button
                onClick={prevMonth}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-base font-bold">
                {MONTHS_RU[month]} {year}
              </h2>
              <button
                onClick={nextMonth}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="py-2.5 text-center text-xs font-medium text-muted"
                >
                  {wd}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                if (!cell) {
                  return <div key={`empty-${i}`} className="border-b border-r border-border/50 bg-surface/30 p-2" style={{ minHeight: 72 }} />;
                }

                const key = dateKey(cell);
                const dayEvents = eventMap.get(key) ?? [];
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;
                const isWeekend = cell.getDay() === 0 || cell.getDay() === 6;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(isSelected ? null : key)}
                    className={`border-b border-r border-border/50 p-2 text-left transition-colors hover:bg-surface/80 ${
                      isSelected ? "bg-surface ring-2 ring-accent/20 ring-inset" : ""
                    }`}
                    style={{ minHeight: 72 }}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? "bg-accent text-white"
                          : isWeekend
                          ? "text-muted/60"
                          : "text-foreground"
                      }`}
                    >
                      {cell.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {dayEvents.map((ev) => {
                          const c = getCityColor(ev.city);
                          return (
                            <span
                              key={ev.id}
                              className={`hidden h-1.5 rounded-full sm:block ${c.dot}`}
                              style={{ width: "100%", maxWidth: 48 }}
                            />
                          );
                        })}
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted sm:hidden">
                          {dayEvents.length} {dayEvents.length === 1 ? "событие" : "события"}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted">
              {selectedDay
                ? `События ${parseDate(selectedDay).getDate()} ${MONTHS_RU[month].toLowerCase()}`
                : `События за ${MONTHS_RU[month].toLowerCase()}`}
            </h3>

            {(selectedDay ? selectedEvents : monthEvents).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted/30" />
                <p className="mt-2 text-xs text-muted/60">Нет событий</p>
              </div>
            ) : (
              (selectedDay ? selectedEvents : monthEvents).map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  canManage={canManageEvents}
                  deleting={deleting === ev.id}
                  onDelete={() => handleDelete(ev.id)}
                  onEdit={() => handleEdit(ev)}
                  isLoggedIn={!!role}
                  hasMyRoster={myRosterEventIds.includes(ev.id)}
                  isRegistered={myRegisteredEventIds.includes(ev.id)}
                  rosterCount={rosterCounts[ev.id] ?? 0}
                />
              ))
            )}

            {selectedDay && (
              <button
                onClick={() => setSelectedDay(null)}
                className="w-full rounded-lg py-2 text-center text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                Показать все события месяца
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  canManage,
  deleting,
  onDelete,
  onEdit,
  isLoggedIn,
  hasMyRoster,
  isRegistered,
  rosterCount,
}: {
  event: CalendarEvent;
  canManage: boolean;
  deleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
  isLoggedIn?: boolean;
  hasMyRoster?: boolean;
  isRegistered?: boolean;
  rosterCount?: number;
}) {
  const c = getCityColor(event.city);

  // Three roster states:
  // "submitted"   — roster has been submitted (hasMyRoster)
  // "no-roster"   — team is registered via EventTeam but no roster yet
  // "none"        — team not registered at all
  const rosterState = hasMyRoster
    ? "submitted"
    : isRegistered
      ? "no-roster"
      : "none";

  return (
    <div className={`rounded-xl border bg-white p-4 transition-all hover:shadow-sm ${c.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${c.bg} ${c.text} ${c.border}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
              {event.city}
            </span>
            <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
              {TYPE_LABELS[event.type] ?? event.type}
            </span>
          </div>
          <Link
            href={`/calendar/${event.id}`}
            className="mt-2 block text-sm font-bold leading-snug hover:underline decoration-foreground/30 underline-offset-2"
          >
            {event.title}
          </Link>
          {event.description && (
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {event.description}
            </p>
          )}
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-1">
            <button
              onClick={onEdit}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
              title="Редактировать"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-50"
              title="Удалить"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatEventDateTime(event.startDate, event.endDate, event.startTime, event.endTime)}
        </span>
        {event.venue && (
          event.venueMapUrl ? (
            <a
              href={event.venueMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline decoration-muted/30 underline-offset-2 transition-colors hover:text-foreground"
            >
              <MapPin className="h-3.5 w-3.5" />
              {event.venue}
            </a>
          ) : (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.venue}
            </span>
          )
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {event.registrationLink && (
          <a
            href={event.registrationLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface ${c.text} ${c.border}`}
          >
            Регистрация
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {event.mediaLink && (
          <a
            href={event.mediaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <Megaphone className="h-3 w-3" />
            {event.mediaLinkLabel || "Медиа"}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {isLoggedIn && (
          <Link
            href={`/account/roster/${event.id}`}
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              rosterState === "submitted"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : rosterState === "no-roster"
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-border text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {rosterState === "submitted" ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Изменить состав
              </>
            ) : rosterState === "no-roster" ? (
              <>
                <Users className="h-3 w-3" />
                Состав не подан
              </>
            ) : (
              <>
                <Users className="h-3 w-3" />
                Подать состав
              </>
            )}
          </Link>
        )}
      </div>

      {canManage && (rosterCount ?? 0) > 0 && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {rosterCount} {rosterCount === 1 ? "команда" : rosterCount! < 5 ? "команды" : "команд"}
          </span>
          <a
            href={`/api/roster/${event.id}/csv`}
            download
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <Download className="h-3 w-3" />
            CSV
          </a>
        </div>
      )}
    </div>
  );
}
