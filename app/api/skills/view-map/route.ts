import { NextResponse } from "next/server";
import { generateViewMap } from "@/lib/skills/generateViewMap";

type ChapterInput = {
  id: string;
  title: string;
  text: string;
  summary?: string;
};

type RequestBody = {
  title: string;
  bookSummary: string;
  chapters: ChapterInput[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { title, bookSummary, chapters } = body;

    const validChapterSummaries = chapters
      .filter((c) => c.summary && !c.summary.includes("暂未生成"))
      .map((c, index) => ({
        index: index + 1,
        title: c.title,
        summary: c.summary as string,
      }));

    const viewMap = await generateViewMap(title, bookSummary, validChapterSummaries);

    return NextResponse.json({ success: true, viewMap });
  } catch (error) {
    console.error("观点地图生成失败:", error);
    return NextResponse.json(
      { success: false, error: "观点地图生成失败" },
      { status: 500 }
    );
  }
}
