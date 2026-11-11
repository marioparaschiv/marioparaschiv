// Terminal-style motion for the TUI card.
// The command is typed, output appears at once like a real terminal, then only the figures move:
// numbers count up and bars grow, finishing together. Counters end with a visible slow tick through
// their last few digits, so they settle onto the value instead of snapping to it.

export const TYPE_START = 0.3;
export const TYPE_STEP = 0.035; // seconds per typed character
export const OUTPUT_PAUSE = 0.05; // "enter": output follows the last typed character almost at once
// Counting: a fast eased run, then the last units tick over with lengthening gaps.
const RUN = 0.6;
const RUN_FRAMES = 18;
const TAIL = [0.06, 0.09, 0.13, 0.18];
export const COUNT_DURATION = RUN + TAIL.reduce((sum, d) => sum + d, 0);
export const COUNT_DELAY = 0.2; // figures hold at zero briefly after the output appears
export const PROMPT_DELAY = 0; // a fast command: the prompt returns in the same frame as the output
// Bars use an expo-style ease-out over the same total time, so their long tail matches the counters'.
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

export const timeline = (commandLength) => {
  const output = TYPE_START + commandLength * TYPE_STEP + OUTPUT_PAUSE;
  return { output, count: output + COUNT_DELAY, done: output + PROMPT_DELAY };
};

const NUMBER = /^(\+?)(\d[\d,]*(?:\.\d+)?)(.*)$/;

function format(value, template) {
  const decimals = template.includes(".") ? template.split(".")[1].length : 0;
  const fixed = value.toFixed(decimals);
  if (!template.includes(",")) return fixed;
  const [whole, fraction] = fixed.split(".");
  return Number(whole).toLocaleString("en-GB") + (fraction ? `.${fraction}` : "");
}

// Renders `render(text)` once per frame, each visible for one frame window, then the final text.
// Non-numeric values render once, statically.
export function counter(value, render, start) {
  const match = NUMBER.exec(value);
  if (!match) return render(value);
  const [, sign, number, unit] = match;
  const target = Number(number.replace(/,/g, ""));
  const decimals = number.includes(".") ? number.split(".")[1].length : 0;
  const step = 10 ** -decimals; // smallest change the display can show

  // [value, duration] pairs. Small numbers have no room for a tail, so they ease over the full time.
  const schedule = [];
  const hasTail = target / step >= TAIL.length * 3;
  const runEnd = hasTail ? target - TAIL.length * step : target;
  const runTime = hasTail ? RUN : COUNT_DURATION;
  for (let k = 0; k < RUN_FRAMES; k++) schedule.push([runEnd * easeOutCubic(k / RUN_FRAMES), runTime / RUN_FRAMES]);
  if (hasTail) TAIL.forEach((duration, i) => schedule.push([target - (TAIL.length - i) * step, duration]));

  const frames = [];
  let t = start;
  schedule.forEach(([n, duration], k) => {
    // Frame 0 also covers the hold before counting starts, so the zero shows as soon as the output does.
    const begin = k === 0 ? t - COUNT_DELAY : t;
    const length = k === 0 ? duration + COUNT_DELAY : duration;
    frames.push(`<g class="f" style="animation: frame ${length.toFixed(3)}s steps(1) ${begin.toFixed(3)}s">${render(`${sign}${format(n, number)}${unit}`)}</g>`);
    t += duration;
  });
  frames.push(`<g class="final" style="animation-delay: ${t.toFixed(3)}s">${render(value)}</g>`);
  return frames.join("");
}

// Bar that grows from its left edge.
export const growStyle = (start) => `animation-delay: ${start.toFixed(2)}s`;

export const motionCss = ({ output, done, typedWidth, commandLength }) => `
  .out { opacity: 0; animation: show 0s ${output.toFixed(2)}s forwards; }
  .done { opacity: 0; animation: show 0s ${done.toFixed(2)}s forwards; }
  .f { opacity: 0; }
  .final { opacity: 0; animation: show 0s forwards; }
  .grow { transform-box: fill-box; transform-origin: left; transform: scaleX(0); animation: grow ${COUNT_DURATION}s ${EASE_OUT} forwards; }
  #typed { animation: type ${(commandLength * TYPE_STEP).toFixed(2)}s steps(${commandLength}, end) ${TYPE_START}s forwards; }
  .cursor { animation: blink 1.1s steps(1) infinite; }
  @keyframes show { to { opacity: 1; } }
  @keyframes frame { from, to { opacity: 1; } }
  @keyframes grow { to { transform: scaleX(1); } }
  @keyframes type { from { width: 0; } to { width: ${typedWidth}px; } }
  @keyframes blink { 50% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .out, .done, .final { animation: none !important; opacity: 1 !important; }
    .f { display: none; }
    .grow { animation: none !important; transform: none !important; }
    #typed { animation: none !important; width: ${typedWidth}px; }
  }`;
