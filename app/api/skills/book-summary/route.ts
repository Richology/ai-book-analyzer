import { NextResponse } from "next/server";
import { generateBookSummary } from "@/lib/skills/generateBookSummary";

type ChapterInput = {
  id: string;
  title: string;
  text: string;
};

type RequestBody = {
  title: string;
  chapters: ChapterInput[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { title, chapters } = body;

    const chapterContextForSummary = chapters.map((c, index) => ({
      index: index + 1,
      title: c.title,
      summary: c.text.slice(0, 800),
    }));

    const bookSummary = await generateBookSummary(title, chapterContextForSummary);

    return NextResponse.json({ success: true, bookSummary });
  } catch (error) {
    console.error("全书摘要生成失败:", error);
    return NextResponse.json(
      { success: false, error: "全书摘要生成失败" },
      { status: 500 }
    );
  }
}
