#!/usr/bin/env node
/**
 * Build turnirushki JSON data files from Google Sheets CSV exports.
 * Usage: node scripts/build-turnirushki-json.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "src/lib/turnirushki");
const SHEETS = "/tmp/turnirushki-sheets";
const SHEETS2 = "/tmp/turnirushki-sheets2";

const created = [];
const issues = [];
const winners = {};

// ─── CSV utilities ───────────────────────────────────────────────────────────

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((c) => c !== "") || rows.length === 0) rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function readCsv(path) {
  if (!existsSync(path)) {
    issues.push(`Missing CSV: ${path}`);
    return [];
  }
  return parseCsv(readFileSync(path, "utf8"));
}

function num(s) {
  if (s == null || s === "") return null;
  const n = Number(String(s).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function intPlace(s) {
  if (!s) return null;
  const m = String(s).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function stripAmateur(name) {
  const amateur = /\(л\)/i.test(name);
  const clean = name.replace(/\s*\(л\)\s*/gi, "").trim();
  return { name: clean, amateur };
}

function writeJson(relPath, data) {
  const full = join(OUT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(data, null, 2) + "\n", "utf8");
  created.push(`src/lib/turnirushki/${relPath}`);
}

function winnerFromFinal(final, key) {
  const w = final?.teams?.find((t) => t.place === 1);
  if (w) winners[key] = w.name;
}

// ─── Quiz / KSI ──────────────────────────────────────────────────────────────

function parseQuizKsi(rows, { slug, title, questionCount, source, isKsi = false }) {
  const teams = [];
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const line = rows[i].join(",");
    if (line.includes("Команда") && (line.includes("Сумма") || line.includes("Представляет"))) {
      headerIdx = i;
      break;
    }
    if (line.includes("СВОЯ ИГРА") && rows[i + 1]) {
      headerIdx = i + 1;
      break;
    }
  }
  if (headerIdx < 0) {
    issues.push(`${slug} ${title}: header not found`);
    return { tournamentSlug: slug, title, questionCount, source, teams };
  }

  const header = rows[headerIdx];
  let scoreStart = header.findIndex((h) => /^1$/.test(String(h).trim()));
  if (scoreStart < 0) {
    scoreStart = header.findIndex((h, idx) => idx > 3 && /^\d+$/.test(String(h).trim()));
  }
  const qCount =
    questionCount ??
    header.slice(scoreStart).filter((h) => /^\d+$/.test(String(h).trim())).length;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r.some((c) => c?.trim())) continue;

    let position = intPlace(r[0]);
    let col = 0;
    if (isKsi && /^\d+$/.test(String(r[1] ?? "").trim()) && r[2]?.trim()) {
      col = 1;
      position = intPlace(r[0]);
    } else if (/^\d+$/.test(String(r[1] ?? "").trim()) && r[2]?.trim()) {
      col = 1;
      position = intPlace(r[0]);
    }

    const number = num(r[col]) ?? num(r[col + 1]);
    const rawName = (r[col + 1] ?? r[col + 2] ?? "").trim();
    if (!rawName || rawName === "Команда" || /^\d+$/.test(rawName)) continue;

    const { name, amateur } = stripAmateur(rawName);
    const region = (r[col + 2] ?? r[col + 3] ?? "").trim();
    const totalCol = isKsi ? 4 : col + 3;
    const total = num(r[totalCol]);
    const scores = [];
    for (let q = 0; q < qCount; q++) {
      const v = num(r[scoreStart + q]);
      scores.push(v ?? 0);
    }
    if (total == null) continue;

    const team = {
      position: position ?? 999,
      number: number ?? position ?? teams.length + 1,
      name,
      region,
      total,
      scores,
    };
    if (amateur) team.amateur = true;
    teams.push(team);
  }

  teams.sort((a, b) => b.total - a.total || a.position - b.position);
  teams.forEach((t, i) => {
    t.position = i + 1;
  });
  return { tournamentSlug: slug, title, questionCount: qCount, source, teams };
}

// ─── Musikalka ───────────────────────────────────────────────────────────────

const MUSIKALKA_BLOCK_LABELS = ["Блок 1", "Блок 2", "Блок 3"];

