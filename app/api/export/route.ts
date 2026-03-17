import { NextResponse } from "next/server";
import JSZip from "jszip";

type ExportRequestBody = {
  title: string;
  bookSummary: string;
  readingGuide: string;
  viewMap: string;
  actionExtraction: string;
  viewValidation: string;
  ideaSourceTracing: string;
};

function sanitizeFolderName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "-").trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportRequestBody;
    const {
      title,
      bookSummary,
      readingGuide,
      viewMap,
      actionExtraction,
      viewValidation,
      ideaSourceTracing,
    } = body;

    const folderName = sanitizeFolderName(title || "未知书名");

    const files: Record<string, string> = {
      "01-全书摘要.md": `# 全书摘要\n\n${bookSummary}`,
      "02-阅读指南.md": `# 阅读指南\n\n${readingGuide}`,
      "03-观点地图.md": `# 观点地图\n\n${viewMap}`,
      "04-行动提炼.md": `# 行动提炼\n\n${actionExtraction}`,
      "05-观点校验.md": `# 观点校验\n\n${viewValidation}`,
      "06-思想溯源.md": `# 思想溯源\n\n${ideaSourceTracing}`,
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
