import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5-minute timeout for large video uploads (up to 1GB)

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB
const ALLOWED_TYPES = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/ogg",
    "video/x-matroska",
    "video/x-msvideo",
];
const ALLOWED_EXTENSIONS = ["mp4", "webm", "mov", "ogg", "mkv", "avi"];

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const folder = searchParams.get("folder") || "variant-videos";

        const formData = await req.formData();
        const files = formData.getAll("files") as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No video provided" }, { status: 400 });
        }

        const urls: string[] = [];

        for (const file of files) {
            const ext = (file.name.split(".").pop() || "").toLowerCase();

            // TYPE CHECK
            if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
                return NextResponse.json(
                    { error: "Only MP4, WEBM, MOV, or OGG videos allowed" },
                    { status: 400 }
                );
            }

            //  SIZE CHECK (1GB)
            if (file.size > MAX_VIDEO_SIZE) {
                return NextResponse.json(
                    { error: "Video must be under 1GB" },
                    { status: 400 }
                );
            }

            const fileName = `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}.${ext || "mp4"}`;

            const uploadDir = path.join(process.cwd(), "uploads", folder);
            await fs.mkdir(uploadDir, { recursive: true });

            const filePath = path.join(uploadDir, fileName);

            // Stream to disk to prevent Node process memory spikes on large files
            const writeStream = fsSync.createWriteStream(filePath);
            const readable = Readable.fromWeb(file.stream() as any);
            await pipeline(readable, writeStream);

            urls.push(`/uploads/${folder}/${fileName}`);
        }

        return NextResponse.json({ urls });
    } catch (error: any) {
        console.error("VIDEO UPLOAD ERROR:", error);
        return NextResponse.json(
            { error: error?.message || "Video upload failed" },
            { status: 500 }
        );
    }
}
