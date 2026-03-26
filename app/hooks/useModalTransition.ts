import { useCallback, useEffect, useState } from "react";

const DURATION = 200;

/**
 * 控制 Modal 入场/退场动画。
 * mount 后自动触发入场，调用 handleClose 触发退场并在动画结束后执行 onClose 回调。
 */
export function useModalTransition(onClose: () => void) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 下一帧触发入场动画
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, DURATION);
  }, [onClose]);

  const overlayStyle: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transition: `opacity ${DURATION}ms ease`,
  };

  const panelStyle: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)",
    transition: `opacity ${DURATION}ms ease, transform ${DURATION}ms ease`,
  };

  return { isVisible, handleClose, overlayStyle, panelStyle };
}
