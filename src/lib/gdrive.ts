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
  const match = filename.match(
    /^(\d+)\.\s+(.+?)\s+[—–-]\s+(.+?)\s+[—–-]\s+(.+?)\s+[—–-]\s+(\d{4})\.\w+$/,
  );
  if (!match) return null;

  return {
    value: parseInt(match[1], 10),
    artists: match[2].trim(),
    songName: match[3].trim(),
    style: match[4].trim(),
    year: parseInt(match[5], 10),
    fileId,
    audioUrl: getAudioUrl(fileId),
    originalName: filename,
  };
}

export interface MusicThemeData {
  name: string;
  tracks: ParsedTrack[];
}

export async function loadRoundFromDrive(folderUrl: string): Promise<{
  themes: MusicThemeData[];
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

  for (const folder of themeFolders) {
    const files = await listFolder(folder.id);
    const audioFiles = files.filter(
      (f) =>
        f.mimeType.startsWith("audio/") ||
        f.name.endsWith(".mp3") ||
        f.name.endsWith(".m4a") ||
        f.name.endsWith(".ogg"),
    );

    const tracks = audioFiles
      .map((f) => parseTrackFilename(f.name, f.id))
      .filter((t): t is ParsedTrack => t !== null)
      .sort((a, b) => a.value - b.value);

    themes.push({ name: folder.name, tracks });
  }

  return { themes };
}
