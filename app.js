import { CLOUD, auth, store, newId } from "./store.js";
import { eventsFor, buildICS, deliverICS } from "./ics.js";

const KINDS = ["Dangerously ___ (Series)", "Taking Notes", "List", "Rant", "GRWM / Beauty", "Skincare", "Overlay", "Other"];
const REACH = ["fyp", "for you", "explore", "explore page", "relatable", "viral", "trending", "reels"];
const STEPS = ["film", "edit", "post"];
const NAMES = { film: "Film", edit: "Edit", post: "Post" };
const DONE = { film: "filmed", edit: "edited", post: "posted" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PREFS_KEY = "cc.prefs.v1";

const S = {
  user: null, items: [], view: "upcoming", month: null, selDay: null,
  sheet: null, editing: null, confirmDel: false, toast: "", loadError: "",
  authMode: "signin", authErr: "", busy: false,
  prefs: Object.assign({ filmTime: "10:00", editTime: "14:00", alertMins: 30 }, readPrefs()),
};
const root = document.getElementById("root");

/* ---------- helpers ---------- */
function readPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } }
function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(S.prefs)); } catch {} }
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return ymd(d); };
const fmt = s => { if (!s) return "No date"; const d = new Date(s + "T12:00:00"); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const short = s => { if (!s) return "—"; const d = new Date(s + "T12:00:00"); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const time12 = t => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}${m ? ":" + pad(m) : ""} ${h < 12 ? "AM" : "PM"}`; };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const next = v => { for (const k of STEPS) if (!v[DONE[k]]) return { k, d: v[k] }; return null; };
const kwList = s => String(s || "").split(",").map(x => x.trim().replace(/^#/, "")).filter(Boolean);
const $ = id => document.getElementById(id);
let toastT;
function toast(msg) { S.toast = msg; render(); clearTimeout(toastT); toastT = setTimeout(() => { S.toast = ""; render(); }, 2600); }

/* ---------- render ---------- */
function render() {
  if (!S.user) { root.innerHTML = authView() + toastView(); return; }
  const t = today();
  let nf = 0, ne = 0, np = 0, late = 0;
  for (const v of S.items) { const n = next(v); if (!n) continue; n.k === "film" ? nf++ : n.k === "edit" ? ne++ : np++; if (n.d && n.d < t) late++; }
  let h = `<div class="wrap"><header class="app"><div><div class="eyebrow">Content Calendar</div><h1>Film, edit, <em>post.</em></h1></div>
    <button class="icon-btn" id="open-settings" aria-label="Settings and reminders">${gear()}</button></header>`;
  if (S.loadError) h += `<div class="banner">${esc(S.loadError)}</div>`;
  if (!CLOUD) h += `<div class="banner info">Saved on this device only. Connect Supabase (see README) to sync with your laptop.</div>`;
  h += `<div class="stats"><div class="stat"><b>${nf}</b><span>To film</span></div><div class="stat"><b>${ne}</b><span>To edit</span></div>
    <div class="stat"><b>${np}</b><span>Ready to post</span></div><div class="stat${late ? " alert" : ""}"><b>${late}</b><span>Overdue</span></div></div>`;
  h += `<div class="bar"><div class="tabs" role="group" aria-label="View">
    ${tab("upcoming", "Up next")}${tab("month", "Month")}${tab("posted", "Posted")}</div>
    <button class="btn" id="add">+ Add video</button></div>`;
  h += S.view === "upcoming" ? upcomingView(t) : S.view === "month" ? monthView(t) : postedView(t);
  h += `</div>`;
  if (S.sheet === "video") h += videoSheet();
  if (S.sheet === "settings") h += settingsSheet();
  root.innerHTML = h + toastView();
}
const tab = (v, label) => `<button data-view="${v}" aria-pressed="${S.view === v}">${label}</button>`;
const toastView = () => S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : "";
const gear = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>`;

function upcomingView(t) {
  const open = S.items.filter(next).map(v => ({ v, n: next(v) }))
    .sort((a, b) => (a.n.d || "9999").localeCompare(b.n.d || "9999"));
  if (!open.length) return `<div class="empty">Nothing waiting. Add the next video you plan to film.</div>`;
  const groups = [];
  for (const o of open) {
    const key = o.n.d && o.n.d < t ? "late" : (o.n.d || "none");
    if (!groups.length || groups.at(-1).key !== key) groups.push({ key, list: [] });
    groups.at(-1).list.push(o.v);
  }
  return groups.map(g => {
    let cls = "", label, dl = "";
    if (g.key === "late") { cls = "late"; label = "Overdue"; }
    else if (g.key === "none") label = "No date yet";
    else if (g.key === t) { cls = "today"; label = "Today"; dl = fmt(g.key); }
    else if (g.key === addDays(t, 1)) { label = "Tomorrow"; dl = fmt(g.key); }
    else label = fmt(g.key);
    return `<section class="day ${cls}"><h2>${label}${dl ? ` <span class="d">${dl}</span>` : ""}</h2>${g.list.map(v => card(v, t)).join("")}</section>`;
  }).join("");
}
function postedView(t) {
  const done = S.items.filter(v => !next(v)).sort((a, b) => (b.post || "").localeCompare(a.post || ""));
  if (!done.length) return `<div class="empty">Posted videos land here once you tick Post.</div>`;
  return `<section class="day">${done.map(v => card(v, t)).join("")}</section>`;
}
function monthView(t) {
  const m = S.month || t.slice(0, 7);
  const [y, mo] = m.split("-").map(Number);
  const first = new Date(y, mo - 1, 1);
  const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7)); // Monday first
  const byDay = {};
  for (const v of S.items) for (const k of STEPS) if (v[k]) (byDay[v[k]] ||= []).push({ v, k, done: v[DONE[k]] });
  let cells = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i); const s = ymd(d);
    if (i === 35 && d.getMonth() !== mo - 1) break;
    const ev = byDay[s] || [];
    const cls = ["cell", d.getMonth() !== mo - 1 && "out", s === t && "today", s === S.selDay && "sel"].filter(Boolean).join(" ");
    cells += `<button class="${cls}" data-day="${s}" aria-label="${fmt(s)}, ${ev.length} item${ev.length === 1 ? "" : "s"}"><span class="num">${d.getDate()}</span>
      ${ev.slice(0, 3).map(e => `<span class="pill ${e.k}${e.done ? " done" : ""}">${NAMES[e.k]} · ${esc(e.v.title)}</span>`).join("")}
      ${ev.length > 3 ? `<span class="more">+${ev.length - 3} more</span>` : ""}</button>`;
  }
  let h = `<div class="month"><div class="mhead"><h2>${MONTHS[mo - 1]} ${y}</h2><div class="nav">
    <button class="ghost sm" data-month="-1" aria-label="Previous month">‹</button><button class="ghost sm" data-month="0">Today</button><button class="ghost sm" data-month="1" aria-label="Next month">›</button></div></div>
    <div class="grid">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(x => `<div class="dow">${x}</div>`).join("")}${cells}</div>
    <div class="legend"><span><i style="background:var(--film)"></i>Film</span><span><i style="background:var(--edit)"></i>Edit</span><span><i style="background:var(--post)"></i>Post</span></div></div>`;
  if (S.selDay) {
    const vids = [...new Set((byDay[S.selDay] || []).map(e => e.v))];
    h += `<section class="day"><h2>${S.selDay === t ? "Today" : fmt(S.selDay)}</h2>${vids.length ? vids.map(v => card(v, t)).join("") : `<div class="empty">Nothing planned. <button class="link" data-addon="${S.selDay}">Plan a video for this day</button></div>`}</section>`;
  }
  return h;
}
function card(v, t) {
  const n = next(v);
  let h = `<article class="card"><div class="top"><div><div class="kind">${esc(v.kind)}</div><div class="title">${esc(v.title)}</div>`;
  if (v.onScreen) h += `<div class="screen">On screen: ${esc(v.onScreen)}</div>`;
  h += `</div><button class="ghost sm" data-edit="${esc(v.id)}">Edit</button></div><div class="steps">`;
  for (const k of STEPS) {
    const d = v[DONE[k]];
    let c = "step" + (d ? " done" : "");
    if (!d && n && n.k === k) c += v[k] && v[k] < t ? " late" : " next";
    const tt = short(v[k]) + (k === "post" && v.time ? " · " + time12(v.time).replace(" ", " ") : "");
    h += `<button class="${c}" data-tog="${esc(v.id)}" data-k="${k}" aria-pressed="${!!d}" aria-label="${NAMES[k]} ${d ? "done" : "not done"}, ${tt}">
      <span class="n"><i>${d ? "✓" : ""}</i>${NAMES[k]}</span><span class="t">${tt}</span></button>`;
  }
  h += `</div>`;
  const hasCap = v.caption || kwList(v.keywords).length;
  if (v.notes || hasCap) {
    h += `<div class="foot">${v.notes ? `<div class="notes">${esc(v.notes)}</div>` : ""}
      ${hasCap ? `<span class="tag">Caption ready</span><button class="link" data-copy="${esc(v.id)}">Copy caption</button>` : ""}</div>`;
  }
  return h + `</article>`;
}

