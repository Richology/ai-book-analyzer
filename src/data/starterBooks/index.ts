import type { PosterContent } from "@/app/components/poster/types";
import {
  DECISION_ROLE_TYPES,
  buildDecisionBookId,
  type DecisionRoleType,
  type DecisionScenario,
} from "@/types/decision";
import cognitiveAwakeningSource from "./cognitive-awakening.json";
import poorCharliesSource from "./poor-charlies-almanack.json";
import principlesSource from "./principles.json";

type StarterBookSource = {
  id: string;
  title: string;
  author: string;
  cover: string;
  recommendation: string;
  analysis: {
    summary: string;
    insights: string[];
    actions: string[];
  };
  decisionTraining: Array<{
    roleType?: DecisionRoleType;
    trainingAbility?: string;
    scene: string;
    question: string;
    options: {
      A: string;
      B: string;
    };
    feedback: {
      A: {
        empathy: string;
        analysis: string;
        upgrade: string;
        action: string;
      };
      B: {
        empathy: string;
        analysis: string;
        upgrade: string;
        action: string;
      };
    };
  }>;
  posterContent: {
    title: string;
    hook: string;
    summary: string;
    insights: string[];
    actions: string[];
    highlight: string;
  };
};

export type StarterBookData = {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  recommendation: string;
  isStarterBook: true;
  analysis: {
    summary: string;
    readingGuide: string;
    viewMap: string;
    actionExtraction: string;
    viewValidation: string;
    ideaSourceTracing: string;
  };
  decisionTraining: DecisionScenario[];
  posterContent: PosterContent;
  metadata?: {
    category?: string;
    badge?: string;
  };
};

function buildReadingGuide(source: StarterBookSource): string {
  const prompts = source.analysis.insights.slice(0, 3);
  return [
    `如果你想用 10 分钟读懂《${source.title}》，建议按这个顺序进入：`,
    "",
    "1. 先抓住这本书最想纠正你的旧习惯",
    "2. 再看作者反复强调的关键判断",
    "3. 最后挑一条动作，在这周立刻用起来",
    "",
    "阅读时，可以重点追问：",
    ...prompts.map((item) => `- ${item}`),
  ].join("\n");
}

function buildViewMap(source: StarterBookSource): string {
  return [
    `# 《${source.title}》的核心命题`,
    source.analysis.summary,
    "",
    "# 关键洞察",
    ...source.analysis.insights.map((item) => `- ${item}`),
  ].join("\n");
}

function buildActionExtraction(source: StarterBookSource): string {
  return [
    `# 把《${source.title}》落到现实里的 5 个动作`,
    ...source.analysis.actions.map((item, index) => `${index + 1}. ${item}`),
  ].join("\n");
}

function buildViewValidation(source: StarterBookSource): string {
  return [
    `这本书最值得反复校验的，不只是“我认不认同”，而是：`,
    ...source.analysis.insights.slice(0, 3).map((item) => `- 你是否真的在现实里验证过：${item}`),
    "",
    "进一步追问：",
    "- 这些判断放到你当前阶段，哪些成立，哪些需要调整？",
    "- 你记住的是结论，还是背后的结构？",
    "- 如果只能保留一条原则，你会留下哪一条？",
  ].join("\n");
}

function buildIdeaSourceTracing(source: StarterBookSource): string {
  return [
    `《${source.title}》背后的底层关切，不是单点技巧，而是帮助你建立一套更稳定的认知方式。`,
    "",
    `从这本书反复强调的内容看，作者真正想解决的是：`,
    ...source.analysis.insights.slice(0, 3).map((item) => `- ${item}`),
    "",
    `如果把它压缩成一句底层命题，可以理解为：${source.posterContent.highlight}`,
  ].join("\n");
}

const FALLBACK_ROLE_TRAINING: Record<DecisionRoleType, string> = {
  职场执行者: "把原则用进现实协作的能力",
  个人成长者: "在真实生活里做长期选择的能力",
  决策者: "在复杂系统里做长期决策的能力",
};

function toDecisionTraining(source: StarterBookSource): DecisionScenario[] {
  const bookId = buildDecisionBookId(source.title);

  return source.decisionTraining
    .slice(0, DECISION_ROLE_TYPES.length)
    .map((scenario, index) => {
      const fallbackRoleType = DECISION_ROLE_TYPES[index] ?? DECISION_ROLE_TYPES[0];
      const roleType = scenario.roleType ?? fallbackRoleType;
      const trainingAbility =
        scenario.trainingAbility?.trim() || FALLBACK_ROLE_TRAINING[roleType];

      return {
        id: `${source.id}-decision-${index + 1}`,
        bookId,
        roleType,
        trainingAbility,
        scene: scenario.scene,
        question: scenario.question,
        options: scenario.options,
        feedback: scenario.feedback,
      };
    });
}

function toPosterContent(source: StarterBookSource): PosterContent {
  return {
    hook: source.posterContent.hook,
    summary: source.posterContent.summary,
    insights: source.posterContent.insights,
    actions: source.posterContent.actions,
    highlight: source.posterContent.highlight,
  };
}

function adaptStarterBook(source: StarterBookSource): StarterBookData {
  return {
    id: source.id,
    title: source.title,
    author: source.author,
    coverImage: source.cover,
    recommendation: source.recommendation,
    isStarterBook: true,
    analysis: {
      summary: source.analysis.summary,
      readingGuide: buildReadingGuide(source),
      viewMap: buildViewMap(source),
      actionExtraction: buildActionExtraction(source),
      viewValidation: buildViewValidation(source),
      ideaSourceTracing: buildIdeaSourceTracing(source),
    },
    decisionTraining: toDecisionTraining(source),
    posterContent: toPosterContent(source),
    metadata: {
      category: "认知入门",
    },
  };
}

const starterBookSources: StarterBookSource[] = [
  cognitiveAwakeningSource,
  principlesSource,
  poorCharliesSource,
];

export const starterBooks = starterBookSources.map(adaptStarterBook);

export const starterBooksById = Object.fromEntries(
  starterBooks.map((book) => [book.id, book])
) as Record<string, StarterBookData>;
