import type { ReactNode } from "react";

// ── 优先级常量（数字越小越高） ──────────────────────────────────────────────────
export const TOAST_PRIORITY = {
  SYSTEM: 0,     // P0: 删除/撤销/导出失败
  COGNITIVE: 1,  // P1: 决策模式反馈、分析完成提示
  GUIDANCE: 2,   // P2: 浏览引导、训练引导、解析完成引导
  ENTRY: 3,      // P3: 新人礼物、returning user
  INFO: 4,       // P4: 历史整理通知、导出成功引导
} as const;

// ── Toast 类型 ──────────────────────────────────────────────────────────────────
export type GuidanceToast = {
  id: string;
  message: string | ReactNode;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  durationMs?: number;
  priority: number;
  isPersistent?: boolean;
  showCloseButton?: boolean;
  dismissible?: boolean;
  /** 从队列取出、真正显示前的条件校验。返回 false 则丢弃该 toast。 */
  eligibilityCheck?: () => boolean;
};

// ── 调度纯函数 ──────────────────────────────────────────────────────────────────

/** 新 toast 是否应该抢占当前正在显示的 toast（priority 数值更小 = 更高优先级） */
export function shouldPreempt(
  current: GuidanceToast | null,
  incoming: GuidanceToast
): boolean {
  if (!current) return true;
  return incoming.priority < current.priority;
}

/** 将 toast 插入队列（去重 + 按 priority 升序排列），返回新数组 */
export function insertIntoQueue(
  queue: GuidanceToast[],
  toast: GuidanceToast,
  activeId?: string
): GuidanceToast[] {
  if (activeId === toast.id || queue.some((t) => t.id === toast.id)) {
    return queue;
  }
  return [...queue, toast].sort((a, b) => a.priority - b.priority);
}

/** 从队列中找到第一个通过 eligibilityCheck 的 toast，返回其索引；全部不合格返回 -1 */
export function findEligibleIndex(queue: GuidanceToast[]): number {
  return queue.findIndex((t) => !t.eligibilityCheck || t.eligibilityCheck());
}
