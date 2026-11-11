import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import sharp from "sharp";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") || "misc";

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files allowed" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);

    const isHeroOrBanner = folder.includes("hero") || folder.includes("banner");
    const isProductOrVariant = folder.includes("product") || folder.includes("variant");

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

    // Deduplicate by SHA-256 hash (16 chars) to eliminate duplicated variant uploads
    const hash = crypto.createHash("sha256").update(webpBuffer).digest("hex").slice(0, 16);
    const fileName = `${hash}.webp`;

    const uploadDir = path.join(process.cwd(), "uploads", folder);
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, webpBuffer);
    }

    const fileUrl = `/uploads/${folder}/${fileName}`;
    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}
