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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "没有收到文件" },
        { status: 400 }
      );
    }

    const isEpub = file.name.toLowerCase().endsWith(".epub");
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isEpub && !isPdf) {
      return NextResponse.json(
        { success: false, error: "仅支持 PDF 或 EPUB 文件" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = process.env.VERCEL
      ? "/tmp/uploads"
      : path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, file.name);
    fs.writeFileSync(filePath, buffer);

    console.log("收到文件:", file.name);

    if (isEpub) {
      const epubData = await parseEpub(filePath);

      const chapterContextForSummary = epubData.chapters.map((c, index) => ({
        index: index + 1,
        title: c.title,
        summary: c.text.slice(0, 800),
      }));

      const bookSummary = await generateBookSummary(epubData.title, chapterContextForSummary);

      return NextResponse.json({
        success: true,
        type: "epub",
        filename: file.name,
        title: epubData.title,
        bookSummary,
        chapters: epubData.chapters,
      });
    }

    return NextResponse.json({
      success: true,
      type: "pdf",
      filename: file.name,
      title: "PDF 文件",
      bookSummary: "当前版本仅完成 PDF 上传，尚未生成全书摘要。",
      chapters: [],
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
