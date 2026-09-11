"use client";

import { useEffect } from "react";

/**
 * Rabto FX Engine — 60fps Mouse-Tethered 3D Card Tilt & Radial Spotlight Physics
 * Directly implements the Rabto interpolation and spotlight system from global-logic-media-builder.
 */
export function useRabtoTilt() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let mouseX = 0;
    let mouseY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;
    let animFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coords (-1 to +1)
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;

      // Update radial spotlight on all tilt-cards
      const cards = document.querySelectorAll<HTMLElement>(".tilt-card");
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
      });
    };

    const animate = () => {
      if (!prefersReducedMotion) {
        // Smooth RAF lerp interpolation
        currentRotationX += (mouseY * 3.5 - currentRotationX) * 0.1;
        currentRotationY += (mouseX * 3.5 - currentRotationY) * 0.1;

        const activeCards = document.querySelectorAll<HTMLElement>(".tilt-card-physics");
        activeCards.forEach((card) => {
          card.style.transform = `perspective(1200px) rotateX(${-currentRotationX}deg) rotateY(${currentRotationY}deg)`;
        });
      }

      animFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    animFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animFrameId);
    };
  }, []);
}
