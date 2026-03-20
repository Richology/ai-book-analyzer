import { NextResponse } from "next/server";
import { generatePosterContent } from "@/lib/skills/generatePosterContent";

type RequestBody = {
  title: string;
  bookSummary: string;
  readingGuide: string;
  actionExtraction: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { title, bookSummary, readingGuide, actionExtraction } = body;

    const content = await generatePosterContent(
      title,
      bookSummary,
      readingGuide,
      actionExtraction
    );

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("[poster-content] 生成失败:", error);
    return NextResponse.json(
      { success: false, error: "海报内容生成失败" },
      { status: 500 }
    );
  }
}