function videoSheet() {
  const e = S.editing, isNew = !S.items.some(i => i.id === e.id);
  const opts = KINDS.concat(KINDS.includes(e.kind) ? [] : [e.kind]).map(k => `<option${k === e.kind ? " selected" : ""}>${esc(k)}</option>`).join("");
  return `<div class="scrim" id="scrim"><form class="sheet" id="video-form" aria-label="Video details">
    <h3>${isNew ? "New video" : "Edit video"}</h3>
    <div class="f"><label for="f-title">Title</label><input id="f-title" required value="${esc(e.title)}" placeholder="How to become dangerously…"></div>
    <div class="row"><div class="f"><label for="f-kind">Type</label><select id="f-kind">${opts}</select></div>
      <div class="f"><label for="f-time">Post time</label><input id="f-time" type="time" value="${esc(e.time)}"></div></div>
    <div class="f"><label for="f-screen">On-screen text</label><input id="f-screen" value="${esc(e.onScreen)}"></div>
    <div class="row3"><div class="f"><label for="f-film">Film</label><input id="f-film" type="date" value="${esc(e.film)}"></div>
      <div class="f"><label for="f-edit">Edit</label><input id="f-edit" type="date" value="${esc(e.edit)}"></div>
      <div class="f"><label for="f-post">Post</label><input id="f-post" type="date" value="${esc(e.post)}"></div></div>
    <h4>Caption</h4>
    <div class="f"><label for="f-caption">Caption</label><textarea id="f-caption" rows="4" placeholder="Add something the video doesn't already say.">${esc(e.caption)}</textarea></div>
    <div class="f"><label for="f-keywords"><span>Keywords</span><button type="button" class="link" id="add-reach">+ Reach keywords</button></label>
      <textarea id="f-keywords" rows="2" placeholder="confidence, eldest daughter, grwm">${esc(e.keywords)}</textarea>
      <span class="hint">Separate with commas. Copied as {keyword, keyword}.</span></div>
    <div class="f"><label for="f-notes">Notes</label><textarea id="f-notes" rows="3">${esc(e.notes)}</textarea></div>
    <div class="acts">${isNew ? "<span></span>" : `<button type="button" class="danger" id="del">${S.confirmDel ? "Tap again to delete" : "Delete"}</button>`}
      <div class="r">${isNew ? "" : `<button type="button" class="ghost" id="remind-one">Add reminders</button>`}
      <button type="button" class="ghost" id="cancel">Cancel</button><button type="submit" class="btn" ${S.busy ? "disabled" : ""}>Save</button></div></div>
  </form></div>`;
}
function settingsSheet() {
  const p = S.prefs;
  const upcoming = S.items.filter(next).length;
  return `<div class="scrim" id="scrim"><form class="sheet" id="settings-form" aria-label="Settings">
    <h3>Reminders</h3>
    <p class="hint">Reminders go into your phone's Calendar app, with an alert before each step. Add them again after you change dates; your calendar replaces the old ones.</p>
    <div class="row3"><div class="f"><label for="p-film">Film at</label><input id="p-film" type="time" value="${esc(p.filmTime)}"></div>
      <div class="f"><label for="p-edit">Edit at</label><input id="p-edit" type="time" value="${esc(p.editTime)}"></div>
      <div class="f"><label for="p-alert">Alert before</label><select id="p-alert">${[0, 15, 30, 60, 120].map(m => `<option value="${m}"${+p.alertMins === m ? " selected" : ""}>${m ? m + " min" : "At start"}</option>`).join("")}</select></div></div>
    <p class="hint">Posts use each video's own post time.</p>
    <button type="button" class="btn" id="remind-all" ${upcoming ? "" : "disabled"}>Add all upcoming to my calendar (${upcoming})</button>
    <h4>Install</h4>
    <p class="hint">iPhone: open this site in Safari, tap Share, then Add to Home Screen. Android: tap the ⋮ menu, then Install app.</p>
    <h4>Account</h4>
    <p class="hint">${CLOUD ? `Signed in as ${esc(S.user.email)}. Syncs across your devices.` : "This device only. Nothing is uploaded."}</p>
    <div class="acts">${CLOUD ? `<button type="button" class="danger" id="signout">Sign out</button>` : "<span></span>"}
      <div class="r"><button type="button" class="ghost" id="cancel">Close</button><button type="submit" class="btn">Save</button></div></div>
  </form></div>`;
}
function authView() {
  const up = S.authMode === "signup";
  return `<div class="wrap"><form class="auth" id="auth-form">
    <div class="eyebrow">Content Calendar</div><h1>Film, edit, <em>post.</em></h1>
    <p>${up ? "Create your account. Your calendar syncs to every device you sign in on." : "Sign in to see your calendar."}</p>
    <div class="f"><label for="a-email">Email</label><input id="a-email" type="email" autocomplete="email" required></div>
    <div class="f"><label for="a-pass">Password</label><input id="a-pass" type="password" minlength="6" autocomplete="${up ? "new-password" : "current-password"}" required></div>
    ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ""}
    <button class="btn" type="submit" ${S.busy ? "disabled" : ""}>${up ? "Create account" : "Sign in"}</button>
    <button class="link" type="button" id="auth-switch">${up ? "I already have an account" : "New here? Create an account"}</button>
  </form></div>`;
}