function parseMusikalkaDrov(rows, slug) {
  const teams = [];
  for (let i = 1; i < rows.length; i++) {
    const name = rows[i][0]?.trim();
    if (!name) continue;
    const b1 = num(rows[i][1]) ?? 0;
    const b2 = num(rows[i][2]) ?? 0;
    const b3 = num(rows[i][3]) ?? 0;
    const total = num(rows[i][4]) ?? b1 + b2 + b3;
    const chgkPlace = num(rows[i][5]);
    const t = { name, blocks: [b1, b2, b3], total };
    if (chgkPlace != null) t.chgkPlace = chgkPlace;
    teams.push(t);
  }
  teams.sort((a, b) => b.total - a.total);
  teams.forEach((t, i) => {
    t.place = i + 1;
  });
  return {
    tournamentSlug: slug,
    title: "Музыкалка",
    blockLabels: MUSIKALKA_BLOCK_LABELS,
    teams,
  };
}

function parseMusikalkaSug(rows, slug) {
  const teams = [];
  for (let i = 1; i < rows.length; i++) {
    const place = intPlace(rows[i][0]);
    const name = rows[i][1]?.trim();
    if (!place || !name || /^\d+$/.test(name)) continue;
    const b1 = num(rows[i][2]) ?? 0;
    const b2 = num(rows[i][3]) ?? 0;
    const b3 = num(rows[i][4]) ?? 0;
    const total = num(rows[i][10]) ?? b1 + b2 + b3;
    teams.push({ place, name, blocks: [b1, b2, b3], total });
  }
  return {
    tournamentSlug: slug,
    title: "Музыкалка",
    blockLabels: MUSIKALKA_BLOCK_LABELS,
    teams,
  };
}

function parseMusikalkaVes(rows, slug) {
  const teams = [];
  for (let i = 1; i < rows.length; i++) {
    const name = rows[i][0]?.trim();
    if (!name) continue;
    const b1 = num(rows[i][2]) ?? 0;
    const b2 = num(rows[i][3]) ?? 0;
    const b3 = num(rows[i][5]) ?? 0;
    const total = num(rows[i][9]) ?? b1 + b2 + b3;
    teams.push({ name, blocks: [b1, b2, b3], total });
  }
  teams.sort((a, b) => b.total - a.total);
  teams.forEach((t, i) => {
    t.place = i + 1;
  });
  return {
    tournamentSlug: slug,
    title: "Музыкалка",
    blockLabels: MUSIKALKA_BLOCK_LABELS,
    teams,
  };
}

// ─── Olymp ───────────────────────────────────────────────────────────────────

function parseOlymp(rows, slug) {
  const groups = [];
  let current = null;
  for (const r of rows) {
    const gMatch = r[0]?.match(/^Группа\s+([A-H])$/i);
    if (gMatch) {
      current = { id: gMatch[1].toUpperCase(), label: `Группа ${gMatch[1].toUpperCase()}`, teams: [] };
      groups.push(current);
      continue;
    }
    if (!current) continue;
    const name = r[0]?.trim();
    if (!name || name.startsWith("Группа")) continue;
    const tour12 = num(r[1]);
    const tour3 = num(r[2]);
    const tour4 = num(r[3]);
    const total = num(r[4]) ?? [tour12, tour3, tour4].filter((x) => x != null).reduce((a, b) => a + b, 0);
    if (tour12 == null && tour3 == null && tour4 == null) continue;
    current.teams.push({
      name,
      tours: [tour12 ?? 0, tour3 ?? 0, tour4 ?? 0],
      total,
    });
  }
  for (const g of groups) {
    g.teams.sort((a, b) => b.total - a.total);
    g.teams.forEach((t, i) => {
      t.place = i + 1;
    });
  }
  return { tournamentSlug: slug, title: "Олимпийка", groups };
}

// ─── Kubok ───────────────────────────────────────────────────────────────────

function parseKubok(rows, slug) {
  const players = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const placeRaw = r[0]?.trim();
    const name = r[2]?.trim();
    const total = num(r[3]);
    if (!name || total == null || name.includes("Кубок") || placeRaw.includes("/")) continue;
    const place = intPlace(placeRaw) ?? players.length + 1;
    const tours = [];
    for (let t = 0; t < 6; t++) tours.push(num(r[4 + t]) ?? 0);
    players.push({ place, name, total, tours });
  }
  players.sort((a, b) => a.place - b.place);
  return { tournamentSlug: slug, title: "Кубок дружбы", players };
}

// ─── Jeszcze ─────────────────────────────────────────────────────────────────

