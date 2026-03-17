import { NextResponse } from "next/server";
import { generateIdeaSourceTracing } from "@/lib/skills/generateIdeaSourceTracing";

type RequestBody = {
  title: string;
  bookSummary: string;
  viewMap: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { title, bookSummary, viewMap } = body;

    const ideaSourceTracing = await generateIdeaSourceTracing(title, bookSummary, viewMap);

    return NextResponse.json({ success: true, ideaSourceTracing });
  } catch (error) {
    console.error("思想溯源生成失败:", error);
    return NextResponse.json(
      { success: false, error: "思想溯源生成失败" },
      { status: 500 }
    );
  }
}
