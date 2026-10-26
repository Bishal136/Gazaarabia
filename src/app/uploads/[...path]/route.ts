import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  jfif: "image/jpeg",
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

  // 1. Try serving from local uploads directory
  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = MIME_MAP[ext] || "application/octet-stream";

    return new Response(file, {
      headers: {
        "Content-Type": mime,
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