function parseJeszcze(rows, slug) {
  const teams = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const number = num(r[0]);
    const name = r[1]?.trim();
    const city = r[2]?.trim() || "";
    const total = num(r[3]);
    const place = intPlace(r[4]);
    if (!number || !name) continue;
    const rounds = [];
    for (let j = 5; j < r.length; j++) {
      const v = r[j]?.trim();
      if (v === "x" || v === "X") rounds.push(null);
      else {
        const n = num(v);
        if (n != null) rounds.push(n);
      }
    }
    teams.push({
      number,
      name,
      city,
      total: total ?? 0,
      place: place ?? 0,
      rounds,
    });
  }
  teams.sort((a, b) => a.place - b.place || b.total - a.total);
  return {
    tournamentSlug: slug,
    title: "Jeszcze żyjemy",
    source:
      "https://docs.google.com/spreadsheets/d/1t8N_Kkv1uqHPMEmWSBEZeiLjcMPiDTpWeVrAefCuSWU",
    teams,
  };
}

// ─── EK bout parser ──────────────────────────────────────────────────────────

function parseEkBoutFile(rows) {
  const groups = [];
  let current = null;

  const flush = () => {
    if (current && current.teams.length) groups.push(current);
    current = null;
  };

  for (const r of rows) {
    const boutLabel = r[0]?.trim();
    if (boutLabel?.match(/^Бой\s+\d+/i)) {
      flush();
      const venue = extractVenue(rows, r) || "";
      current = {
        label: boutLabel,
        venue,
        teams: [],
      };
      const first = r[1]?.trim();
      const score = num(r[2]);
      const place = parsePlace(r[3]);
      if (first && score != null) {
        const { name, amateur } = stripAmateur(first);
        current.teams.push({ name, score, place: place ?? current.teams.length + 1, amateur });
      }
      continue;
    }
    if (r[0]?.includes("Площадка") && !r[1]?.trim()) {
      if (current) current.venue = r[0].replace(/^"?|"?$/g, "").trim();
      continue;
    }
    if (!current) continue;
    const name = r[1]?.trim() || r[0]?.trim();
    const score = num(r[2] ?? r[1]);
    const place = parsePlace(r[3] ?? r[2]);
    if (!name || name.includes("Площадка") || name.match(/^Бой\s/i)) continue;
    if (score == null && place == null) continue;
    const { name: clean, amateur } = stripAmateur(name);
    current.teams.push({
      name: clean,
      score: score ?? 0,
      place: place ?? current.teams.length + 1,
      ...(amateur ? { amateur: true } : {}),
    });
  }
  flush();
  return groups;
}

function extractVenue(rows, boutRow) {
  const idx = rows.indexOf(boutRow);
  for (let j = idx + 1; j < Math.min(idx + 8, rows.length); j++) {
    if (rows[j][0]?.includes("Площадка")) return rows[j][0].replace(/^"?|"?$/g, "").trim();
  }
  return "";
}

function parsePlace(s) {
  if (!s) return null;
  const str = String(s).trim();
  const m = str.match(/^(\d+)/);
  if (m) return Number(m[1]);
  if (str.includes("-")) {
    const parts = str.split("-").map((x) => Number(x.trim()));
    return parts[0] || null;
  }
  return null;
}

function parseEkTwoColumnBouts(rows) {
  const left = parseEkBoutFile(rows.map((r) => [r[0], r[1], r[2], r[3]]));
  const right = parseEkBoutFile(rows.map((r) => [r[5] || r[4], r[6] || r[5], r[7] || r[6], r[8] || r[7]]));
  return { left, right };
}

function boutGroupsToRound(groups, idPrefix) {
  return groups.map((g, i) => ({
    id: `${idPrefix}${i + 1}`,
    label: g.label,
    venue: g.venue,
    teams: g.teams.map((t) => ({
      name: t.name,
      score: t.score,
      place: t.place,
      boutPoints: t.score,
    })),
  }));
}

