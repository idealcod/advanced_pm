"use client";
import { useEffect, useRef } from "react";

export function Stars() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    for (let i = 0; i < 60; i++) {
      const s = document.createElement("div");
      const size = Math.random() * 2.5 + 0.8;
      s.style.cssText = [
        `position:absolute`,
        `width:${size}px`,
        `height:${size}px`,
        `border-radius:50%`,
        `background:#fff`,
        `left:${Math.random() * 100}%`,
        `top:${Math.random() * 100}%`,
        `animation:twinkle ${2 + Math.random() * 3}s ${Math.random() * 3}s infinite ease-in-out`,
      ].join(";");
      el.appendChild(s);
    }
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 h-72 z-0"
    />
  );
}
