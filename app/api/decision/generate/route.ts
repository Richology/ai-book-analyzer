import { NextResponse } from "next/server";
import { generateDecisionScenarios } from "@/lib/skills/generateDecisionScenarios";
import type { DecisionGenerateRequestBody } from "@/types/decision";
import { hasCompleteDecisionCards } from "@/types/decision";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DecisionGenerateRequestBody;
    const { bookTitle, cards } = body;

    if (typeof bookTitle !== "string" || bookTitle.trim().length === 0 || !cards) {
      return NextResponse.json(
        { success: false, error: "缺少书名或卡片内容" },
        { status: 400 }
      );
    }

    if (!hasCompleteDecisionCards(cards)) {
      return NextResponse.json(
        { success: false, error: "需要完整的 6 张分析卡片后才能生成决策训练" },
        { status: 400 }
      );
    }

    const scenarios = await generateDecisionScenarios(bookTitle.trim(), cards);

    return NextResponse.json({ success: true, scenarios });
  } catch (error) {
    console.error("[decision-training] 生成失败:", error);

    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "决策训练生成失败";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
