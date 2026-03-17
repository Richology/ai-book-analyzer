import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Epub from "epub2";
import { generateBookSummary } from "@/lib/skills/generateBookSummary";

type ChapterItem = {
  id: string;
  title: string;
  text: string;
};

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let filename: string;
    let buffer: Buffer;

    if (contentType.includes("application/json")) {
      // URL-based flow (Vercel Blob / production)
      const body = await request.json();
      const { fileUrl, filename: fn } = body as {
        fileUrl: string;
        filename: string;
      };

      if (!fileUrl || !fn) {
        return NextResponse.json(
          { success: false, error: "缺少 fileUrl 或 filename" },
          { status: 400 }
        );
      }

      filename = fn;

      const fileRes = await fetch(fileUrl);
      if (!fileRes.ok) {
        return NextResponse.json(
          { success: false, error: "无法下载文件，请重新上传" },
          { status: 400 }
        );
      }
      buffer = Buffer.from(await fileRes.arrayBuffer());
    } else {
      // Direct FormData flow (local dev)
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "没有收到文件" },
          { status: 400 }
        );
      }

      filename = file.name;
      buffer = Buffer.from(await file.arrayBuffer());
    }

    const isEpub = filename.toLowerCase().endsWith(".epub");
    const isPdf = filename.toLowerCase().endsWith(".pdf");

    if (!isEpub && !isPdf) {
      return NextResponse.json(
        { success: false, error: "仅支持 PDF 或 EPUB 文件" },
        { status: 400 }
      );
    }

    console.log("收到文件:", filename);

    if (isEpub) {
      const uploadDir = process.env.VERCEL
        ? "/tmp/uploads"
        : path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);

      const epubData = await parseEpub(filePath);

      const chapterContextForSummary = epubData.chapters.map((c, index) => ({
        index: index + 1,
        title: c.title,
        summary: c.text.slice(0, 800),
      }));

      const bookSummary = await generateBookSummary(
        epubData.title,
        chapterContextForSummary
      );

      return NextResponse.json({
        success: true,
        type: "epub",
        mode: "full",
        filename,
        title: epubData.title,
        bookSummary,
        chapters: epubData.chapters,
      });
    }

    const pdfTitle = filename.replace(/\.pdf$/i, "");
    const pdfChapters = await parsePdf(buffer);

    return NextResponse.json({
      success: true,
      type: "pdf",
      mode: "lite",
      filename,
      title: pdfTitle,
      bookSummary: "",
      chapters: pdfChapters,
    });
  } catch (error) {
    console.error("分析失败:", error);

    return NextResponse.json(
      { success: false, error: "文件处理失败" },
      { status: 500 }
    );
  }
}

function parseEpub(
  filePath: string
): Promise<{ title: string; chapters: ChapterItem[] }> {
  return new Promise((resolve, reject) => {
    const epub = new Epub(filePath);

    epub.on("error", (err) => {
      reject(err);
    });

    epub.on("end", async () => {
      try {
        const metadataTitle = epub.metadata?.title || "未知书名";

        const flowItems = epub.flow?.slice(0, 8) || [];
        const chapters: ChapterItem[] = [];

        for (const item of flowItems) {
          if (!item.id) {
            continue;
          }

          const chapterId = item.id;
          const rawText = await getChapterText(epub, chapterId);
          const cleanText = cleanHtmlText(rawText).slice(0, 3000);

          chapters.push({
            id: chapterId,
            title: item.title || "未命名章节",
            text: cleanText || "该章节未提取到正文内容",
          });
        }

        resolve({
          title: metadataTitle,
          chapters,
        });
      } catch (err) {
        reject(err);
      }
    });

    epub.parse();
  });
}

function getChapterText(epub: Epub, chapterId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    epub.getChapter(chapterId, (err, text) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(text || "");
    });
  });
}

async function parsePdf(buffer: Buffer): Promise<ChapterItem[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse") as (
      buf: Buffer
    ) => Promise<{ text: string }>;

    const data = await pdfParse(buffer);
    const fullText = (data.text || "").trim();

    if (!fullText) return [];

    const CHUNK_SIZE = 3000;
    const chunks: ChapterItem[] = [];
    const totalChunks = Math.min(8, Math.ceil(fullText.length / CHUNK_SIZE));

    for (let i = 0; i < totalChunks; i++) {
      const text = fullText
        .slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        .trim();
      if (text.length > 50) {
        chunks.push({
          id: `pdf-p${i + 1}`,
          title: `第 ${i + 1} 部分`,
          text,
        });
      }
    }

    return chunks;
  } catch (err) {
    console.error("PDF 文本提取失败:", err);
    return [];
  }
}

function cleanHtmlText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
