import { NextResponse } from "next/server";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { Readable } from "stream";

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  jfif: "image/jpeg",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  ogg: "video/ogg",
  mkv: "video/x-matroska",
};

// 1x1 transparent GIF fallback so Next.js image optimizer never crashes on missing assets
const TRANSPARENT_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path: fileParts } = await ctx.params;
  const decodedParts = fileParts.map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });

  const joinedPath = decodedParts.join("/");
  const filePath = path.join(process.cwd(), "uploads", ...decodedParts);

  // 1. Try serving from local uploads directory with streaming & Range support for videos
  try {
    const stat = await fs.stat(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = MIME_MAP[ext] || "application/octet-stream";
    const fileSize = stat.size;
    const range = req.headers.get("range");

    // HTTP 206 Partial Content (Supports fast video seeking and streaming large files)
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const fileStream = fsSync.createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(fileStream);

      return new Response(webStream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": mime,
        },
      });
    }

    const fileStream = fsSync.createReadStream(filePath);
    const webStream = Readable.toWeb(fileStream);

    return new Response(webStream as any, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": fileSize.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    // Not found locally
  }

  // 2. Fallback: Stream on-demand from production domain
  try {
    const remoteUrl = `https://gazaarabia.com/uploads/${joinedPath}`;
    const remoteRes = await fetch(remoteUrl);

    if (remoteRes.ok) {
      const buffer = Buffer.from(await remoteRes.arrayBuffer());
      const contentType = remoteRes.headers.get("content-type") || "image/jpeg";

      // Cache locally on laptop so subsequent loads are instant
      try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, buffer);
      } catch {
        // Continue even if disk write fails
      }

      return new Response(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }
  } catch {
    // Remote fetch failed
  }

  // 3. Graceful fallback: return valid image bytes so Next.js optimizer does not return 400 Bad Request
  return new Response(TRANSPARENT_PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "public, max-age=60",
    },
  });
}
