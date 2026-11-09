// Inline SVG icons (crisp at any scale).
import type { CSSProperties, ReactNode } from 'react'
import type { StepKind } from './stepIcon'
import { STEP_LABELS } from './stepIcon'

const I = ({ children, size = 26, fill = 'none' }: { children: ReactNode; size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const Logo = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true" className="logo-mark">
    <rect width="1024" height="1024" rx="229" fill="#121110" />
    <circle cx="512" cy="262" r="48" fill="#F2A33A" />
    <path d="M210 650a302 302 0 0 1 604 0z" fill="#F2A33A" />
    <path d="M330 560a200 200 0 0 1 120-150" fill="none" stroke="#121110" strokeWidth="34" strokeLinecap="round" opacity=".35" />
    <rect x="150" y="676" width="724" height="62" rx="31" fill="#F4EDE4" />
    <path d="M300 820h424" stroke="#F2A33A" strokeWidth="26" strokeLinecap="round" opacity=".55" />
  </svg>
)

export const IconBook = () => <I><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /><path d="M9 8h7M9 12h5" /></I>
export const IconHeart = ({ filled = false, size = 26 }: { filled?: boolean; size?: number }) => (
  <I size={size} fill={filled ? 'currentColor' : 'none'}><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.8 4 7.3 4c2 0 3.6 1.1 4.7 2.7C13.1 5.1 14.7 4 16.7 4c3.5 0 5.7 3.6 4.5 7.1-1.7 4.8-9.2 9.4-9.2 9.4z" /></I>
)
export const IconCart = () => <I><path d="M3 4h2.2l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.1" /><circle cx="9.5" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /></I>
export const IconGear = () => <I><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></I>
export const IconPlus = ({ size = 26 }: { size?: number }) => <I size={size}><path d="M12 5v14M5 12h14" /></I>
export const IconBack = () => <I><path d="M15 5l-7 7 7 7" /></I>
export const IconSearch = () => <I size={22}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></I>
export const IconClock = () => <I size={18}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>
export const IconUsers = () => <I size={18}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2" /></I>
export const IconCheck = ({ size = 20 }: { size?: number }) => <I size={size}><path d="M5 12.5l4.5 4.5L19 7.5" /></I>
export const IconCamera = () => <I size={22}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></I>
export const IconImage = () => <I size={22}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 9" /></I>
export const IconPot = ({ size = 22 }: { size?: number }) => <I size={size}><path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" /><path d="M2 10h20M9 6c-1-1.5 1-2.5 0-4M15 6c-1-1.5 1-2.5 0-4" /></I>
export const IconTrash = () => <I size={20}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></I>
export const IconEdit = () => <I size={20}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></I>
export const IconSpeaker = ({ size = 22 }: { size?: number }) => <I size={size}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></I>
export const IconStop = ({ size = 22 }: { size?: number }) => <I size={size} fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5" /></I>
export const IconTimer = ({ size = 20 }: { size?: number }) => <I size={size}><circle cx="12" cy="13.5" r="7.5" /><path d="M12 13.5V10M9.5 3h5M12 3v3" /></I>
export const IconPause = ({ size = 20 }: { size?: number }) => <I size={size}><path d="M9 6v12M15 6v12" /></I>
export const IconPlay = ({ size = 20 }: { size?: number }) => <I size={size} fill="currentColor"><path d="M8 5.5v13l10-6.5z" /></I>
export const IconClose = ({ size = 22 }: { size?: number }) => <I size={size}><path d="M6 6l12 12M18 6L6 18" /></I>
export const IconExternal = ({ size = 16 }: { size?: number }) => <I size={size}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></I>

export const IconStar = ({ filled = false, size = 22 }: { filled?: boolean; size?: number }) => (
  <I size={size} fill={filled ? 'currentColor' : 'none'}><path d="M12 3.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.6 7.2 18.1l.9-5.4-3.9-3.8 5.4-.8z" /></I>
)
export const IconCalendar = ({ size = 26 }: { size?: number }) => <I size={size}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></I>
export const IconMic = ({ size = 22 }: { size?: number }) => <I size={size}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></I>
export const IconFolder = ({ size = 22 }: { size?: number }) => <I size={size}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></I>
export const IconImport = ({ size = 22 }: { size?: number }) => <I size={size}><path d="M12 3v10M8 9l4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /></I>

/** Placeholder tile art for recipes without a photo. */
export const PlateArt = () => (
  <svg viewBox="0 0 100 75" className="plate-art" aria-hidden="true">
    <ellipse cx="50" cy="40" rx="30" ry="22" fill="#FFFDF8" stroke="#E9D6BD" strokeWidth="2" />
    <ellipse cx="50" cy="40" rx="19" ry="13.5" fill="none" stroke="#EFE0CB" strokeWidth="2" />
    <path d="M14 22v36M10 22v8a4 4 0 0 0 8 0v-8" stroke="#D9BF9E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M86 22c-4 3-5 10-5 16h5v20" stroke="#D9BF9E" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/* ---------- step illustrations (compact emoji-style tiles) ---------- */
const HUE: Record<StepKind, number> = {
  blend: 200, sear: 16, fry: 36, boil: 205, simmer: 28, bake: 268, roast: 22, grill: 8, chop: 128, mix: 42, whisk: 250,
  stir: 165, toss: 105, marinate: 335, rest: 228, pour: 198, drain: 214, roll: 18, plate: 44, season: 30, heat: 12, cook: 4,
}

// Night Kitchen step pictures: flat food colours that read on both a dark and a light tile,
// outlined in "ink" (currentColor), which the stylesheet sets per colour scheme.
const AMBER = '#F2A33A'
const RED = '#E4572E'
const GREEN = '#4FA65B'
const BLUE = '#4AA3DF'
const MEAT = '#A64B2A'
const CREAM = '#F6E7CF'
const METAL = '#A3ADB8'
const WOOD = '#C07C48'
const ink = { stroke: 'currentColor', strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
const line = (c: string, w = 2.6) => ({ stroke: c, strokeWidth: w, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const })
const steam = (c = AMBER) => <path d="M24 19c-2-3 2-5 0-8M32 17c-2-3 2-5 0-8M40 19c-2-3 2-5 0-8" {...line(c)} />
const pan = (fill = METAL) => (<><path d="M9 33h37v3c0 5.5-4 9-9.5 9h-18C13 45 9 41.5 9 36z" fill={fill} {...ink} /><path d="M46 36h9" {...line('currentColor', 4.2)} /></>)
const pot = (fill: string) => (<><path d="M13 27h38v13c0 5-4 9-9 9H22c-5 0-9-4-9-9z" fill={fill} {...ink} /><path d="M9 27h46" {...line('currentColor', 3)} /><path d="M10 31h3M51 31h3" {...line('currentColor', 3)} /></>)
const bowl = (fill = CREAM) => <path d="M11 32h42c0 9-9 16-21 16S11 41 11 32z" fill={fill} {...ink} />
const flame = (x: number, y: number, s = 1) => <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 0c-4 0-6-3-6-6 0-4 4-5 4-10 3 2 4 4 4 6 1-1 2-2 2-4 2 2 2 5 2 8 0 3-2 6-6 6z" fill={RED} stroke={AMBER} strokeWidth={1.6} strokeLinejoin="round" />

function art(kind: StepKind): ReactNode {
  switch (kind) {
    case 'sear':
      return (<>{steam()}{pan()}<ellipse cx="28" cy="31" rx="12" ry="5.5" fill={MEAT} {...ink} /><path d="M21 30l4-2M27 31l4-2M33 31l2-1" {...line('#6E2A14', 2)} /></>)
    case 'fry':
      return (<>{pan()}<ellipse cx="27.5" cy="33" rx="15" ry="3.2" fill={AMBER} /><circle cx="21" cy="28" r="2.4" fill={CREAM} {...ink} strokeWidth={1.6} /><circle cx="30" cy="26" r="2" fill={CREAM} {...ink} strokeWidth={1.6} /><circle cx="37" cy="29" r="1.8" fill={CREAM} {...ink} strokeWidth={1.6} /><path d="M20 20l-2-4M30 18v-4M40 20l2-4" {...line(AMBER, 2.2)} /></>)
    case 'grill':
      return (<><rect x="10" y="22" width="44" height="18" rx="4" fill={METAL} {...ink} /><path d="M17 22v18M25 22v18M33 22v18M41 22v18M49 22v18" {...line('currentColor', 2)} /><ellipse cx="31" cy="25" rx="11" ry="4.5" fill={MEAT} {...ink} />{flame(22, 54, 0.8)}{flame(32, 55, 1)}{flame(42, 54, 0.8)}</>)
    case 'boil':
      return (<><path d="M24 20c-2-3 2-5 0-8M40 20c-2-3 2-5 0-8" {...line(BLUE)} />{pot(BLUE)}<circle cx="24" cy="36" r="2.6" fill={CREAM} /><circle cx="33" cy="40" r="3.4" fill={CREAM} /><circle cx="41" cy="34" r="2.2" fill={CREAM} /></>)
    case 'simmer':
      return (<><path d="M28 20c-2-3 2-5 0-8M36 20c-2-3 2-5 0-8" {...line(AMBER)} />{pot(RED)}<path d="M19 35c3-2.5 6 2.5 9 0s6 2.5 9 0 6 2.5 8 0" {...line(CREAM, 2.2)} />{flame(32, 60, 0.55)}</>)
    case 'bake':
      return (<><rect x="10" y="12" width="44" height="40" rx="6" fill={CREAM} {...ink} /><rect x="16" y="22" width="32" height="22" rx="3" fill="#2B2420" {...ink} /><path d="M20 38h24" {...line(AMBER, 3)} /><path d="M22 34c3-4 7-4 10 0s7 4 10 0" {...line(RED, 2.2)} /><circle cx="18" cy="17" r="1.8" fill="currentColor" /><circle cx="24" cy="17" r="1.8" fill="currentColor" /><path d="M36 17h12" {...line('currentColor', 2)} /></>)
    case 'roast':
      return (<><path d="M33 16c8 0 14 6 13 13-1 6-7 9-13 8l-8 9c-1 2-4 2-5 0s0-4 2-5l9-8c-2-6 1-17 2-17z" fill={AMBER} {...ink} /><circle cx="19" cy="47" r="3" fill={CREAM} {...ink} strokeWidth={1.8} /><path d="M8 50h48" {...line('currentColor', 3)} /><path d="M12 50l3 5h34l3-5" fill={METAL} {...ink} /></>)
    case 'chop':
      return (<><rect x="8" y="34" width="40" height="14" rx="5" fill={WOOD} {...ink} /><path d="M14 30l22-18 5 5-20 17z" fill={METAL} {...ink} /><path d="M36 12l5-4 6 6-5 4z" fill="currentColor" /><circle cx="40" cy="40" r="3.2" fill={GREEN} {...ink} strokeWidth={1.8} /><circle cx="48" cy="38" r="2.6" fill={GREEN} {...ink} strokeWidth={1.8} /><circle cx="53" cy="44" r="3" fill={RED} {...ink} strokeWidth={1.8} /></>)
    case 'mix':
      return (<><path d="M42 10l-7 22" {...line(WOOD, 4)} /><ellipse cx="32" cy="32" rx="18" ry="4.5" fill={AMBER} {...ink} />{bowl()}</>)
    case 'whisk':
      return (<><path d="M44 8l-6 14" {...line('currentColor', 3.6)} /><path d="M38 22c-6 2-10 8-8 11s9 0 10-6c1 6 8 8 9 4s-4-9-11-9z" {...line(METAL, 2.2)} /><ellipse cx="32" cy="32" rx="18" ry="4.5" fill={CREAM} {...ink} />{bowl(BLUE)}</>)
    case 'stir':
      return (<><path d="M40 8l-6 26" {...line(WOOD, 4)} />{pot(RED)}<path d="M20 36a12 5 0 1 0 12-4" {...line(CREAM, 2.2)} /><path d="M30 29l3 3-3 3" {...line(CREAM, 2.2)} /></>)
    case 'toss':
      return (<><path d="M14 18c4-6 10-8 16-7M50 18c-4-6-10-8-16-7" {...line('currentColor', 2.2)} /><circle cx="24" cy="22" r="3.4" fill={GREEN} {...ink} strokeWidth={1.8} /><circle cx="34" cy="18" r="3" fill={RED} {...ink} strokeWidth={1.8} /><circle cx="42" cy="24" r="2.8" fill={AMBER} {...ink} strokeWidth={1.8} /><ellipse cx="32" cy="32" rx="18" ry="4.5" fill={GREEN} {...ink} />{bowl()}</>)
    case 'marinate':
      return (<><rect x="14" y="16" width="36" height="34" rx="7" fill={BLUE} fillOpacity={0.45} {...ink} /><path d="M14 24h36" {...line('currentColor', 2.4)} /><ellipse cx="32" cy="38" rx="12" ry="6" fill={MEAT} {...ink} /><circle cx="22" cy="31" r="1.8" fill={GREEN} /><circle cx="42" cy="44" r="1.8" fill={GREEN} /><circle cx="40" cy="31" r="1.5" fill={AMBER} /></>)
    case 'rest':
      return (<><rect x="6" y="36" width="44" height="12" rx="5" fill={WOOD} {...ink} /><path d="M12 36c0-6 6-9 14-9s14 3 14 9z" fill={MEAT} {...ink} /><circle cx="47" cy="17" r="9" fill={CREAM} {...ink} /><path d="M47 12v5l3 2" {...line('currentColor', 2.2)} /></>)
    case 'pour':
      return (<><path d="M30 10h16l4 8-8 10H30z" fill={CREAM} {...ink} /><path d="M50 18l4-2" {...line('currentColor', 2.4)} /><path d="M30 26c-3 5-4 10-4 14" {...line(BLUE, 3.4)} /><ellipse cx="26" cy="40" rx="14" ry="3.5" fill={BLUE} {...ink} /><path d="M10 40h32c0 6-7 10-16 10s-16-4-16-10z" fill={RED} {...ink} /></>)
    case 'drain':
      return (<><path d="M12 20h40l-5 20H17z" fill={METAL} {...ink} /><path d="M8 20h48" {...line('currentColor', 3)} /><circle cx="22" cy="28" r="1.6" fill="currentColor" /><circle cx="32" cy="28" r="1.6" fill="currentColor" /><circle cx="42" cy="28" r="1.6" fill="currentColor" /><circle cx="27" cy="34" r="1.6" fill="currentColor" /><circle cx="37" cy="34" r="1.6" fill="currentColor" /><path d="M24 45v5M32 44v7M40 45v5" {...line(BLUE, 2.6)} /></>)
    case 'roll':
      return (<><rect x="10" y="22" width="36" height="20" rx="10" fill={CREAM} {...ink} /><ellipse cx="46" cy="32" rx="7" ry="10" fill={CREAM} {...ink} /><circle cx="44" cy="29" r="2.4" fill={RED} /><circle cx="48" cy="34" r="2.2" fill={GREEN} /><circle cx="44" cy="36" r="1.8" fill={AMBER} /><path d="M18 26v12M26 25v14M34 25v14" {...line(GREEN, 1.8)} /></>)
    case 'plate':
      return (<><path d="M24 18c-2-3 2-5 0-8M34 16c-2-3 2-5 0-8" {...line(AMBER)} /><ellipse cx="32" cy="38" rx="23" ry="11" fill={CREAM} {...ink} /><ellipse cx="32" cy="37" rx="14" ry="6" {...line('currentColor', 1.4)} /><ellipse cx="28" cy="35" rx="7" ry="3.6" fill={MEAT} {...ink} strokeWidth={1.8} /><circle cx="38" cy="36" r="3.4" fill={GREEN} {...ink} strokeWidth={1.8} /></>)
    case 'season':
      return (<><rect x="20" y="16" width="20" height="26" rx="6" fill={CREAM} {...ink} /><path d="M22 16c0-5 4-8 8-8s8 3 8 8z" fill={RED} {...ink} /><path d="M26 26h8M26 32h8" {...line('currentColor', 1.8)} /><circle cx="22" cy="48" r="1.6" fill="currentColor" /><circle cx="30" cy="51" r="1.6" fill="currentColor" /><circle cx="38" cy="48" r="1.6" fill="currentColor" /><circle cx="44" cy="53" r="1.4" fill="currentColor" /></>)
    case 'heat':
      return (<>{pan()}<path d="M12 50h36" {...line('currentColor', 3)} />{flame(22, 60, 0.6)}{flame(30, 60, 0.75)}{flame(38, 60, 0.6)}<path d="M20 24c-2-3 2-5 0-8M30 22c-2-3 2-5 0-8" {...line(AMBER, 2.2)} /></>)
    case 'blend':
      return (<><path d="M18 8h28l-4 30H22z" fill={BLUE} fillOpacity={0.45} {...ink} /><path d="M20 22h24l-2 16H22z" fill="#9B6BD3" /><path d="M18 8h28l-4 30H22z" fill="none" {...ink} /><rect x="16" y="38" width="32" height="12" rx="4" fill={METAL} {...ink} /><circle cx="32" cy="44" r="2.4" fill="currentColor" /></>)
    default:
      return (<>{steam()}<path d="M15 22h34" {...line('currentColor', 3)} /><path d="M27 17h10" {...line('currentColor', 3)} />{pot(RED)}</>)
  }
}

/** Compact illustrative tile for a cooking step (keyword-matched). Tile and ink colours follow the theme. */
export function StepPic({ kind, size = 56, className }: { kind: StepKind; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`steppic${className ? ` ${className}` : ''}`}
      style={{ ['--h' as string]: HUE[kind] } as CSSProperties}
      role="img"
      aria-label={STEP_LABELS[kind]}
    >
      <rect className="tile" x="0.5" y="0.5" width="63" height="63" rx="16" />
      {art(kind)}
    </svg>
  )
}
