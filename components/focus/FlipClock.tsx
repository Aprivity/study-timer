import { FlipDigit } from "./FlipDigit";
import { formatDuration } from "@/lib/time-format";

export function FlipClock({ seconds, animate = true }: { seconds: number; animate?: boolean }) {
  const formatted = formatDuration(seconds);
  const showsHours = formatted.length === 8;
  return (
    <div className={`flip-clock${showsHours ? " is-hours" : ""}`} role="timer" aria-live="off" aria-label={`剩余时间 ${formatted}`}>
      {formatted.split("").map((character, index) => character === ":"
        ? <span className="clock-colon" aria-hidden="true" key={`colon-${index}`}>:</span>
        : <FlipDigit value={character} animate={animate} key={`digit-${index}`} />)}
    </div>
  );
}