function parseDrov24Ek() {
  const slug = "drovushki-exportnye-2024";
  const seedsRows = readCsv(join(SHEETS2, "drov24-ek-0.csv"));
  const seeds = [];
  const allTeams = [];
  for (const r of seedsRows) {
    const chgk = intPlace(r[0]);
    const name = r[1]?.trim();
    if (!name) continue;
    allTeams.push(name);
    if (chgk) seeds.push({ chgk, name });
  }

  const r1 = readCsv(join(SHEETS2, "drov24-ek-1.csv"));
  const { left: round1Groups, right: round2Groups } = parseEkTwoColumnBouts(r1);
  const r3groups = parseEkBoutFile(readCsv(join(SHEETS2, "drov24-ek-2.csv")));
  const r4groups = parseEkBoutFile(readCsv(join(SHEETS2, "drov24-ek-3.csv")));
  const finalRows = readCsv(join(SHEETS2, "drov24-ek-4.csv"));
  const finalVenue = finalRows[0]?.[1]?.trim() || "";
  const finalTeams = [];
  for (let i = 1; i < finalRows.length; i++) {
    const name = finalRows[i][1]?.trim();
    const score = num(finalRows[i][2]);
    const place = intPlace(finalRows[i][3]);
    if (name && score != null && place) {
      finalTeams.push({ name, score, place });
    }
  }

  const playoffRounds = [
    ...r3groups.map((g) => ({
      label: g.label,
      venue: g.venue,
      teams: g.teams.map((t) => ({ name: t.name, score: t.score, place: t.place })),
    })),
    ...r4groups.map((g) => ({
      label: g.label,
      venue: g.venue,
      teams: g.teams.map((t) => ({ name: t.name, score: t.score, place: t.place })),
    })),
  ];

  const data = {
    tournamentSlug: slug,
    title: "ЭК",
    seedSource: "ЧГК",
    format: "two-rounds",
    seeds,
    allTeams,
    rounds: [
      { number: 1, label: "Бой 1", groups: boutGroupsToRound(round1Groups, "R1") },
      { number: 2, label: "Бой 2", groups: boutGroupsToRound(round2Groups, "R2") },
    ],
    playoffRounds,
    quarterfinals: [],
    semifinals: [],
    final: { venue: finalVenue, teams: finalTeams },
  };
  writeJson("ek/drovushki-exportnye-2024.json", data);
  winnerFromFinal(data.final, `${slug} ek`);
}

// ─── Vesnushki 2025 EK (baskets) ─────────────────────────────────────────────

function parseVes25Ek() {
  const slug = "vesnushki-2025";
  const basketRows = readCsv(join(SHEETS2, "ves25-ek-0.csv"));
  const mainRows = readCsv(join(SHEETS2, "ves25-ek-main.csv"));

  const seedTeams = [];
  for (let row = 1; row < basketRows.length; row++) {
    const t = basketRows[row][1]?.trim();
    if (t) seedTeams.push(t);
  }

  const seeds = seedTeams.map((name, i) => ({ chgk: i + 1, name }));
  const baskets = [];
  for (let b = 0; b < 5; b++) {
    const col = b + 1;
    const matches = [];
    for (let row = 1; row < basketRows.length; row++) {
      const seed = row;
      const team = basketRows[row][1]?.trim();
      const opponent = basketRows[row][col]?.trim();
      if (team && opponent && team !== opponent) matches.push({ seed, team, opponent });
    }
    if (matches.length) baskets.push({ label: `Корзина ${b + 1}`, matches });
  }

  const playoffRounds = [];
  let finalVenue = "";
  const finalTeams = [];
  let currentStage = null;
  let currentVenue = "";

  for (const r of mainRows) {
    for (let c = 0; c < r.length; c += 4) {
      const header = r[c]?.trim();
      if (!header) continue;
      if (header === "Финал") {
        currentStage = "final";
        continue;
      }
      if (header.match(/^Этап|^Полуфинал/i)) {
        currentStage = header;
        currentVenue = header;
        continue;
      }
      if (header.match(/Площадка\s+\d/i) && r[c + 1] === "Счёт") {
        currentVenue = header;
        continue;
      }
      if (header.match(/^[A-HА-Я]\.\s+Площадка/i)) {
        currentVenue = header;
        continue;
      }
    }

    // Parse team rows in 4-column blocks
    for (let c = 0; c < r.length; c += 4) {
      const label = r[c]?.trim();
      const score = num(r[c + 1]);
      const place = intPlace(r[c + 2]);
      if (!label || label.match(/^(Этап|Полуфинал|Финал|Площадка|[A-HА-Я]\.)/i)) continue;
      if (score == null && place == null) continue;

      const team = { name: label, score: score ?? 0, place: place ?? 0 };
      if (currentStage === "final" || (c >= 28 && label)) {
        if (place) finalTeams.push(team);
      }
    }
  }

  // Re-parse main sheet more reliably
  const stages = [];
  let stage = null;
  for (const r of mainRows) {
    const h0 = r[0]?.trim();
    if (h0?.match(/^Этап\s+\d/i) || h0?.match(/^Полуфинал/i)) {
      if (stage?.teams.length) stages.push(stage);
      stage = { label: h0, venue: h0, teams: [] };
      continue;
    }
    if (h0?.match(/^[A-HА-Я]\.\s+Площадка/i)) {
      if (stage?.teams.length) stages.push(stage);
      stage = { label: h0, venue: h0, teams: [] };
      continue;
    }
    if (h0 === "Финал") {
      if (stage?.teams.length) stages.push(stage);
      stage = null;
      continue;
    }
    if (!stage) continue;
    const name = h0;
    const score = num(r[1]);
    const place = intPlace(r[2]);
    if (name && (score != null || place)) {
      stage.teams.push({ name, score: score ?? 0, place: place ?? stage.teams.length + 1 });
    }
  }
  if (stage?.teams.length) stages.push(stage);

  const finalParsed = [];
  let inFinal = false;
  for (const r of mainRows) {
    if (r.some((c) => c?.trim() === "Финал")) inFinal = true;
    if (!inFinal) continue;
    const name = r[28]?.trim() || r[24]?.trim();
    const score = num(r[29]) ?? num(r[25]);
    const place = intPlace(r[30]) ?? intPlace(r[26]);
    if (name && !name.match(/^(Финал|Площадка)/i) && place) {
      finalParsed.push({ name, score: score ?? 0, place });
      finalVenue = r[27]?.trim() || finalVenue;
    }
  }

  // Column-block parser for multi-column layout
  const blockStages = parseEkMainBlocks(mainRows);
  const finalTeamsParsed = parseVes25Final(mainRows);
  const finalBlock = blockStages.find((s) => s.label === "Финал");
  const nonFinal = blockStages.filter((s) => s.label !== "Финал");
  const allTeamsSet = new Set(seedTeams);
  for (const s of blockStages) for (const t of s.teams) allTeamsSet.add(t.name);

  const data = {
    tournamentSlug: slug,
    title: "ЭК",
    seedSource: "ЧГК",
    format: "baskets",
    packName: "Веснушки 2025",
    seeds,
    allTeams: [...allTeamsSet],
    baskets,
    playoffRounds: nonFinal.map((s) => ({
      label: s.label,
      venue: s.venue,
      teams: s.teams,
    })),
    quarterfinals: [],
    semifinals: [],
    final: {
      venue: finalBlock?.venue || finalVenue || "Площадка 1",
      teams: finalTeamsParsed.length
        ? finalTeamsParsed
        : finalBlock?.teams?.length
          ? finalBlock.teams
          : finalParsed,
    },
  };

  if (!data.final.teams.length) {
    issues.push("vesnushki-2025 ek: final teams not parsed");
  }
  writeJson("ek/vesnushki-2025.json", data);
  winnerFromFinal(data.final, `${slug} ek`);
}

