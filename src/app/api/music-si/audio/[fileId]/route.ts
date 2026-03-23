export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  const range = request.headers.get("range");
  const headers: Record<string, string> = {};
  if (range) headers["Range"] = range;

  const res = await fetch(driveUrl, {
    headers,
    redirect: "follow",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", res.headers.get("Content-Type") || "audio/mpeg");
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Cache-Control", "public, max-age=86400");

  const cl = res.headers.get("Content-Length");
  if (cl) responseHeaders.set("Content-Length", cl);
  const cr = res.headers.get("Content-Range");
  if (cr) responseHeaders.set("Content-Range", cr);

  return new Response(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}
