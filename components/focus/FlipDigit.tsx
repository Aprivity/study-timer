"use client";

import { useEffect, useRef, useState } from "react";

export function FlipDigit({ value, animate = true }: { value: string; animate?: boolean }) {
  const previousRef = useRef(value);
  const [previous, setPrevious] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (previousRef.current === value) return;
    setPrevious(previousRef.current);
    previousRef.current = value;
    if (!animate) { setFlipping(false); return; }
    setFlipping(false);
    const frame = window.requestAnimationFrame(() => setFlipping(true));
    const timer = window.setTimeout(() => setFlipping(false), 430);
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [animate, value]);

  return (
    <span className={`flip-digit${flipping ? " is-flipping" : ""}`} aria-hidden="true">
      <span className="digit-half digit-top"><span>{value}</span></span>
      <span className="digit-half digit-bottom"><span>{value}</span></span>
      {flipping && <>
        <span className="flip-face flip-face-out"><span>{previous}</span></span>
        <span className="flip-face flip-face-in"><span>{value}</span></span>
      </>}
      <span className="digit-divider" />
    </span>
  );
}
