// Read-aloud with the Web Speech API (speechSynthesis only; no speech recognition).
import { pickVoice, segmentByScript } from './cook'

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

let voicesCache: SpeechSynthesisVoice[] = []
function voices() {
  if (!canSpeak()) return []
  const v = window.speechSynthesis.getVoices()
  if (v.length) voicesCache = v
  return voicesCache
}
if (canSpeak()) {
  voices()
  window.speechSynthesis.addEventListener?.('voiceschanged', voices)
}

let token = 0

/** Speak text, switching between a Chinese and an English voice per run. Resolves when done or stopped. */
export function speak(text: string, onEnd: () => void): void {
  if (!canSpeak()) { onEnd(); return }
  const synth = window.speechSynthesis
  synth.cancel()
  const my = ++token
  const parts = segmentByScript(text)
  if (!parts.length) { onEnd(); return }
  const vs = voices()
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p.text)
    u.lang = p.lang
    const v = pickVoice(vs, p.lang)
    if (v) u.voice = v
    u.rate = p.lang === 'zh-CN' ? 0.95 : 0.98
    if (i === parts.length - 1) {
      u.onend = () => { if (my === token) onEnd() }
      u.onerror = () => { if (my === token) onEnd() }
    }
    synth.speak(u)
  })
}

export function stopSpeaking() {
  token++
  if (canSpeak()) window.speechSynthesis.cancel()
}

const AUTO_KEY = 'recipeBox.autoRead'
export const getAutoRead = () => { try { return localStorage.getItem(AUTO_KEY) === '1' } catch { return false } }
export const setAutoRead = (on: boolean) => { try { localStorage.setItem(AUTO_KEY, on ? '1' : '0') } catch { /* private mode */ } }
