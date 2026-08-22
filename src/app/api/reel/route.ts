import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  MAX_CLIP_SECONDS,
  MAX_COOKIES_BYTES,
  clipFilename,
  contentDisposition,
  extractYouTubeUrl,
  looksLikeNetscapeCookies,
  parseTimecode,
} from "@/lib/reel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const AUDIO_EXTS = new Set([".mp3", ".m4a", ".webm", ".opus", ".ogg", ".aac", ".wav"]);

type ReelBody = {
  url?: unknown;
  start?: unknown;
  end?: unknown;
  cookies?: unknown;
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function run(
  cmd: string,
  args: string[],
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("timeout"));
    }, timeoutMs);

    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString("utf8");
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const detail = (stderr || stdout).trim().slice(-800);
      reject(new Error(detail || `${cmd} exited ${code}`));
    });
  });
}

function isMissingBin(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as NodeJS.ErrnoException).code === "ENOENT"
  );
}

async function findFile(dir: string, exts: Set<string>): Promise<string | null> {
  const names = await readdir(dir);
  const hits = names.filter((n) => exts.has(path.extname(n).toLowerCase()));
  if (!hits.length) return null;
  return path.join(dir, hits[0]);
}

/** yt-dlp 2026+ treats --print as --simulate unless --no-simulate is set. */
function ytdlpArgs(
  out: string,
  url: string,
  cookiesPath: string | undefined,
  extra: string[] = [],
): string[] {
  const args = [
    "-f",
    "bestaudio/best",
    "-x",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "192",
    "--no-playlist",
    "--no-warnings",
    "--no-cache-dir",
    "--restrict-filenames",
    "--no-simulate",
    "--js-runtimes",
    "node",
    "--print",
    "%(title)s",
    "-o",
    out,
  ];
  if (cookiesPath) args.push("--cookies", cookiesPath);
  args.push(...extra, url);
  return args;
}

function titleFromStdout(stdout: string): string {
  return stdout.trim().split("\n")[0] || "clip";
}

/** Short yt-dlp/ffmpeg line for JSON — drop wiki dumps. */
function detailFromError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const line =
    raw
      .split("\n")
      .map((l) => l.trim())
      .find((l) => /^ERROR:/i.test(l) || /HTTP Error/i.test(l) || /Sign in/i.test(l)) || raw;
  return line
    .replace(/^ERROR:\s*/i, "")
    .replace(/\s+Use --cookies[\s\S]*$/i, "")
    .replace(/\s+See\s+https?:\/\/\S+/gi, "")
    .trim()
    .slice(0, 300);
}

async function downloadClip(
  url: string,
  start: number,
  end: number,
  dir: string,
  cookiesPath?: string,
): Promise<{ file: string; title: string }> {
  const sectionOut = path.join(dir, "clip.%(ext)s");
  try {
    const { stdout } = await run(
      "yt-dlp",
      ytdlpArgs(sectionOut, url, cookiesPath, [
        "--download-sections",
        `*${start}-${end}`,
      ]),
      150_000,
    );
    const file = await findFile(dir, new Set([".mp3"]));
    if (file) {
      return { file, title: titleFromStdout(stdout) };
    }
  } catch (err) {
    if (isMissingBin(err)) throw err;
    if (err instanceof Error && err.message === "timeout") throw err;
    if (/not a bot|LOGIN_REQUIRED/i.test(detailFromError(err))) throw err;
    // Fall through: full download + ffmpeg trim.
  }

  const fullDir = path.join(dir, "full");
  await mkdir(fullDir, { recursive: true });
  const { stdout } = await run(
    "yt-dlp",
    ytdlpArgs(path.join(fullDir, "audio.%(ext)s"), url, cookiesPath),
    150_000,
  );
  const source = await findFile(fullDir, AUDIO_EXTS);
  if (!source) throw new Error("Audio file not found after download");

  const out = path.join(dir, "clip.mp3");
  await run(
    "ffmpeg",
    [
      "-hide_banner",
      "-y",
      "-i",
      source,
      "-ss",
      String(start),
      "-t",
      String(end - start),
      "-vn",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "192k",
      out,
    ],
    60_000,
  );
  return { file: out, title: titleFromStdout(stdout) };
}

export async function POST(req: Request) {
  let body: ReelBody;
  try {
    body = (await req.json()) as ReelBody;
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }

  const url = extractYouTubeUrl(asString(body.url));
  const start = parseTimecode(asString(body.start));
  const end = parseTimecode(asString(body.end));
  const cookiesText = asString(body.cookies).replace(/^\uFEFF/, "").trim();

  if (cookiesText) {
    if (Buffer.byteLength(cookiesText, "utf8") > MAX_COOKIES_BYTES) {
      return NextResponse.json(
        { error: "Файл cookies слишком большой (максимум 512 КБ)." },
        { status: 400 },
      );
    }
    if (!looksLikeNetscapeCookies(cookiesText)) {
      return NextResponse.json(
        {
          error:
            "Это не похоже на Netscape cookies.txt — файл должен начинаться с # или содержать youtube.com.",
        },
        { status: 400 },
      );
    }
  }

  if (!url) {
    return NextResponse.json(
      { error: "Вставьте ссылку на YouTube (youtube.com или youtu.be)." },
      { status: 400 },
    );
  }
  if (start === null || end === null) {
    return NextResponse.json(
      { error: "Неверный формат таймкода. Используйте MM:SS, HH:MM:SS или секунды." },
      { status: 400 },
    );
  }
  if (end <= start) {
    return NextResponse.json(
      { error: "Время конца должно быть больше времени начала." },
      { status: 400 },
    );
  }
  if (end - start > MAX_CLIP_SECONDS) {
    return NextResponse.json(
      { error: "Фрагмент слишком длинный (максимум 15 минут)." },
      { status: 400 },
    );
  }

  const dir = await mkdtemp(path.join(tmpdir(), "4gk-reel-"));
  try {
    let cookiesPath = process.env.YTDLP_COOKIES?.trim() || undefined;
    if (cookiesText) {
      cookiesPath = path.join(dir, "cookies.txt");
      await writeFile(cookiesPath, cookiesText, { mode: 0o600 });
    }
    const { file, title } = await downloadClip(url, start, end, dir, cookiesPath);
    const buf = await readFile(file);
    const filename = clipFilename(title, start, end);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": contentDisposition(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (isMissingBin(err)) {
      return NextResponse.json(
        { error: "На сервере не установлены yt-dlp или ffmpeg." },
        { status: 503 },
      );
    }
    const msg = err instanceof Error ? err.message : "";
    if (msg === "timeout") {
      return NextResponse.json(
        { error: "Скачивание заняло слишком много времени. Попробуйте более короткий фрагмент." },
        { status: 504 },
      );
    }
    const detail = detailFromError(err);
    console.error("[reel] download failed", detail);
    const bot = /not a bot|LOGIN_REQUIRED/i.test(detail);
    const hadCookies = Boolean(cookiesText || process.env.YTDLP_COOKIES?.trim());
    const error = bot
      ? hadCookies
        ? "YouTube всё ещё считает запрос ботом. Экспортируйте cookies.txt заново из браузера, где вы залогинены."
        : "YouTube блокирует этот сервер как бота. Экспортируйте cookies.txt из браузера и вставьте на этой странице."
      : "Не удалось скачать фрагмент. Проверьте ссылку и таймкоды.";
    return NextResponse.json({ error, detail }, { status: 502 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
