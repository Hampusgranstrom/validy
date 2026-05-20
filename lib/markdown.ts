// Lightweight, dependency-free markdown -> HTML renderer.
// Supports: headings (#..####), bold/italic, inline code, lists, tables, paragraphs, line breaks.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return out;
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // Table
    if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[-:\s|]+\|?\s*$/.test(lines[i + 1])) {
      const header = line.split("|").map((s) => s.trim()).filter((_, idx, arr) => !(idx === 0 && arr[0] === "") && !(idx === arr.length - 1 && arr[arr.length - 1] === ""));
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /\|/.test(lines[i]) && !/^\s*$/.test(lines[i])) {
        const cells = lines[i].split("|").map((s) => s.trim());
        if (cells[0] === "") cells.shift();
        if (cells[cells.length - 1] === "") cells.pop();
        rows.push(cells);
        i++;
      }
      out.push("<table><thead><tr>" + header.map((h) => `<th>${inline(h)}</th>`).join("") + "</tr></thead><tbody>");
      for (const r of rows) {
        out.push("<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>");
      }
      out.push("</tbody></table>");
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      out.push("<ul>");
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        out.push("<li>" + inline(lines[i].replace(/^\s*[-*]\s+/, "")) + "</li>");
        i++;
      }
      out.push("</ul>");
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      out.push("<ol>");
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        out.push("<li>" + inline(lines[i].replace(/^\s*\d+\.\s+/, "")) + "</li>");
        i++;
      }
      out.push("</ol>");
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        parts.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push("<blockquote>" + inline(parts.join(" ")) + "</blockquote>");
      continue;
    }

    // Paragraph
    const para: string[] = [line];
    i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,4}\s|[-*]\s|\d+\.\s|>\s|\|)/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    out.push("<p>" + inline(para.join(" ")) + "</p>");
  }

  return out.join("");
}
