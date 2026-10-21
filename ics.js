// Builds calendar files (.ics) so film / edit / post days land in the phone's
// own Calendar app with an alert. Works on iPhone, Android and laptops.
const STEP = { film: "Film", edit: "Edit", post: "Post" };
const DONE = { film: "filmed", edit: "edited", post: "posted" };

function esc(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
function stamp(date, time) { return date.replace(/-/g, "") + "T" + (time || "10:00").replace(":", "") + "00"; }
function plusHour(date, time) {
  const d = new Date(`${date}T${time || "10:00"}:00`); d.setHours(d.getHours() + 1);
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}
function fold(line) { const out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = " " + line.slice(74); } out.push(line); return out.join("\r\n"); }

// prefs: { filmTime, editTime, alertMins }
export function eventsFor(v, prefs) {
  const out = [];
  for (const k of ["film", "edit", "post"]) {
    if (v[DONE[k]] || !v[k]) continue;
    const time = k === "post" ? (v.time || "18:00") : (k === "film" ? prefs.filmTime : prefs.editTime);
    out.push({
      uid: `${v.id}-${k}@content-calendar`,
      start: stamp(v[k], time), end: plusHour(v[k], time),
      summary: `${STEP[k]}: ${v.title}`,
      desc: [v.onScreen && `On screen: ${v.onScreen}`, v.notes].filter(Boolean).join("\n"),
    });
  }
  return out;
}

export function buildICS(events, alertMins) {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Content Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${now}`, `DTSTART:${e.start}`, `DTEND:${e.end}`,
      `SUMMARY:${esc(e.summary)}`);
    if (e.desc) lines.push(`DESCRIPTION:${esc(e.desc)}`);
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.summary)}`,
      `TRIGGER:-PT${Math.max(0, alertMins | 0)}M`, "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

// Hand the file to the device: share sheet on phones (pick Calendar), download elsewhere.
export async function deliverICS(text, filename) {
  const file = new File([text], filename, { type: "text/calendar" });
  if (navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await navigator.share({ files: [file], title: filename }); return "shared"; }
    catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
