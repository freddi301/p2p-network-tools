import React, { useLayoutEffect } from "react";

export function useCallbackOnExternalEvent<K extends keyof DocumentEventMap>(
  containerRef: React.MutableRefObject<HTMLElement | null>,
  type: K,
  callback: () => void
) {
  useLayoutEffect(() => {
    const on = (event: Event) => {
      if (containerRef.current) {
        if (!containerRef.current.contains(event.target as any)) {
          callback();
        }
      }
    };
    document.addEventListener(type, on);
    return () => document.removeEventListener(type, on);
  }, [callback, containerRef, type]);
}
