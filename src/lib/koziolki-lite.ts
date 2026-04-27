/**
 * Koziołki Wielkopolskie Lite — past amateur tournament archive.
 *
 * Results are extracted and stored independently of the original sources
 * (Google Sheets / haza.online) so this page does not depend on them
 * being available.
 *
 * Sources of truth (snapshotted on 2026-04-27):
 * - КСИ:        https://docs.google.com/spreadsheets/d/10ZBO7VEfY3_kiU7DypSBkGvblqnYxvMw10ebTpYAq44
 * - Брейн-ринг: https://docs.google.com/spreadsheets/d/1L6KfxjRucGb-HfbC6AoqNl_fnt9X53kDenJ18ssCS1c
 * - ЧГК:        https://www.haza.online/broadcast/640
 */

export const KOZIOLKI_LITE = {
  id: "koziolki-wielkopolskie-lite",
  title: "Koziołki Wielkopolskie Lite",
  city: "Познань",
  venue: "Fundacja Pomocy Wzajemnej Barka",
  venueMapsUrl: "https://maps.app.goo.gl/pjzYQ4K4bBBpFDrW9",
  date: "28 февраля 2026",
  startDate: "2026-02-28",
  /** Public Google Drive folder with award-ceremony photos. */
  photoAlbumUrl: "https://drive.google.com/drive/folders/1CFCTZHjaQ5zMCgtK5xoh6y8SEs8tSBu4",
  photoAlbumFolderId: "1CFCTZHjaQ5zMCgtK5xoh6y8SEs8tSBu4",
} as const;

export interface Medalist {
  team: string;
  city?: string;
}

export interface MedalCategory {
  category: string;
  /** Optional sub-note shown after the category title. */
  note?: string;
  /** First place is index 0, etc. Up to 3 entries. */
  medalists: Medalist[];
}

export const KOZIOLKI_MEDALS: MedalCategory[] = [
  {
    category: "Что? Где? Когда?",
    medalists: [
      { team: "БирШава", city: "Варшава" },
      { team: "Есть Желающие", city: "Вроцлав" },
      { team: "Бежевое Жабо", city: "Гданьск" },
    ],
  },
  {
    category: "Что? Где? Когда?",
    note: "Познаньский зачёт",
    medalists: [
      { team: "Pyramany", city: "Познань" },
    ],
  },
  {
    category: "Командная «Своя игра»",
    medalists: [
      { team: "БирШава", city: "Варшава" },
      { team: "Мокрый Горнонос", city: "Вроцлав" },
      { team: "Хождение", city: "Варшава" },
    ],
  },
  {
    category: "Брейн-ринг",
    medalists: [
      { team: "Есть Желающие", city: "Вроцлав" },
      { team: "Взаимное Грехопадение", city: "Гдыня-Варшава" },
      { team: "Pyramany", city: "Познань" },
    ],
  },
];

export interface ScheduleItem {
  time: string;
  title: string;
  note?: string;
}

export const KOZIOLKI_SCHEDULE: ScheduleItem[] = [
  { time: "10:00", title: "Запуск команд в зал, регистрация у столика организаторов" },
  { time: "11:00", title: "Начало турнира" },
  { time: "11:05", title: "Командная «Своя игра» (10 тем)" },
  {
    time: "12:00",
    title: "ЧГК, туры 1–3 (36 вопросов) · синхрон «B-52: S01E08»",
    note: "сложность 2,5",
  },
  { time: "14:00", title: "Обеденный перерыв" },
  {
    time: "14:50",
    title: "ЧГК, туры 4–6 (36 вопросов) · синхрон «Островок Бесконечности: пятый Супервыпуск»",
    note: "сложность 3,5",
  },
  { time: "17:00", title: "Брейн-ринг" },
  { time: "18:30", title: "Перестрелка по результатам ЧГК (по необходимости), награждение" },
  { time: "18:45", title: "Окончание турнира" },
];

export interface KsiRow {
  place: number;
  team: string;
  block1: number;
  block2: number;
  total: number;
}

/** Командная «Своя игра» — итоговая таблица. */
export const KOZIOLKI_KSI: KsiRow[] = [
  { place: 1, team: "БирШава", block1: 500, block2: 450, total: 950 },
  { place: 2, team: "Мокрый горнонос", block1: 480, block2: 260, total: 740 },
  { place: 3, team: "Хождение", block1: 530, block2: 200, total: 730 },
  { place: 4, team: "Взаимное грехопадение", block1: 360, block2: 340, total: 700 },
  { place: 5, team: "Pyramany", block1: 370, block2: 320, total: 690 },
  { place: 6, team: "Кучин Айланд", block1: 350, block2: 320, total: 670 },
  { place: 7, team: "Есть желающие", block1: 350, block2: 280, total: 630 },
  { place: 8, team: "Бежевое Жабо", block1: 440, block2: 180, total: 620 },
  { place: 9, team: "Внутренняя Мазовия", block1: 450, block2: 130, total: 580 },
  { place: 10, team: "Легионеллы", block1: 350, block2: 220, total: 570 },
  { place: 11, team: "Вопросики & Пытаннечкі", block1: 80, block2: 270, total: 350 },
  { place: 12, team: "Пингвины штурмуют эскалатор", block1: 270, block2: 60, total: 330 },
  { place: 13, team: "Второй бёрдвочер", block1: -30, block2: 150, total: 120 },
];

export interface BrainRow {
  place: number;
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  /** "Zero" — шатауты по версии турнира */
  zeros: number;
  scoredFor: number;
  scoredAgainst: number;
  diff: number;
  points: number;
}

