/**
 * Build a minimal, spec-compliant iCalendar file for a single task.
 * Handles CRLF line endings, escaping, and all-day event conventions.
 */

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatDate(date: Date): string {
  // All-day DATE value: YYYYMMDD
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatTimestamp(date: Date): string {
  // UTC timestamp: YYYYMMDDTHHMMSSZ
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Fold long lines at 75 octets per RFC 5545.
 * Required for spec-compliance; some clients are strict.
 */
function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const chunks: string[] = [];
  let current = "";

  for (const char of line) {
    if (Buffer.byteLength(current + char, "utf8") > 73) {
      chunks.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) chunks.push(current);

  return (
    chunks[0] +
    chunks
      .slice(1)
      .map((c) => "\r\n " + c)
      .join("")
  );
}

export type TaskIcsInput = {
  id: string;
  title: string;
  description?: string | null;
  startDate?: string | null; // "YYYY-MM-DD"
  dueDate?: string | null; // "YYYY-MM-DD"
  projectName?: string | null;
};

export function buildTaskIcs(task: TaskIcsInput): string {
  // Prefer dueDate, fall back to startDate, then today
  const dateStr =
    task.dueDate ?? task.startDate ?? new Date().toISOString().split("T")[0];

  const start = new Date(dateStr + "T00:00:00Z");
  // All-day events: DTEND is exclusive (next day)
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const now = formatTimestamp(new Date());

  const descriptionParts: string[] = [];
  if (task.description) descriptionParts.push(task.description);
  if (task.projectName) descriptionParts.push(`Project: ${task.projectName}`);
  const description = descriptionParts.join("\n\n") || task.title;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TaskFlow//Task Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:task-${task.id}@taskflow`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${formatDate(start)}`,
    `DTEND;VALUE=DATE:${formatDate(end)}`,
    `SUMMARY:${escapeText(task.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `STATUS:CONFIRMED`,
    `TRANSP:OPAQUE`,
    `BEGIN:VALARM`,
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(task.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function icsFilename(title: string): string {
  const safe = title
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${safe || "task"}.ics`;
}