/* ---------- data ---------- */
async function load() {
  try { S.items = await store.list(); S.loadError = ""; }
  catch (e) { S.loadError = navigator.onLine ? `Couldn't load your videos: ${e.message}` : "You're offline. Showing your last saved copy."; S.items = store.cached() || S.items; }
  await seedIfEmpty(); render();
}
async function seedIfEmpty() {
  const flag = "cc.seeded." + S.user.id;
  try { if (S.items.length || localStorage.getItem(flag)) return; localStorage.setItem(flag, "1"); } catch { return; }
  const t = today();
  const base = { kind: KINDS[0], onScreen: "", caption: "", keywords: "", time: "18:00", filmed: true, edited: false, posted: false, notes: "Filmed as a GRWM talking video." };
  const seeds = [
    { ...base, id: newId(), title: "How to become dangerously confident", film: t, edit: addDays(t, 1), post: addDays(t, 5) },
    { ...base, id: newId(), title: "How to become dangerously unbothered", film: t, edit: addDays(t, 3), post: addDays(t, 12) },
  ];
  for (const v of seeds) { S.items.push(v); try { await store.save(v, S.items); } catch {} }
}
async function persist(v, rollback) {
  try { await store.save(v, S.items); }
  catch (e) { rollback(); render(); toast(navigator.onLine ? "Couldn't save. Try again." : "You're offline. Changes weren't saved."); }
}

