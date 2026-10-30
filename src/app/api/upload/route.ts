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

    // Auto-convert to optimized WebP & resize to maximum bounding box
    const isHeroOrBanner = folder.includes("hero") || folder.includes("banner");
    const maxWidth = isHeroOrBanner ? 1600 : 1000;
    const quality = isHeroOrBanner ? 80 : 78;

    const webpBuffer = await sharp(inputBuffer)
      .resize({ width: maxWidth, withoutEnlargement: true, fit: "inside" })
      .webp({ quality })
      .toBuffer();

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