function parseVes25Final(rows) {
  let finalCol = -1;
  let startRow = -1;
  for (let i = 0; i < rows.length; i++) {
    for (let c = 0; c < rows[i].length; c++) {
      if (rows[i][c]?.trim() === "Финал") {
        finalCol = c;
        startRow = i + 1;
        break;
      }
    }
    if (startRow >= 0) break;
  }
  if (finalCol < 0) return [];
  const teams = [];
  for (let i = startRow; i < rows.length; i++) {
    const name = rows[i][finalCol]?.trim();
    const score = num(rows[i][finalCol + 1]);
    const place = intPlace(rows[i][finalCol + 2]);
    if (!name || name.match(/^(Финал|Площадка|Ведущие)/i)) continue;
    if (place == null) continue;
    teams.push({ name, score: score ?? 0, place });
  }
  return teams.sort((a, b) => a.place - b.place);
}

function parseEkMainBlocks(rows) {
  const stages = [];
  if (!rows.length) return stages;
  const header = rows[0];
  const blockStarts = [];
  for (let c = 0; c < header.length; c++) {
    const h = header[c]?.trim();
    if (h && (h.match(/^Этап|^Полуфинал|^Финал/i) || h.match(/^[A-HА-Я]\.\s+Площадка/i))) {
      blockStarts.push({ col: c, label: h });
    }
  }

  for (const { col, label } of blockStarts) {
    const teams = [];
    let venue = label;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const name = r[col]?.trim();
      const score = num(r[col + 1]);
      const place = intPlace(r[col + 2]);
      if (name?.match(/^[A-HА-Я]\.\s+Площадка/i)) {
        venue = name;
        continue;
      }
      if (!name || name.match(/^(Этап|Полуфинал|Финал|Площадка|Ведущие)/i)) continue;
      if (score == null && place == null) continue;
      teams.push({ name, score: score ?? 0, place: place ?? teams.length + 1 });
    }
    if (teams.length) stages.push({ label, venue, teams });
  }
  return stages;
}

// ─── Drovushki 2025 EK (playoffs) ───────────────────────────────────────────

