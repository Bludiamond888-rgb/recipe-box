// Optional cook-mode voice commands trial (Web Speech recognition). Off by default.
export type VoiceCommand = 'next' | 'back' | 'repeat' | 'timer' | 'done'

type Recog = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
}

function SpeechRec(): (new () => Recog) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recog
    webkitSpeechRecognition?: new () => Recog
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const canListen = () => typeof window !== 'undefined' && !!SpeechRec()

const VOICE_KEY = 'recipeBox.voiceTrial'
export const getVoiceTrial = () => { try { return localStorage.getItem(VOICE_KEY) === '1' } catch { return false } }
export const setVoiceTrial = (on: boolean) => { try { localStorage.setItem(VOICE_KEY, on ? '1' : '0') } catch { /* */ } }

const PATTERNS: [VoiceCommand, RegExp][] = [
  ['next', /\b(next|forward|continue|下一|下一步)\b/i],
  ['back', /\b(back|previous|prior|上一|上一步|回去)\b/i],
  ['repeat', /\b(repeat|again|say (it )?again|再读|重复)\b/i],
  ['timer', /\b((start|begin) (the )?timer|timer|计时|开始计时)\b/i],
  ['done', /\b(done|finish|finished|完成|好了)\b/i],
]

export function matchCommand(transcript: string): VoiceCommand | null {
  const t = transcript.trim()
  if (!t) return null
  for (const [cmd, re] of PATTERNS) if (re.test(t)) return cmd
  return null
}

export type VoiceHandle = { stop: () => void }

/** Start continuous listening; calls onCommand for each final match. Returns a stop handle. */
export function startListening(
  onCommand: (cmd: VoiceCommand, raw: string) => void,
  onStatus?: (s: 'listening' | 'stopped' | 'error', detail?: string) => void,
): VoiceHandle | null {
  const Ctor = SpeechRec()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.continuous = true
  rec.interimResults = false
  rec.lang = 'en-US'
  let wanted = true
  rec.onresult = (ev) => {
    for (let i = 0; i < ev.results.length; i++) {
      const r = ev.results[i]
      if (!r?.isFinal) continue
      const text = r[0]?.transcript ?? ''
      const cmd = matchCommand(text)
      if (cmd) onCommand(cmd, text)
    }
  }
  rec.onerror = (ev) => {
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
      wanted = false
      onStatus?.('error', 'Microphone permission denied')
    } else if (ev.error !== 'aborted' && ev.error !== 'no-speech') {
      onStatus?.('error', ev.error)
    }
  }
  rec.onend = () => {
    if (wanted) {
      try { rec.start() } catch { onStatus?.('stopped') }
    } else onStatus?.('stopped')
  }
  try {
    rec.start()
    onStatus?.('listening')
  } catch (e) {
    onStatus?.('error', e instanceof Error ? e.message : 'Could not start')
    return null
  }
  return {
    stop: () => {
      wanted = false
      try { rec.abort() } catch { try { rec.stop() } catch { /* */ } }
      onStatus?.('stopped')
    },
  }
}
