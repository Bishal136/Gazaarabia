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
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const urls: string[] = [];
    const isHeroOrBanner = folder.includes("hero") || folder.includes("banner");
    const maxWidth = isHeroOrBanner ? 1600 : 1000;
    const quality = isHeroOrBanner ? 80 : 78;

    const uploadDir = path.join(process.cwd(), "uploads", folder);
    await fs.mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only image files allowed" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const inputBuffer = Buffer.from(bytes);

      // Auto-convert to optimized WebP & resize
      const webpBuffer = await sharp(inputBuffer)
        .resize({ width: maxWidth, withoutEnlargement: true, fit: "inside" })
        .webp({ quality })
        .toBuffer();

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