function parseDrov25Ek() {
  const slug = "drovushki-exportnye-2025";
  const rows = readCsv(join(SHEETS, "drov25-ek.csv"));
  const seeds = [];
  for (let i = 2; i < rows.length; i++) {
    const chgk = intPlace(rows[i][0]);
    const name = rows[i][1]?.trim();
    if (chgk && name && !name.includes("ЧГК") && !name.includes("Дивизион")) {
      seeds.push({ chgk, name });
    }
  }

  const quarterfinals = [];
  const semifinals = [];
  const finals = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    for (let c = 0; c < r.length; c++) {
      const cell = r[c]?.trim() ?? "";
      const qf = cell.match(/^Группа\s+([AB])(\d)\.\s*(.+)$/i);
      if (qf) {
        const group = qf[1].toUpperCase() + qf[2];
        const venueHost = qf[3].trim();
        const teams = [];
        for (let j = i + 2; j < rows.length; j++) {
          const bracket = rows[j][c]?.trim();
          const name = rows[j][c + 1]?.trim();
          const score = num(rows[j][c + 2]);
          const place = intPlace(rows[j][c + 3]);
          if (!bracket?.match(/^[AB]\d+$/i)) break;
          const { name: clean, amateur } = stripAmateur(name);
          teams.push({
            bracket,
            name: clean,
            score: score ?? 0,
            place: place ?? teams.length + 1,
            ksi: seeds.find((s) => s.name === clean)?.chgk,
            ...(amateur ? { amateur: true } : {}),
          });
        }
        const entry = {
          group,
          label: `Группа ${group}`,
          venue: venueHost,
          host: venueHost.split(",").pop()?.trim() || "",
          teams,
        };
        if (group.match(/^[AB][1-4]$/)) quarterfinals.push(entry);
        else if (group.match(/^[AB]5$/)) semifinals.push({ number: semifinals.length + 1, label: `Полуфинал ${group}`, venue: venueHost, teams });
        else if (group.match(/^A6$/)) semifinals.push({ number: semifinals.length + 1, label: `Полуфинал ${group}`, venue: venueHost, teams });
        else if (group.match(/^B6$/)) semifinals.push({ number: semifinals.length + 1, label: `Полуфинал ${group}`, venue: venueHost, teams });
      }
      const fin = cell.match(/^Финал\s+([ABА-Я]),?\s*(.+)$/i);
      if (fin) {
        const teams = [];
        for (let j = i + 2; j < rows.length; j++) {
          const name = rows[j][c]?.trim();
          const scoreRaw = rows[j][c + 1]?.trim();
          const place = intPlace(rows[j][c + 2]);
          if (!name || name === "Команда") break;
          if (!place) continue;
          const scoreMatch = scoreRaw?.match(/^(-?\d+)/);
          const score = scoreMatch ? Number(scoreMatch[1]) : num(scoreRaw);
          teams.push({ name, score: score ?? 0, place });
        }
        if (teams.length) finals.push({ division: fin[1], venue: fin[2].trim(), teams });
      }
    }
  }

  const mainFinal = finals.find((f) => f.division === "А" || f.division === "A") ?? finals[0];
  const data = {
    tournamentSlug: slug,
    title: "ЭК",
    seedSource: "ЧГК",
    format: "playoffs",
    seeds,
    quarterfinals,
    semifinals,
    final: {
      venue: mainFinal?.venue || "",
      teams: mainFinal?.teams || [],
    },
  };
  writeJson("ek/drovushki-exportnye-2025.json", data);
  winnerFromFinal(data.final, `${slug} ek`);
}

// ─── Brain (double elimination) ──────────────────────────────────────────────

