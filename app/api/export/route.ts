import { NextResponse } from "next/server";
import JSZip from "jszip";

type Chapter = {
  id: string;
  title: string;
  text: string;
  summary?: string;
};

type ExportRequestBody = {
  title: string;
  readingGuide: string;
  viewMap: string;
  actionExtraction: string;
  bookSummary: string;
  chapters: Chapter[];
};

function buildChapterSummariesMd(chapters: Chapter[]): string {
  const sections = chapters.map((chapter, index) => {
    return [
      `## 第${index + 1}章：${chapter.title}`,
      "",
      "### 摘要",
      chapter.summary || "暂无摘要",
      "",
      "### 正文预览",
      chapter.text,
    ].join("\n");
  });

  return ["# 章节摘要", "", ...sections].join("\n\n");
}

function sanitizeFolderName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "-").trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportRequestBody;
    const { title, readingGuide, viewMap, actionExtraction, bookSummary, chapters } = body;

    const folderName = sanitizeFolderName(title || "未知书名");

    const files: Record<string, string> = {
      "00-阅读指南.md": `# 阅读指南\n\n${readingGuide}`,
      "01-观点地图.md": `# 观点地图\n\n${viewMap}`,
      "02-行动提炼.md": `# 行动提炼\n\n${actionExtraction}`,
      "03-全书摘要.md": `# 全书摘要\n\n${bookSummary}`,
      "04-章节摘要.md": buildChapterSummariesMd(chapters),
    };

    const zip = new JSZip();
    const folder = zip.folder(folderName)!;

    for (const [filename, content] of Object.entries(files)) {
      folder.file(filename, content);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const zipBytes = new Uint8Array(zipBuffer);

    return new NextResponse(zipBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(folderName)}.zip"`,
      },
    });
  } catch (error) {
    console.error("导出失败:", error);
    return NextResponse.json({ success: false, error: "导出失败" }, { status: 500 });
  }
}
