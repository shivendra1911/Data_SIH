"use client";

import React, { useEffect } from "react";

export default function RabtoFXProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.innerWidth < 768) return; // Desktop only for performance

    let rafId: number | null = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let activeCard: HTMLElement | null = null;
    let isScrolling = false;
    let scrollTimeout: NodeJS.Timeout;

    const onScroll = () => {
      isScrolling = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 120);
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.14;
      currentY += (targetY - currentY) * 0.14;

      if (activeCard) {
        const rotX = -currentY * 7;
        const rotY = currentX * 7;
        activeCard.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      }

      const isStillMoving =
        activeCard !== null || Math.abs(currentX) > 0.01 || Math.abs(currentY) > 0.01;

      if (isStillMoving) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    const ensureLoop = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isScrolling) return; // Skip during active scroll to prioritize 120fps scrolling

      const card = (e.target as HTMLElement)?.closest?.(".tilt-card") as HTMLElement | null;
      if (card) {
        if (activeCard && activeCard !== card) {
          activeCard.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
        }
        activeCard = card;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);

        // Normalized relative to card center (-1 to 1)
        targetX = (x / rect.width - 0.5) * 2;
        targetY = (y / rect.height - 0.5) * 2;
        ensureLoop();
      } else {
        if (activeCard) {
          activeCard.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
          activeCard = null;
          ensureLoop();
        }
        targetX = 0;
        targetY = 0;
      }
    };

    const handleMouseLeave = () => {
      if (activeCard) {
        activeCard.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
        activeCard = null;
        ensureLoop();
      }
      targetX = 0;
      targetY = 0;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(scrollTimeout);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (activeCard) {
        activeCard.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
      }
    };
  }, []);

  return <>{children}</>;
}
