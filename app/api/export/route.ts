import { NextResponse } from "next/server";
import JSZip from "jszip";

const BRAND = "书跃 · BookLeap";
const SLOGAN = "从好书中完成认知跃迁";
const CHINESE_NUMS = ["一", "二", "三", "四", "五", "六", "七", "八"];

type SectionItem = {
  id: string;
  title: string;
  content: string;
};

type ExportRequestBody = {
  bookTitle: string;
  fileType: "epub" | "pdf";
  mode: "full" | "lite";
  format: "md" | "txt" | "json";
  structure: "multi" | "single";
  sections: SectionItem[];
};

function sanitize(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "-").trim();
}

function mdToTxt(md: string): string {
  return md
    .replace(/^#{1,6}\s+(.+)$/gm, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[\s]*[-*+]\s+/gm, "• ")
    .replace(/^[\s]*\d+\.\s+/gm, (m) => m.trimStart())
    .replace(/^---+$/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportRequestBody;
    const {
      bookTitle,
      fileType = "epub",
      mode = "full",
      format = "md",
      structure = "multi",
      sections = [],
    } = body;

    const safeTitle = sanitize(bookTitle || "未知书名");
    const zipName = `BookLeap-${safeTitle}-知识包`;

    const zip = new JSZip();
    const folder = zip.folder(zipName)!;

    // ── JSON ──────────────────────────────────────────────
    if (format === "json") {
      const payload = {
        meta: {
          title: bookTitle || "未知书名",
          fileType,
          mode,
          exportedAt: new Date().toISOString(),
          brand: BRAND,
          slogan: SLOGAN,
        },
        sections: sections.map(({ id, title, content }) => ({ id, title, content })),
      };
      folder.file(
        `BookLeap-${safeTitle}-知识包.json`,
        JSON.stringify(payload, null, 2)
      );

    // ── Single merged file ────────────────────────────────
    } else if (structure === "single") {
      const ext = format === "txt" ? "txt" : "md";
      let merged = "";

      if (format === "md") {
        merged += `# ${bookTitle || "未知书名"}\n\n`;
        merged += `> 本知识包由「${BRAND}」生成\n> ${SLOGAN}\n\n---\n\n`;
        sections.forEach(({ title, content }, i) => {
          const num = CHINESE_NUMS[i] ?? `${i + 1}`;
          merged += `## ${num}、${title}\n\n${content}\n\n---\n\n`;
        });
      } else {
        merged += `${bookTitle || "未知书名"}\n\n`;
        merged += `本知识包由「${BRAND}」生成\n${SLOGAN}\n\n`;
        merged += `${"=".repeat(36)}\n\n`;
        sections.forEach(({ title, content }, i) => {
          const num = CHINESE_NUMS[i] ?? `${i + 1}`;
          const bar = "=".repeat(Math.max(title.length * 2, 16));
          merged += `${num}、${title}\n${bar}\n\n${mdToTxt(content)}\n\n${"=".repeat(36)}\n\n`;
        });
      }

      folder.file(`BookLeap-${safeTitle}-知识包.${ext}`, merged.trim());

    // ── Multi-file ────────────────────────────────────────
    } else {
      const ext = format === "txt" ? "txt" : "md";

      sections.forEach(({ title, content }, i) => {
        const idx = String(i + 1).padStart(2, "0");
        let fileContent = "";

        if (format === "md") {
          fileContent =
            `# ${title}\n\n` +
            `> 本知识包由「${BRAND}」生成\n> ${SLOGAN}\n\n---\n\n` +
            content;
        } else {
          const bar = "=".repeat(Math.max(title.length * 2, 16));
          fileContent =
            `${title}\n${bar}\n\n` +
            `本知识包由「${BRAND}」生成\n${SLOGAN}\n\n` +
            `${"=".repeat(36)}\n\n` +
            mdToTxt(content);
        }

        folder.file(`${safeTitle}-${idx}-${title}.${ext}`, fileContent);
      });
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const zipBytes = new Uint8Array(zipBuffer);

    return new NextResponse(zipBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(zipName)}.zip"`,
      },
    });
  } catch (error) {
    console.error("导出失败:", error);
    return NextResponse.json({ success: false, error: "导出失败" }, { status: 500 });
  }
}
