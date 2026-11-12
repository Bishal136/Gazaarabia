import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import sharp from "sharp";
import { checkAuth } from "@/lib/authToken";

export async function POST(req: Request) {
  try {
    const userId = await checkAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Authentication required to upload files" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") || "misc";

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const urls: string[] = [];
    const isHeroOrBanner = folder.includes("hero") || folder.includes("banner");
    const isProductOrVariant = folder.includes("product") || folder.includes("variant");

    const uploadDir = path.join(process.cwd(), "uploads", folder);
    await fs.mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only image files allowed" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const inputBuffer = Buffer.from(bytes);

      // 1. Auto-orient according to EXIF orientation metadata (fixes iPhone/Android portrait camera tags)
      const imageProcessor = sharp(inputBuffer).rotate();

      let webpBuffer: Buffer;
      if (isProductOrVariant) {
        // 2. Enforce standard 3:4 portrait ratio (1200x1600) with top framing for clothing & modest fashion
        webpBuffer = await imageProcessor
          .resize({
            width: 1200,
            height: 1600,
            fit: "cover",
            position: "top",
          })
          .webp({ quality: 82 })
          .toBuffer();
      } else if (isHeroOrBanner) {
        webpBuffer = await imageProcessor
          .resize({ width: 1600, withoutEnlargement: true, fit: "inside" })
          .webp({ quality: 80 })
          .toBuffer();
      } else {
        webpBuffer = await imageProcessor
          .resize({ width: 1000, withoutEnlargement: true, fit: "inside" })
          .webp({ quality: 78 })
          .toBuffer();
      }

      // Deduplicate by SHA-256 hash
      const hash = crypto.createHash("sha256").update(webpBuffer).digest("hex").slice(0, 16);
      const fileName = `${hash}.webp`;
      const filePath = path.join(uploadDir, fileName);

      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, webpBuffer);
      }

      urls.push(`/uploads/${folder}/${fileName}`);
    }

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}
