"use client";

import { useEffect } from "react";

/**
 * Ultra-Lightweight Tilt & Spotlight Physics (Lag-Free & Zero Layout Thrashing)
 * Completely event-driven: zero requestAnimationFrame running on idle.
 */
export function useRabtoTilt() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const card = target?.closest?.(".tilt-card") as HTMLElement | null;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);

      if (card.classList.contains("tilt-card-physics")) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -4;
        const rotateY = ((x - centerX) / centerX) * 4;
        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const card = target?.closest?.(".tilt-card-physics") as HTMLElement | null;
      if (card) {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseout", handleMouseLeave, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseLeave);
    };
  }, []);
}
