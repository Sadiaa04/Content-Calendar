// Data layer. Two modes with the same interface:
//  - local:  everything in this browser's localStorage (no account needed)
//  - cloud:  Supabase, synced across devices, one private list per account
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const CLOUD = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const LOCAL_KEY = "cc.videos.v1";
const CACHE_KEY = "cc.cache.v1";

const FIELDS = {
  id: "id", title: "title", kind: "kind", onScreen: "on_screen", caption: "caption", keywords: "keywords",
  film: "film_date", edit: "edit_date", post: "post_date", time: "post_time",
  filmed: "filmed", edited: "edited", posted: "posted", notes: "notes",
};
function toRow(v) { const r = {}; for (const k in FIELDS) r[FIELDS[k]] = v[k] === "" ? null : v[k]; return r; }
function fromRow(r) {
  const v = {}; for (const k in FIELDS) v[k] = r[FIELDS[k]] ?? "";
  v.filmed = !!r.filmed; v.edited = !!r.edited; v.posted = !!r.posted;
  if (v.time) v.time = String(v.time).slice(0, 5);
  return v;
}
function readJSON(key, fallback) { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; } }
function writeJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

let sb = null;
async function client() {
  if (!sb) {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return sb;
}

export const auth = {
  async user() { if (!CLOUD) return { id: "local", email: "" }; const c = await client(); const { data } = await c.auth.getSession(); return data.session?.user ?? null; },
  async signIn(email, password) { const c = await client(); const { error } = await c.auth.signInWithPassword({ email, password }); if (error) throw error; },
  async signUp(email, password) {
    const c = await client();
    const { data, error } = await c.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) throw error; return { needsConfirm: !data.session };
  },
  async signOut() { const c = await client(); await c.auth.signOut(); try { localStorage.removeItem(CACHE_KEY); } catch {} },
  async onChange(fn) { if (!CLOUD) return; const c = await client(); c.auth.onAuthStateChange((_e, s) => fn(s?.user ?? null)); },
};

export const store = {
  cached() { return CLOUD ? readJSON(CACHE_KEY, null) : readJSON(LOCAL_KEY, null); },
  async list() {
    if (!CLOUD) return readJSON(LOCAL_KEY, []);
    const c = await client();
    const { data, error } = await c.from("videos").select("*").order("post_date", { ascending: true });
    if (error) throw error;
    const items = data.map(fromRow); writeJSON(CACHE_KEY, items); return items;
  },
  async save(v, all) {
    if (!CLOUD) { writeJSON(LOCAL_KEY, all); return v; }
    const c = await client();
    const { error } = await c.from("videos").upsert(toRow(v));
    if (error) throw error; writeJSON(CACHE_KEY, all); return v;
  },
  async saveMany(list, all) {
    if (!CLOUD) { writeJSON(LOCAL_KEY, all); return; }
    const c = await client();
    const { error } = await c.from("videos").upsert(list.map(toRow));
    if (error) throw error; writeJSON(CACHE_KEY, all);
  },
  async remove(id, all) {
    if (!CLOUD) { writeJSON(LOCAL_KEY, all); return; }
    const c = await client();
    const { error } = await c.from("videos").delete().eq("id", id);
    if (error) throw error; writeJSON(CACHE_KEY, all);
  },
  async subscribe(onChange) {
    if (!CLOUD) return;
    const c = await client();
    c.channel("videos-changes").on("postgres_changes", { event: "*", schema: "public", table: "videos" }, () => onChange()).subscribe();
  },
};

export function newId() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ (Math.random() * 16) >> c / 4).toString(16));
}
