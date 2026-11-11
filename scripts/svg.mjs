// Shared SVG helpers: themes, number formatting, card shell.

const THEMES = {
  dark: { text: "#e6edf3", muted: "#8b949e" },
  light: { text: "#1f2328", muted: "#59636e" },
};

const FONT = "'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif";

export function compact(n) {
  const units = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"],
  ];
  for (const [size, suffix] of units) {
    if (n >= size) {
      const value = n / size;
      return `${value >= 100 ? Math.round(value) : value.toFixed(1).replace(/\.0$/, "")}${suffix}`;
    }
  }
  return String(n);
}

export const grouped = (n) => n.toLocaleString("en-GB");

export function escape(text) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Wraps card content with a transparent background, base styles and reduced-motion handling.
export function card({ width, height, theme, title, css = "", body }) {
  const t = THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-label="${escape(title)}">
<title>${escape(title)}</title>
<style>
  text { font-family: ${FONT}; fill: ${t.text}; }
  .muted { fill: ${t.muted}; }
  ${css}
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; opacity: 1 !important; transform: none !important; }
  }
</style>
${body}
</svg>
`;
}
