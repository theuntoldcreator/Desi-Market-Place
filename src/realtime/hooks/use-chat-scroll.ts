import React from 'react';

export function useChatScroll(
  scrollAreaRef: React.RefObject<HTMLElement>,
  messageCount: number
) {
  React.useEffect(() => {
    const scrollAreaElement = scrollAreaRef.current;
    if (scrollAreaElement) {
      const viewportElement = scrollAreaElement.querySelector(
        'div[data-radix-scroll-area-viewport]'
      ) as HTMLElement | null;

      if (viewportElement) {
        const isAtBottom =
          viewportElement.scrollHeight - viewportElement.scrollTop <=
          viewportElement.clientHeight + 50; // 50px buffer

        if (isAtBottom) {
          // Use timeout to allow DOM to update before scrolling
          setTimeout(() => {
            viewportElement.scrollTop = viewportElement.scrollHeight;
          }, 0);
        }
      }
    }
  }, [scrollAreaRef, messageCount]);
}