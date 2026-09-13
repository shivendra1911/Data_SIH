"use client";

import { useEffect } from "react";

export function useScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            entry.target.classList.remove("is-scrolled-out");
          } else {
            entry.target.classList.remove("is-visible");
            if (entry.boundingClientRect.top < 0) {
              entry.target.classList.add("is-scrolled-out");
            } else {
              entry.target.classList.remove("is-scrolled-out");
            }
          }
        });
      },
      {
        threshold: [0.15, 0.85],
        rootMargin: "-10px 0px -30px 0px",
      }
    );

    const observeAll = () => {
      const elements = document.querySelectorAll(".text-in-out");
      elements.forEach((el) => observer.observe(el));
    };

    observeAll();

    return () => {
      observer.disconnect();
    };
  }, []);
}