/* ---------- events ---------- */
root.addEventListener("click", async ev => {
  if (ev.target.id === "scrim") return closeSheet();
  const b = ev.target.closest("button"); if (!b) return;
  const d = b.dataset;
  if (d.view) { S.view = d.view; render(); return; }
  if (b.id === "add" || d.addon) { openNew(d.addon); return; }
  if (b.id === "open-settings") { S.sheet = "settings"; render(); return; }
  if (b.id === "cancel") return closeSheet();
  if (b.id === "auth-switch") { S.authMode = S.authMode === "signup" ? "signin" : "signup"; S.authErr = ""; render(); return; }
  if (d.month !== undefined) {
    if (d.month === "0") { S.month = null; S.selDay = today(); }
    else { const [y, m] = (S.month || today().slice(0, 7)).split("-").map(Number); const nd = new Date(y, m - 1 + Number(d.month), 1); S.month = `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}`; }
    render(); return;
  }
  if (d.day) { S.selDay = S.selDay === d.day ? null : d.day; render(); return; }
  if (d.edit) { S.editing = { ...S.items.find(i => i.id === d.edit) }; S.confirmDel = false; S.sheet = "video"; render(); return; }
  if (d.tog) {
    const v = S.items.find(i => i.id === d.tog), before = { ...v }, f = DONE[d.k];
    v[f] = !v[f];
    if (v[f]) { if (d.k !== "film") v.filmed = true; if (d.k === "post") v.edited = true; }
    else { if (d.k === "film") { v.edited = false; v.posted = false; } if (d.k === "edit") v.posted = false; }
    render(); persist(v, () => Object.assign(v, before)); return;
  }
  if (d.copy) { copyCaption(S.items.find(i => i.id === d.copy)); return; }
  if (b.id === "add-reach") {
    const el = $("f-keywords"), have = kwList(el.value);
    el.value = have.concat(REACH.filter(k => !have.includes(k))).join(", "); return;
  }
  if (b.id === "del") {
    if (!S.confirmDel) { S.confirmDel = true; render(); return; }
    const id = S.editing.id, before = S.items;
    S.items = S.items.filter(i => i.id !== id); S.sheet = null; S.editing = null; S.confirmDel = false; render();
    try { await store.remove(id, S.items); toast("Deleted"); } catch { S.items = before; render(); toast("Couldn't delete. Try again."); }
    return;
  }
  if (b.id === "remind-one") { readVideoForm(); const n = await remind([S.editing], S.editing.title); if (n) closeSheet(); return; }
  if (b.id === "remind-all") { readPrefsForm(); savePrefs(); await remind(S.items.filter(next), "content-calendar"); return; }
  if (b.id === "signout") { await auth.signOut(); S.user = null; S.items = []; S.sheet = null; render(); return; }
});
root.addEventListener("submit", async ev => {
  ev.preventDefault();
  const id = ev.target.id;
  if (id === "video-form") {
    const e = readVideoForm();
    const i = S.items.findIndex(x => x.id === e.id), before = i < 0 ? null : S.items[i];
    if (i < 0) S.items.push(e); else S.items[i] = e;
    S.sheet = null; S.editing = null; render();
    persist(e, () => { if (before) S.items[S.items.findIndex(x => x.id === e.id)] = before; else S.items = S.items.filter(x => x.id !== e.id); });
  } else if (id === "settings-form") {
    readPrefsForm(); savePrefs(); S.sheet = null; render(); toast("Saved");
  } else if (id === "auth-form") {
    const email = $("a-email").value.trim(), pass = $("a-pass").value;
    S.busy = true; S.authErr = ""; render(); $("a-email").value = email;
    try {
      if (S.authMode === "signup") {
        const r = await auth.signUp(email, pass);
        if (r.needsConfirm) { S.busy = false; S.authMode = "signin"; S.authErr = ""; render(); toast("Check your email to confirm, then sign in."); return; }
      } else await auth.signIn(email, pass);
      S.user = await auth.user(); S.busy = false; await load();
    } catch (err) { S.busy = false; S.authErr = err.message || "Something went wrong."; render(); $("a-email").value = email; }
  }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && S.sheet) closeSheet(); });

