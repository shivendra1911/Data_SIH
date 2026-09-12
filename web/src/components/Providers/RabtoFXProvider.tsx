"use client";

import React, { useEffect } from "react";

export default function RabtoFXProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.innerWidth < 768) return; // Desktop only for performance

    let rafId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let activeCard: HTMLElement | null = null;

    const handleMouseMove = (e: MouseEvent) => {
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
      } else {
        if (activeCard) {
          activeCard.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
          activeCard = null;
        }
        targetX = 0;
        targetY = 0;
      }
    };

    const handleMouseLeave = () => {
      if (activeCard) {
        activeCard.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
        activeCard = null;
      }
      targetX = 0;
      targetY = 0;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.14;
      currentY += (targetY - currentY) * 0.14;

      if (activeCard) {
        const rotX = -currentY * 7;
        const rotY = currentX * 7;
        activeCard.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafId);
      if (activeCard) {
        activeCard.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
      }
    };
  }, []);

  return <>{children}</>;
}
