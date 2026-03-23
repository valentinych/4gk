const API_KEY = process.env.GOOGLE_API_KEY;

export function extractFolderId(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

async function listFolder(folderId: string): Promise<DriveFile[]> {
  if (!API_KEY) throw new Error("GOOGLE_API_KEY not configured");

  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id,name,mimeType),nextPageToken",
      key: API_KEY,
      pageSize: "1000",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`Google Drive API error: ${res.status}`);

    const data = await res.json();
    files.push(...(data.files || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

export function getAudioUrl(fileId: string): string {
  return `/api/music-si/audio/${fileId}`;
}

export interface ParsedTrack {
  value: number;
  artists: string;
  songName: string;
  style: string;
  year: number;
  fileId: string;
  audioUrl: string;
  originalName: string;
}

export function parseTrackFilename(
  filename: string,
  fileId: string,
): ParsedTrack | null {
  const base = filename.replace(/\.\w+$/, "");

  // Full format: "30. Mike Oldfield ft. Maggie Reilly — Moonlight Shadow — pop — 1983"
  const full = base.match(
    /^(\d+)[\.\s]+(.+?)\s*[—–\-]+\s*(.+?)\s*[—–\-]+\s*(.+?)\s*[—–\-]+\s*(\d{4})$/,
  );
  if (full) {
    return {
      value: parseInt(full[1], 10),
      artists: full[2].trim(),
      songName: full[3].trim(),
      style: full[4].trim(),
      year: parseInt(full[5], 10),
      fileId,
      audioUrl: getAudioUrl(fileId),
      originalName: filename,
    };
  }

  // 3-part: "30. Artist — Song — 1983" (no style)
  const three = base.match(
    /^(\d+)[\.\s]+(.+?)\s*[—–\-]+\s*(.+?)\s*[—–\-]+\s*(\d{4})$/,
  );
  if (three) {
    return {
      value: parseInt(three[1], 10),
      artists: three[2].trim(),
      songName: three[3].trim(),
      style: "",
      year: parseInt(three[4], 10),
      fileId,
      audioUrl: getAudioUrl(fileId),
      originalName: filename,
    };
  }

  // 2-part: "30. Artist — Song" (no style, no year)
  const two = base.match(
    /^(\d+)[\.\s]+(.+?)\s*[—–\-]+\s*(.+)$/,
  );
  if (two) {
    return {
      value: parseInt(two[1], 10),
      artists: two[2].trim(),
      songName: two[3].trim(),
      style: "",
      year: 0,
      fileId,
      audioUrl: getAudioUrl(fileId),
      originalName: filename,
    };
  }

  // Minimal fallback: just a number at the start — "30. anything" or "30 anything"
  const minimal = base.match(/^(\d+)[\.\s]+(.+)$/);
  if (minimal) {
    return {
      value: parseInt(minimal[1], 10),
      artists: minimal[2].trim(),
      songName: "",
      style: "",
      year: 0,
      fileId,
      audioUrl: getAudioUrl(fileId),
      originalName: filename,
    };
  }

  return null;
}

export interface MusicThemeData {
  name: string;
  tracks: ParsedTrack[];
}

export async function loadRoundFromDrive(folderUrl: string): Promise<{
  themes: MusicThemeData[];
  skippedFiles: string[];
}> {
  const folderId = extractFolderId(folderUrl);
  if (!folderId) throw new Error("Invalid Google Drive folder URL");

  const items = await listFolder(folderId);
  const themeFolders = items
    .filter((f) => f.mimeType === "application/vnd.google-apps.folder")
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  if (themeFolders.length === 0) {
    throw new Error("No theme folders found");
  }

  const themes: MusicThemeData[] = [];
  const skippedFiles: string[] = [];

  for (const folder of themeFolders) {
    const files = await listFolder(folder.id);
    const audioFiles = files.filter(
      (f) =>
        f.mimeType.startsWith("audio/") ||
        f.name.toLowerCase().endsWith(".mp3") ||
        f.name.toLowerCase().endsWith(".m4a") ||
        f.name.toLowerCase().endsWith(".ogg"),
    );

    const tracks: ParsedTrack[] = [];
    for (const f of audioFiles) {
      const parsed = parseTrackFilename(f.name, f.id);
      if (parsed) {
        tracks.push(parsed);
      } else {
        skippedFiles.push(`${folder.name}/${f.name}`);
      }
    }
    tracks.sort((a, b) => a.value - b.value);

    themes.push({ name: folder.name, tracks });
  }

  return { themes, skippedFiles };
}