function parseBrain(rows, slug) {
  const seeds = [];
  for (let i = 3; i < rows.length; i++) {
    const place = intPlace(rows[i][0]);
    const name = rows[i][1]?.trim();
    if (!place || !name) continue;
    if (name.includes("Площадка") || name.includes("Ведущие")) break;
    if (place > 25) continue;
    seeds.push({ chgkPlace: place, name });
  }

  const headerRow = rows[1] ?? [];
  const boutCols = [];
  for (let c = 3; c < headerRow.length; c++) {
    const h = headerRow[c]?.trim();
    if (h && (h.includes("бой") || h.includes("Бой") || h.includes("Площадка"))) {
      boutCols.push({ col: c, label: h });
    }
  }

  const boutMap = new Map();
  for (let i = 3; i < rows.length; i++) {
    const team = rows[i][1]?.trim();
    if (!team) continue;
    for (const { col, label } of boutCols) {
      const opponent = rows[i][col]?.trim();
      const score = num(rows[i][col + 1]);
      if (!opponent || opponent.includes("Площадка") || score == null) continue;
      if (!boutMap.has(label)) boutMap.set(label, []);
      boutMap.get(label).push({ team, opponent, score });
    }
  }

  const stages = [];
  let currentStage = { label: "Плей-офф", bouts: [] };
  for (const [label, entries] of boutMap) {
    const matches = [];
    const seen = new Set();
    for (const e of entries) {
      const key = [e.team, e.opponent].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({ slot: "", team: e.team, score: e.score });
      const rev = entries.find((x) => x.team === e.opponent && x.opponent === e.team);
      if (rev) matches.push({ slot: "", team: rev.team, score: rev.score });
    }
    if (matches.length) {
      currentStage.bouts.push({ label, matches });
    }
  }
  if (currentStage.bouts.length) stages.push(currentStage);

  // Grand final: team name in col 30, result in col 31
  const finalTeams = [];
  for (let i = 2; i < rows.length; i++) {
    const result = rows[i][31]?.trim();
    if (result !== "win" && result !== "lose") continue;
    const name = rows[i][30]?.trim();
    if (!name || name.includes("бой")) continue;
    finalTeams.push({
      name,
      score: num(rows[i][32]),
      score2: num(rows[i][33]),
      place: result === "win" ? 1 : 2,
    });
  }

  const data = {
    tournamentSlug: slug,
    title: "Брейн-ринг",
    seedSource: "ЧГК",
    seeds,
    groups: [],
    playoffs: {
      format: "double-elimination",
      stages,
      roundOf16: [],
      quarterfinals: [],
      semifinals: [],
      final: {
        label: "Грандфинал",
        venue: "Площадка 1",
        teams: finalTeams.length
          ? finalTeams
          : [{ name: seeds[0]?.name ?? "?", score: null, place: 1 }],
      },
      thirdPlace: { label: "", venue: "", teams: [] },
    },
  };
  writeJson(`brain/${slug}.json`, data);
  const w = finalTeams.find((t) => t.place === 1);
  if (w) winners[`${slug} brain`] = w.name;
}

// ─── ISI ─────────────────────────────────────────────────────────────────────

function parseIsiQual(rows, slug) {
  const qualification = [];
  let start = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((c) => String(c).includes("Имя"))) {
      start = i + 1;
      break;
    }
  }
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    const place = intPlace(r[1]);
    const name = r[2]?.trim();
    const total = num(r[4]);
    if (!name || total == null) continue;
    if (name.includes("вне зачёта")) {
      qualification.push({ place: place ?? qualification.length + 1, name, total, note: "вне зачёта" });
      continue;
    }
    if (!place) continue;
    qualification.push({ place, name: name.trim(), total });
  }
  return qualification;
}

function parseIsiPlayoff(rows) {
  const bouts = [];
  const stageCols = [];
  for (let c = 3; c < (rows[1]?.length ?? 0); c += 4) {
    const label = rows[1]?.[c]?.trim() || rows[0]?.[c]?.trim();
    if (label && label !== "Игрок") stageCols.push({ col: c, label });
  }
  for (const { col, label } of stageCols) {
    const matches = [];
    for (let i = 3; i < rows.length; i++) {
      const player = rows[i][col]?.trim();
      const scoreRaw = rows[i][col + 1]?.trim();
      const place = intPlace(rows[i][col + 2]);
      if (!player || player === "Игрок") continue;
      if (!scoreRaw && place == null) continue;
      matches.push({
        player,
        score: num(scoreRaw),
        scoreRaw: scoreRaw || null,
        place: place ?? null,
      });
    }
    if (matches.length) bouts.push({ label, matches });
  }
  return bouts;
}

function downloadIsiPlayoff() {
  const dest = join(SHEETS2, "sug26-isi-playoff.csv");
  if (existsSync(dest)) return dest;
  const url =
    "https://docs.google.com/spreadsheets/d/1mNgRviAH_0YbgtIsAd-kniOURBKtHwH1wN0yIsmWBFE/gviz/tq?tqx=out:csv&gid=290272215";
  try {
    execSync(`curl -fsSL "${url}" -o "${dest}"`, { stdio: "pipe" });
    return dest;
  } catch (e) {
    issues.push(`Failed to download ISI playoff: ${e.message}`);
    return null;
  }
}

function buildIsi(slug) {
  const qual = parseIsiQual(readCsv(join(SHEETS2, "sug26-isi-qual.csv")), slug);
  const playoffPath = downloadIsiPlayoff();
  const bouts = playoffPath ? parseIsiPlayoff(readCsv(playoffPath)) : [];
  const seeds = qual.slice(0, 24).map((q) => ({ place: q.place, name: q.name }));

  const data = {
    tournamentSlug: slug,
    title: "ИСИ (Индивидуальная Своя Игра)",
    seedSource: "отбор",
    qualification: qual,
    playoffs: { bouts, seeds },
  };
  writeJson(`isi/${slug}.json`, data);
  const finalBout = bouts.find(
    (b) =>
      b.label?.toLowerCase().includes("главный зал") &&
      !b.label?.includes("Группа") &&
      !b.label?.match(/^П[12]/),
  );
  const w = finalBout?.matches.find((m) => m.place === 1);
  if (w) winners[`${slug} isi`] = w.player;
  else if (qual[0]) winners[`${slug} isi`] = qual[0].name;
}