export interface BrainGroup {
  name: string;
  rows: BrainRow[];
}

/** Брейн-ринг — групповой этап. */
export const KOZIOLKI_BRAIN_GROUPS: BrainGroup[] = [
  {
    name: "Группа A",
    rows: [
      { place: 1, team: "Есть желающие", played: 3, wins: 2, draws: 0, losses: 1, zeros: 0, scoredFor: 7, scoredAgainst: 0, diff: 7, points: 5 },
      { place: 2, team: "Бежевое Жабо",  played: 3, wins: 2, draws: 0, losses: 1, zeros: 0, scoredFor: 6, scoredAgainst: 4, diff: 2, points: 7 },
      { place: 3, team: "БирШава",       played: 3, wins: 1, draws: 0, losses: 2, zeros: 0, scoredFor: 5, scoredAgainst: 8, diff: -3, points: 5 },
      { place: 4, team: "Хождение",      played: 3, wins: 1, draws: 0, losses: 2, zeros: 0, scoredFor: 6, scoredAgainst: 7, diff: -1, points: 5 },
    ],
  },
  {
    name: "Группа B",
    rows: [
      { place: 1, team: "Взаимное грехопадение",        played: 3, wins: 2, draws: 1, losses: 0, zeros: 0, scoredFor: 8, scoredAgainst: 2, diff: 6, points: 8 },
      { place: 2, team: "Мокрый горнонос",              played: 3, wins: 2, draws: 1, losses: 0, zeros: 0, scoredFor: 7, scoredAgainst: 4, diff: 3, points: 8 },
      { place: 3, team: "Пингвины штурмуют экскалатор", played: 3, wins: 1, draws: 0, losses: 1, zeros: 1, scoredFor: 2, scoredAgainst: 5, diff: -3, points: 4 },
      { place: 4, team: "Внутренняя Мазовия",           played: 3, wins: 0, draws: 0, losses: 1, zeros: 2, scoredFor: 1, scoredAgainst: 7, diff: -6, points: 1 },
    ],
  },
  {
    name: "Группа C",
    rows: [
      { place: 1, team: "Pyramany",               played: 4, wins: 1, draws: 3, losses: 0, zeros: 0, scoredFor: 7, scoredAgainst: 6, diff: 1, points: 9 },
      { place: 2, team: "Кучин айланд",           played: 4, wins: 1, draws: 3, losses: 0, zeros: 0, scoredFor: 8, scoredAgainst: 6, diff: 2, points: 9 },
      { place: 3, team: "Легионеллы",             played: 4, wins: 1, draws: 3, losses: 0, zeros: 0, scoredFor: 7, scoredAgainst: 6, diff: 1, points: 9 },
      { place: 4, team: "Вопросики & Пытаннечкі", played: 4, wins: 0, draws: 3, losses: 1, zeros: 0, scoredFor: 6, scoredAgainst: 7, diff: -1, points: 7 },
      { place: 5, team: "Второй бёрдвочер",       played: 4, wins: 0, draws: 2, losses: 2, zeros: 0, scoredFor: 6, scoredAgainst: 9, diff: -3, points: 6 },
    ],
  },
];

export interface BrainFinalRow {
  team: string;
  wins: number;
}

/** Брейн-ринг — финал. */
export const KOZIOLKI_BRAIN_FINAL: BrainFinalRow[] = [
  { team: "Есть желающие", wins: 4 },
  { team: "Взаимное грехопадение", wins: 4 },
  { team: "Pyramany", wins: 1 },
];

export interface ChgkRow {
  place: number;
  team: string;
  city: string;
  /** Очки из 72 вопросов */
  score: number;
  /** Рейтинговые очки */
  ratingPoints: number;
}

/** ЧГК — итоговая таблица по 72 вопросам синхронов B-52 + Островок. */
export const KOZIOLKI_CHGK: ChgkRow[] = [
  { place: 1,  team: "БирШава",                      city: "Варшава",        score: 56, ratingPoints: 254 },
  { place: 2,  team: "Есть желающие",                city: "Вроцлав",        score: 55, ratingPoints: 246 },
  { place: 3,  team: "Бежевое Жабо",                 city: "Гданьск",        score: 55, ratingPoints: 239 },
  { place: 4,  team: "Хождение",                     city: "Варшава",        score: 55, ratingPoints: 224 },
  { place: 5,  team: "Взаимное грехопадение",        city: "Гдыня-Варшава",  score: 51, ratingPoints: 216 },
  { place: 6,  team: "Мокрый горнонос",              city: "Вроцлав",        score: 49, ratingPoints: 195 },
  { place: 7,  team: "Внутренняя Мазовия",           city: "Варшава",        score: 49, ratingPoints: 192 },
  { place: 8,  team: "Пингвины штурмуют экскалатор", city: "Варшава",        score: 43, ratingPoints: 168 },
  { place: 9,  team: "Кучин айланд",                 city: "Краков",         score: 43, ratingPoints: 160 },
  { place: 10, team: "Легионеллы",                   city: "Варшава",        score: 42, ratingPoints: 150 },
  { place: 11, team: "Pyramany",                     city: "Познань",        score: 39, ratingPoints: 137 },
  { place: 12, team: "Вопросики & Пытаннечкі",       city: "Познань",        score: 36, ratingPoints: 124 },
  { place: 13, team: "Второй бёрдвочер",             city: "Познань",        score: 29, ratingPoints:  77 },
];
