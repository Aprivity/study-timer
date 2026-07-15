import { FlipDigit } from "./FlipDigit";
import { formatDuration } from "@/lib/time-format";

export function FlipClock({ seconds, animate = true }: { seconds: number; animate?: boolean }) {
  const formatted = formatDuration(seconds);
  return (
    <div className="flip-clock" role="timer" aria-live="off" aria-label={`剩余时间 ${formatted}`}>
      {formatted.split("").map((character, index) => character === ":"
        ? <span className="clock-colon" aria-hidden="true" key={`colon-${index}`}>:</span>
        : <FlipDigit value={character} animate={animate} key={`digit-${index}`} />)}
    </div>
  );
}