// ─── Main builds ─────────────────────────────────────────────────────────────

function buildDrov24() {
  const slug = "drovushki-exportnye-2024";
  const quiz = parseQuizKsi(readCsv(join(SHEETS, "drov24-quiz.csv")), {
    slug,
    title: "Quiz Штурм",
    source: "",
  });
  writeJson("quiz/drovushki-exportnye-2024.json", quiz);
  if (quiz.teams[0]) winners[`${slug} quiz`] = quiz.teams[0].name;

  const mus = parseMusikalkaDrov(readCsv(join(SHEETS2, "drov24-mus.csv")), slug);
  writeJson("musikalka/drovushki-exportnye-2024.json", mus);
  if (mus.teams[0]) winners[`${slug} musikalka`] = mus.teams[0].name;

  parseDrov24Ek();
}

function buildSug25() {
  const slug = "sugrobushki-2025";
  writeJson("olymp/sugrobushki-2025.json", parseOlymp(readCsv(join(SHEETS, "sug25-olymp.csv")), slug));
  const mus = parseMusikalkaSug(readCsv(join(SHEETS2, "sug25-mus.csv")), slug);
  writeJson("musikalka/sugrobushki-2025.json", mus);
  if (mus.teams[0]) winners[`${slug} musikalka`] = mus.teams[0].name;
}

function buildVes25() {
  const slug = "vesnushki-2025";
  parseVes25Ek();
  parseBrain(readCsv(join(SHEETS, "ves25-br.csv")), slug);
  const mus = parseMusikalkaVes(readCsv(join(SHEETS, "ves25-mus.csv")), slug);
  writeJson("musikalka/vesnushki-2025.json", mus);
  if (mus.teams[0]) winners[`${slug} musikalka`] = mus.teams[0].name;
  writeJson(
    "kubok/vesnushki-2025.json",
    parseKubok(readCsv(join(SHEETS2, "ves25-kubok-152140240.csv")), slug),
  );
}

function buildDrov25() {
  const slug = "drovushki-exportnye-2025";
  parseDrov25Ek();
  const j = parseJeszcze(readCsv(join(SHEETS, "drov25-jeszcze.csv")), slug);
  writeJson("jeszcze/drovushki-exportnye-2025.json", j);
  const jWinner = j.teams.find((t) => t.place === 1);
  if (jWinner) winners[`${slug} jeszcze`] = jWinner.name;
}

function buildSug26() {
  const slug = "sugrobushki-2026";
  const ksi = parseQuizKsi(readCsv(join(SHEETS2, "sug26-ksi-1.csv")), {
    slug,
    title: "КСИ (Командная Своя Игра)",
    questionCount: 20,
    source: "",
    isKsi: true,
  });
  writeJson("ksi/sugrobushki-2026.json", ksi);
  if (ksi.teams[0]) winners[`${slug} ksi`] = ksi.teams[0].name;

  const quiz = parseQuizKsi(readCsv(join(SHEETS, "sug26-quiz.csv")), {
    slug,
    title: "Quiz Штурм",
    source: "",
  });
  writeJson("quiz/sugrobushki-2026.json", quiz);
  if (quiz.teams[0]) winners[`${slug} quiz`] = quiz.teams[0].name;

  buildIsi(slug);
}

// ─── Validate ────────────────────────────────────────────────────────────────

function validate() {
  for (const rel of created) {
    const full = join(ROOT, rel);
    try {
      JSON.parse(readFileSync(full, "utf8"));
    } catch (e) {
      issues.push(`Invalid JSON: ${rel}: ${e.message}`);
    }
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log("Building turnirushki JSON files...\n");
buildDrov24();
buildSug25();
buildVes25();
buildDrov25();
buildSug26();
validate();

console.log("Created files:");
for (const f of created) console.log(`  ${f}`);

console.log("\nWinners found:");
for (const [k, v] of Object.entries(winners)) console.log(`  ${k}: ${v}`);

if (issues.length) {
  console.log("\nParsing issues:");
  for (const i of issues) console.log(`  ⚠ ${i}`);
} else {
  console.log("\nNo parsing issues.");
}

console.log(`\nTotal: ${created.length} files`);
