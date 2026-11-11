// Terminal-style motion for the TUI card.
// The command is typed, output appears at once like a real terminal, then only the figures move:
// numbers count up and bars grow, both on the same strong ease-out so they land together.

export const TYPE_START = 0.3;
export const TYPE_STEP = 0.035; // seconds per typed character
export const OUTPUT_PAUSE = 0.25; // gap between "enter" and the output appearing
export const COUNT_DURATION = 0.8;
const FRAMES = 24;

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
// Close match to the curve above for sampling counter frames.
const easeOut = (t) => 1 - (1 - t) ** 5;

export const timeline = (commandLength) => {
  const output = TYPE_START + commandLength * TYPE_STEP + OUTPUT_PAUSE;
  return { output, done: output + COUNT_DURATION };
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
  const frame = COUNT_DURATION / FRAMES;
  const frames = [];
  for (let k = 0; k < FRAMES; k++) {
    const text = `${sign}${format(target * easeOut(k / FRAMES), number)}${unit}`;
    frames.push(`<g class="f" style="animation: frame ${frame.toFixed(3)}s steps(1) ${(start + k * frame).toFixed(3)}s">${render(text)}</g>`);
  }
  frames.push(`<g class="final" style="animation-delay: ${(start + COUNT_DURATION).toFixed(3)}s">${render(value)}</g>`);
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
