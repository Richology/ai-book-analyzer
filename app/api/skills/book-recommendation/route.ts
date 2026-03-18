import { NextResponse } from "next/server";
import { generateBookRecommendation } from "@/lib/skills/generateBookRecommendation";

type RequestBody = {
  title: string;
  bookSummary: string;
  readingGuide: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { title, bookSummary, readingGuide } = body;

    const recommendation = await generateBookRecommendation(
      title,
      bookSummary,
      readingGuide
    );

    return NextResponse.json({ success: true, recommendation });
  } catch (error) {
    console.error("整书推荐生成失败:", error);
    return NextResponse.json(
      { success: false, error: "整书推荐生成失败" },
      { status: 500 }
    );
  }
}
