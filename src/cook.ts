// Pure helpers for the 2.0 recipe page and cook mode: bilingual titles, read-aloud
// language segments, voice choice, and countdown timers found in step text.

const CJK = /[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/
const HAN = /[\u3400-\u9fff\uf900-\ufaff]/

/**
 * Display-only split of "English (中文)" into a main title and a Chinese subtitle.
 * Titles without Chinese in the trailing brackets are returned unchanged. The stored
 * title is never modified.
 */
export function splitTitle(title: string): { main: string; sub: string | null } {
  const t = title.trim()
  const m = /^(.*?)\s*[(（]([^()（）]+)[)）]\s*$/.exec(t)
  if (!m || !m[1].trim() || !HAN.test(m[2])) return { main: t, sub: null }
  return { main: m[1].trim(), sub: m[2].trim() }
}

export type SpeechLang = 'zh-CN' | 'en-US'

/** Split text into runs of Chinese and non-Chinese so each run can use a matching voice. */
export function segmentByScript(text: string): { text: string; lang: SpeechLang }[] {
  const out: { text: string; lang: SpeechLang }[] = []
  // Treat CJK punctuation as Chinese, and keep digits/punctuation with whatever run they sit in.
  const neutral = /[\s\d.,:;!?'"“”‘’()\-–—/%°·×½¼¾+&]/
  let cur = ''
  let lang: SpeechLang | null = null
  for (const ch of text) {
    const l: SpeechLang | null = CJK.test(ch) ? 'zh-CN' : neutral.test(ch) ? null : 'en-US'
    if (l && lang && l !== lang) {
      if (cur.trim()) out.push({ text: cur.trim(), lang })
      cur = ''
    }
    if (l) lang = l
    cur += ch
  }
  if (cur.trim()) out.push({ text: cur.trim(), lang: lang ?? 'en-US' })
  // Drop runs that are only brackets/punctuation after a split.
  return out
    .map((s) => ({ ...s, text: s.text.replace(/^[()（）\s]+|[()（）\s]+$/g, '') }))
    .filter((s) => /[\p{L}\p{N}]/u.test(s.text))
}

/** The language most of the text is written in. */
export function detectLang(text: string): SpeechLang {
  let zh = 0
  let en = 0
  for (const ch of text) { if (HAN.test(ch)) zh++; else if (/[A-Za-z]/.test(ch)) en++ }
  return zh * 2 >= en && zh > 0 ? 'zh-CN' : 'en-US'
}

export interface VoiceLike { name: string; lang: string; localService?: boolean; default?: boolean }

/** Choose the best installed voice for a language (prefers exact region, then on-device, then a known good name). */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], lang: SpeechLang): V | null {
  const base = lang.slice(0, 2)
  const norm = (l: string) => l.replace('_', '-').toLowerCase()
  const same = voices.filter((v) => norm(v.lang).startsWith(base))
  if (!same.length) return null
  const liked = lang === 'zh-CN' ? /tingting|ting-ting|lili|yu-shu|meijia/i : /samantha|ava|allison|karen|daniel|alex/i
  const score = (v: V) =>
    (norm(v.lang) === lang.toLowerCase() ? 8 : 0) +
    (lang === 'zh-CN' && /zh-(cn|hans)/.test(norm(v.lang)) ? 4 : 0) +
    (liked.test(v.name) ? 3 : 0) +
    (v.localService ? 2 : 0) +
    (v.default ? 1 : 0) -
    (/compact|novelty|eloquence|bad news|bells|bubbles|cellos|jester|organ|trinoids|whisper|zarvox|superstar|wobble|boing|albert|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|flo|reed|sandy/i.test(v.name) ? 6 : 0)
  return [...same].sort((a, b) => score(b) - score(a))[0]
}

export interface StepTimer { label: string; seconds: number }

const UNIT: Record<string, number> = {
  second: 1, seconds: 1, sec: 1, secs: 1,
  minute: 60, minutes: 60, min: 60, mins: 60,
  hour: 3600, hours: 3600, hr: 3600, hrs: 3600,
  '秒': 1, '秒钟': 1, '分钟': 60, '分': 60, '小时': 3600, '个小时': 3600,
}

/**
 * Countdown timers mentioned in a step ("sear 3–4 minutes per side", "30 to 40 minutes",
 * "15分钟"). A range starts at its lower number so nothing overcooks; the label keeps the
 * original wording. Returns at most 3 distinct timers, in order of appearance.
 */
export function parseTimers(step: string): StepTimer[] {
  const out: StepTimer[] = []
  const num = String.raw`(\d+(?:\.\d+)?|½|an?|one|two|three|four|five|ten|fifteen|twenty|thirty)`
  const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30, '½': 0.5 }
  const en = new RegExp(String.raw`\b${num}(?:\s*(?:–|-|to|or)\s*(\d+(?:\.\d+)?))?\s*(?:more\s+|extra\s+)?(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b`, 'gi')
  const zh = /(\d+(?:\.\d+)?)(?:\s*[-–~～到至]\s*(\d+(?:\.\d+)?))?\s*(秒钟|秒|分钟|个小时|小时)/g
  const found: { at: number; label: string; seconds: number }[] = []
  for (const m of step.matchAll(en)) {
    const raw = m[1].toLowerCase()
    const lo = words[raw] ?? Number(raw)
    // "a few tens of seconds" and similar vague phrases are skipped.
    if (!isFinite(lo) || lo <= 0) continue
    if ((raw === 'a' || raw === 'an') && /few|couple/i.test(step.slice(m.index! , m.index! + 12))) continue
    const unit = UNIT[m[3].toLowerCase()]
    found.push({ at: m.index!, label: m[0].replace(/\s+/g, ' ').trim(), seconds: Math.round(lo * unit) })
  }
  for (const m of step.matchAll(zh)) {
    found.push({ at: m.index!, label: m[0], seconds: Math.round(Number(m[1]) * UNIT[m[3]]) })
  }
  found.sort((a, b) => a.at - b.at)
  for (const f of found) {
    if (f.seconds < 5 || f.seconds > 12 * 3600) continue
    if (out.some((o) => o.seconds === f.seconds)) continue
    out.push({ label: f.label, seconds: f.seconds })
    if (out.length === 3) break
  }
  return out
}

/** 185 -> "3:05", 3725 -> "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

export type SourceKind = 'xhs' | 'tiktok' | 'youtube' | 'instagram' | 'link'

/** Which badge to show on the Inspired-by card / photo tile. */
export function sourceKind(url?: string, label?: string): SourceKind | null {
  const s = `${url ?? ''} ${label ?? ''}`.toLowerCase()
  if (!s.trim()) return null
  if (/xhslink|xiaohongshu|rednote|小红书/.test(s)) return 'xhs'
  if (/tiktok/.test(s)) return 'tiktok'
  if (/youtu\.?be/.test(s)) return 'youtube'
  if (/instagram/.test(s)) return 'instagram'
  return url ? 'link' : null
}