function closeSheet() { S.sheet = null; S.editing = null; S.confirmDel = false; render(); }
function openNew(day) {
  const t = day || today();
  S.editing = { id: newId(), title: "", kind: KINDS[0], onScreen: "", caption: "", keywords: "", film: t, edit: addDays(t, 1), post: addDays(t, 3),
    time: "18:00", filmed: false, edited: false, posted: false, notes: "" };
  S.confirmDel = false; S.sheet = "video"; render(); $("f-title").focus();
}
function readVideoForm() {
  const e = S.editing;
  e.title = $("f-title").value.trim() || "Untitled video"; e.kind = $("f-kind").value; e.time = $("f-time").value;
  e.onScreen = $("f-screen").value.trim(); e.film = $("f-film").value; e.edit = $("f-edit").value; e.post = $("f-post").value;
  e.caption = $("f-caption").value.trim(); e.keywords = kwList($("f-keywords").value).join(", "); e.notes = $("f-notes").value.trim();
  return e;
}
function readPrefsForm() { S.prefs = { filmTime: $("p-film").value || "10:00", editTime: $("p-edit").value || "14:00", alertMins: +$("p-alert").value }; }
async function remind(videos, name) {
  const events = videos.flatMap(v => eventsFor(v, S.prefs));
  if (!events.length) { toast("Nothing left to remind you about."); return 0; }
  const fname = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + ".ics";
  const r = await deliverICS(buildICS(events, S.prefs.alertMins), fname);
  if (r !== "cancelled") toast(r === "shared" ? "Pick Calendar to add the reminders" : "Open the downloaded file to add the reminders");
  return events.length;
}
async function copyCaption(v) {
  const kws = kwList(v.keywords);
  const text = [v.caption, kws.length ? `{${kws.join(", ")}}` : ""].filter(Boolean).join("\n\n");
  try { await navigator.clipboard.writeText(text); toast("Caption copied"); } catch { toast("Couldn't copy. Open Edit and copy it there."); }
}

/* ---------- start ---------- */
(async function start() {
  const cached = store.cached(); if (cached) S.items = cached;
  try { S.user = await auth.user(); } catch { S.user = null; S.loadError = "Couldn't reach the server."; }
  render();
  if (S.user) { await load(); store.subscribe(() => load()); }
  auth.onChange(u => { if (u && !S.user) { S.user = u; load(); } });
  window.addEventListener("online", () => S.user && load());
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
