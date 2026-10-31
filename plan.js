// The Nov 2 – Dec 31, 2026 growth plan ("Road to 1K"), as videos the app can add in one tap.
// Rhythm: Mon + Thu listicle, Tue "Substack said it better", Wed psychology ("Let me explain"),
// Fri carousel (no filming), Sat quote reel. Everything is filmed the Sunday before, and edited the day before it posts.
// Each video gets a fixed id, so adding the plan twice never creates duplicates.

const K = {
  list: "List",
  sub: "Substack said it better (Series)",
  psy: "Let me explain (Psychology)",
  car: "Carousel",
  quote: "Quote",
  bip: "Building in public",
};
const SCRIPTS = "Scripts: Scripts project → ";
const NEW_B = "New listicle: ask the brain-dump thread for the next Category B script.";
const NEW_A = "New Category A script: ask the brain-dump thread.";
const CAROUSEL = "Make slides from Monday's listicle: hook on slide 1, one tip per slide, 'save this' on the last. No filming.";

// [weekday offset from Monday, kind, title, on-screen text, notes]
const WEEKS = [
  ["2026-11-02", [
    [0, K.list, "Procrastination isn't laziness", "Procrastination isn't laziness. It's an emotion problem.", SCRIPTS + "brain-dump-scripts/scripts.md (B2)"],
    [1, K.sub, "Substack said it better · part 1: You're not a rotting fig", "these aren't your best years", SCRIPTS + "substack-scripts/05 (part 1). End with: follow for part 2."],
    [2, K.psy, "Why your mind grows weeds on its own", "Why your mind grows weeds on its own", SCRIPTS + "brain-dump-scripts/scripts.md (A2)"],
    [3, K.list, "Red flags that are actually green flags", "Red flags that are actually green flags (psychology edition)", SCRIPTS + "brain-dump-scripts/scripts.md (B4)"],
    [4, K.car, "Carousel: procrastination fixes", "Procrastination isn't laziness", CAROUSEL],
    [5, K.quote, "Quote reel: you're not a rotting fig", "you're not a rotting fig. you're just getting started.", "Big serif line over your face or the sky. 10 seconds."],
  ]],
  ["2026-11-09", [
    [0, K.list, "Things to steal from Sherlock Holmes", "Things to steal from Sherlock Holmes (how to notice everything)", SCRIPTS + "brain-dump-scripts/scripts.md (B3)"],
    [1, K.sub, "Substack said it better · part 2: You're still becoming", "you're not lost", SCRIPTS + "substack-scripts/05 (part 2)"],
    [2, K.psy, "Why you never see the whole truth", "Why you never see the whole truth", SCRIPTS + "brain-dump-scripts/scripts.md (A3)"],
    [3, K.list, "New listicle (B5)", "", NEW_B],
    [4, K.car, "Carousel: red flags → green flags", "Red flags that are actually green flags", CAROUSEL],
    [5, K.quote, "Quote reel: impact isn't worth", "impact isn't the same as worth. you were already enough.", "Big serif line over your face or the sky."],
  ]],
  ["2026-11-16", [
    [0, K.list, "New listicle", "", NEW_B],
    [1, K.sub, "Substack said it better · part 3: You're not a bad friend", "you're not a bad friend", SCRIPTS + "substack-scripts/05 (part 3)"],
    [2, K.psy, "New 'Let me explain' reel", "", NEW_A],
    [3, K.list, "New listicle (same style as your best one so far)", "", "Reuse the hook style of whichever reel got the most follows in weeks 1–2."],
    [4, K.car, "Carousel from Monday's listicle", "", CAROUSEL],
    [5, K.quote, "Quote reel: growing apart", "growing apart isn't the same as growing up.", "Big serif line over your face or the sky."],
  ]],
  ["2026-11-23", [
    [0, K.list, "New listicle", "", NEW_B],
    [1, K.sub, "Substack said it better · part 4: your own take", "", "Built from YOUR notes on the week-1 reading (Gor, 'the loneliness in your twenties')."],
    [2, K.psy, "New 'Let me explain' reel", "", NEW_A],
    [3, K.list, "New listicle", "", NEW_B],
    [4, K.car, "Carousel from Monday's listicle", "", CAROUSEL],
    [5, K.quote, "Quote reel from part 4", "", "Best line from Tuesday's reel."],
  ]],
  ["2026-11-30", [
    [0, K.list, "New listicle", "", NEW_B + " Nov 30 check-in: are you near 530 followers?"],
    [1, K.sub, "Substack said it better · part 5", "", "From this week's reading."],
    [2, K.list, "Best format of November (extra slot)", "", "Use whichever format brought the most follows in November."],
    [3, K.list, "New listicle (try making it a numbered series)", "", "e.g. 'psychology tricks that feel illegal to know, part 1'. End with: follow for part 2."],
    [4, K.car, "Carousel from Monday's listicle", "", CAROUSEL],
    [5, K.quote, "Quote reel from part 5", "", "Best line from Tuesday's reel."],
  ]],
  ["2026-12-07", [
    [0, K.list, "Tough love: people pleasing", "", "Bold, validating hook, like 'you're not difficult, you just stopped people pleasing'."],
    [1, K.sub, "Substack said it better · part 6", "", "From this week's reading."],
    [2, K.psy, "Tough love: boundaries (Let me explain)", "", NEW_A],
    [3, K.list, "Tough love: feeling behind", "", "Bold, validating hook."],
    [4, K.car, "Carousel from Monday's listicle", "", CAROUSEL],
    [5, K.quote, "Answer your Questions box", "", "Pick the best answer from this week's 'what do you need to hear?' story."],
  ]],
  ["2026-12-14", [
    [0, K.list, "Things to stop doing before 2027 (psychology edition)", "Things to stop doing before 2027", "Dec 15 check-in: are you near 750 followers?"],
    [1, K.sub, "Substack said it better · part 7", "", "From this week's reading."],
    [2, K.psy, "New 'Let me explain' reel", "", NEW_A],
    [3, K.bip, "What I learned posting every day for 7 weeks", "", "Building in public: honest numbers and lessons."],
    [4, K.car, "Carousel: 5 Substack essays that changed how I think this year", "", "Roundup: one essay per slide. No filming."],
    [5, K.quote, "Quote reel from part 7", "", "Best line from Tuesday's reel."],
  ]],
  ["2026-12-21", [
    [0, K.list, "New listicle", "", "Holiday week: just Mon, Tue and Thu. Film these early."],
    [1, K.sub, "Substack said it better · part 8", "", "From this week's reading."],
    [3, K.list, "New listicle", "", NEW_B],
  ]],
  ["2026-12-28", [
    [0, K.list, "New year, new mind: psychology habits for 2027", "Psychology habits for 2027", "Film before the holidays."],
    [1, K.sub, "Substack said it better · part 9", "", "From this week's reading."],
    [3, K.bip, "I posted every day for 2 months to see what would happen", "", "Recap reel + thank-you story with your follower count."],
  ]],
];

const pad = n => String(n).padStart(2, "0");
const shift = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

// Stable UUID from a string (FNV-1a based), so each plan slot always gets the same id.
function stableId(str) {
  let hex = "";
  for (let seed = 0; hex.length < 32; seed++) {
    let h = 0x811c9dc5 ^ seed;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    hex += h.toString(16).padStart(8, "0");
  }
  hex = hex.slice(0, 32).split("");
  hex[12] = "4"; hex[16] = "89ab"[parseInt(hex[16], 16) % 4];
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

export const PLAN_KINDS = Object.values(K);

export function planVideos() {
  const out = [];
  for (const [monday, slots] of WEEKS) {
    const sunday = shift(monday, -1);
    for (const [off, kind, title, onScreen, notes] of slots) {
      const post = shift(monday, off);
      const carousel = kind === K.car;
      out.push({
        id: stableId(`growth-plan-2026:${post}:${kind}`),
        title, kind, onScreen, notes, caption: "", keywords: "",
        film: carousel ? "" : sunday,
        edit: off === 0 ? sunday : shift(post, -1),
        post, time: "18:00",
        filmed: carousel, edited: false, posted: false,
      });
    }
  }
  return out;
}
