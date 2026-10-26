// Inline SVG icons (crisp at any scale).
import type { ReactNode } from 'react'
import type { StepKind } from './stepIcon'
import { STEP_LABELS } from './stepIcon'

const I = ({ children, size = 26, fill = 'none' }: { children: ReactNode; size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const Logo = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="15" fill="#C8472A" />
    <g fill="none" stroke="#FFF4E4" strokeWidth="3.2" strokeLinecap="round">
      <path d="M23 9c-3.5 4 3.5 6.5 0 11" />
      <path d="M32 7c-3.5 4 3.5 6.5 0 11" />
      <path d="M41 9c-3.5 4 3.5 6.5 0 11" />
    </g>
    <path d="M10 28h44a22 20 0 0 1-44 0z" fill="#FFF4E4" />
    <rect x="22" y="49" width="20" height="5" rx="2.5" fill="#FFF4E4" />
    <path d="M14 33h36" stroke="#F2B544" strokeWidth="3" strokeLinecap="round" />
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
const BG: Record<StepKind, string> = {
  blend: '#E8F4FF',
  sear: '#FFE8DE',
  fry: '#FFEFD6',
  boil: '#E5F3FF',
  simmer: '#FFF0E0',
  bake: '#F5E8FF',
  roast: '#FFE6D6',
  grill: '#FFE8E0',
  chop: '#E8F7EA',
  mix: '#FFF4D6',
  whisk: '#F0ECFF',
  stir: '#E8F6F2',
  toss: '#EAF7E8',
  marinate: '#FFEAF0',
  rest: '#EEF2FF',
  pour: '#E6F4FF',
  drain: '#E8F0F8',
  roll: '#FFF0E8',
  plate: '#FFF6E0',
  season: '#F5EDE4',
  heat: '#FFE9D8',
  cook: '#FBE6DE',
}

function art(kind: StepKind): ReactNode {
  switch (kind) {
    case 'blend':
      return (
        <>
          <path d="M18 10h28v6c0 10-6 18-14 18S18 26 18 16z" fill="#7EB8E8" />
          <rect x="24" y="34" width="16" height="8" rx="2" fill="#5A8FBF" />
          <circle cx="32" cy="20" r="5" fill="#C8472A" opacity=".85" />
          <circle cx="26" cy="24" r="3.5" fill="#5E7F4E" opacity=".9" />
          <circle cx="37" cy="25" r="3" fill="#F2B544" />
        </>
      )
    case 'sear':
      return (
        <>
          <ellipse cx="32" cy="38" rx="18" ry="6" fill="#D9BF9E" />
          <rect x="14" y="22" width="36" height="14" rx="4" fill="#8B3A1F" />
          <path d="M18 22c2-6 6-10 14-10s12 4 14 10" fill="#C8472A" />
          <path d="M24 12c1-4 3-6 0-8M32 10c1-4 3-6 0-8M40 12c1-4 3-6 0-8" stroke="#F2B544" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      )
    case 'fry':
      return (
        <>
          <ellipse cx="32" cy="40" rx="20" ry="7" fill="#D9BF9E" />
          <path d="M12 28h40v6a10 8 0 0 1-40 0z" fill="#C8472A" />
          <path d="M18 24h28" stroke="#F2B544" strokeWidth="3" strokeLinecap="round" />
          <circle cx="24" cy="30" r="3" fill="#F2B544" />
          <circle cx="34" cy="31" r="2.5" fill="#FFF4E4" />
          <circle cx="42" cy="29" r="2" fill="#F2B544" />
        </>
      )
    case 'boil':
      return (
        <>
          <path d="M14 26h36v14a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8z" fill="#7EB8E8" />
          <path d="M12 26h40" stroke="#5A8FBF" strokeWidth="3" strokeLinecap="round" />
          <circle cx="24" cy="34" r="3" fill="#FFF" opacity=".7" />
          <circle cx="34" cy="38" r="4" fill="#FFF" opacity=".55" />
          <circle cx="42" cy="33" r="2.5" fill="#FFF" opacity=".65" />
          <path d="M26 16c-1 3 2 4 0 7M34 14c-1 3 2 4 0 7M42 16c-1 3 2 4 0 7" stroke="#7EB8E8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      )
    case 'simmer':
      return (
        <>
          <path d="M14 28h36v12a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8z" fill="#E8A060" />
          <path d="M12 28h40" stroke="#C8472A" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 34c4-3 8 3 12 0s8 3 12 0" stroke="#FFF4E4" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M28 18c-1 2.5 1.5 3.5 0 6M36 16c-1 2.5 1.5 3.5 0 6" stroke="#F2B544" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      )
    case 'bake':
    case 'roast':
      return (
        <>
          <rect x="12" y="14" width="40" height="36" rx="4" fill="#6B5A4E" />
          <rect x="16" y="18" width="32" height="20" rx="2" fill="#2A2220" />
          <circle cx="24" cy="28" r="3" fill="#F2B544" />
          <circle cx="32" cy="26" r="4" fill="#C8472A" />
          <circle cx="40" cy="29" r="3" fill="#F2B544" />
          <rect x="20" y="42" width="24" height="4" rx="1" fill="#D9BF9E" />
        </>
      )
    case 'grill':
      return (
        <>
          <rect x="10" y="20" width="44" height="28" rx="3" fill="#5A4A40" />
          <path d="M14 26h36M14 32h36M14 38h36" stroke="#2A2220" strokeWidth="2.5" />
          <path d="M20 16c1-4 3-5 0-8M32 14c1-4 3-5 0-8M44 16c1-4 3-5 0-8" stroke="#F2B544" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      )
    case 'chop':
      return (
        <>
          <ellipse cx="28" cy="42" rx="16" ry="5" fill="#D9BF9E" />
          <path d="M14 38l20-22 4 4-20 22z" fill="#C5CED6" stroke="#8A96A0" strokeWidth="1.5" />
          <path d="M34 16l8-4 6 12-8 4z" fill="#8B5A3C" />
          <circle cx="46" cy="40" r="5" fill="#5E7F4E" />
          <circle cx="52" cy="36" r="3.5" fill="#C8472A" />
        </>
      )
    case 'mix':
      return (
        <>
          <ellipse cx="32" cy="40" rx="16" ry="8" fill="#E8D4B8" />
          <path d="M16 28c0-8 7-14 16-14s16 6 16 14v8c0 6-7 10-16 10s-16-4-16-10z" fill="#F2B544" />
          <path d="M22 30c4 3 8-3 12 0s8-3 12 0" stroke="#C8472A" strokeWidth="2" fill="none" opacity=".5" />
          <path d="M40 12l6 20" stroke="#8B5A3C" strokeWidth="3" strokeLinecap="round" />
        </>
      )
    case 'whisk':
      return (
        <>
          <ellipse cx="28" cy="42" rx="14" ry="6" fill="#E8D4B8" />
          <path d="M18 30c0-8 5-14 12-14s10 4 12 10" fill="none" stroke="#8A96A0" strokeWidth="2" />
          <path d="M20 34c2-6 6-10 12-10M22 38c3-7 8-12 14-12" fill="none" stroke="#8A96A0" strokeWidth="1.8" />
          <path d="M40 22l12-14" stroke="#8B5A3C" strokeWidth="3" strokeLinecap="round" />
        </>
      )
    case 'stir':
      return (
        <>
          <ellipse cx="32" cy="42" rx="18" ry="7" fill="#D9BF9E" />
          <path d="M14 30h36v8a10 8 0 0 1-36 0z" fill="#C8472A" />
          <path d="M38 12l-4 22" stroke="#8B5A3C" strokeWidth="3" strokeLinecap="round" />
          <circle cx="26" cy="34" r="3" fill="#F2B544" />
          <circle cx="34" cy="35" r="2.5" fill="#FFF4E4" />
        </>
      )
    case 'toss':
      return (
        <>
          <ellipse cx="32" cy="40" rx="18" ry="8" fill="#E8F0E4" stroke="#5E7F4E" strokeWidth="2" />
          <circle cx="24" cy="36" r="4" fill="#C8472A" />
          <circle cx="34" cy="34" r="5" fill="#5E7F4E" />
          <circle cx="40" cy="38" r="3.5" fill="#F2B544" />
          <path d="M18 22c6-8 14-8 20 0" stroke="#8B5A3C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )
    case 'marinate':
      return (
        <>
          <rect x="16" y="18" width="32" height="30" rx="4" fill="#B8D4E8" opacity=".85" />
          <rect x="16" y="18" width="32" height="10" rx="4" fill="#8BB0C8" />
          <path d="M22 36c3-2 6 2 9 0s6 2 9 0" stroke="#5E7F4E" strokeWidth="2" fill="none" />
          <rect x="24" y="28" width="16" height="6" rx="2" fill="#C8472A" opacity=".8" />
        </>
      )
    case 'rest':
      return (
        <>
          <ellipse cx="32" cy="36" rx="16" ry="12" fill="#FFF4E4" stroke="#D9BF9E" strokeWidth="2" />
          <path d="M20 28c4-2 8 0 12-2s8 0 12 2" stroke="#C8472A" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M28 14h8M32 10v8" stroke="#8A96A0" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )
    case 'pour':
      return (
        <>
          <path d="M38 12l10 6-8 20H28l-2-8z" fill="#7EB8E8" />
          <path d="M30 38c0 6 2 12 2 12" stroke="#7EB8E8" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="24" cy="48" rx="12" ry="4" fill="#E8D4B8" />
          <path d="M14 42h20v4a6 4 0 0 1-20 0z" fill="#C8472A" opacity=".7" />
        </>
      )
    case 'drain':
      return (
        <>
          <path d="M18 16h28l-4 24H22z" fill="#C5CED6" stroke="#8A96A0" strokeWidth="1.5" />
          <path d="M24 28v8M32 26v10M40 28v8" stroke="#7EB8E8" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="32" cy="46" rx="14" ry="4" fill="#B8D4E8" opacity=".6" />
        </>
      )
    case 'roll':
      return (
        <>
          <ellipse cx="32" cy="34" rx="20" ry="12" fill="#E8F0E4" stroke="#5E7F4E" strokeWidth="2" />
          <path d="M16 34c6-4 12-4 18 0s10 4 14 0" stroke="#C8472A" strokeWidth="2" fill="none" />
          <circle cx="26" cy="32" r="3" fill="#C8472A" />
          <circle cx="36" cy="30" r="2.5" fill="#5E7F4E" />
          <path d="M14 22c8-6 28-6 36 0" stroke="#D9BF9E" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )
    case 'plate':
      return (
        <>
          <ellipse cx="32" cy="36" rx="20" ry="14" fill="#FFFDF8" stroke="#D9BF9E" strokeWidth="2.5" />
          <ellipse cx="32" cy="36" rx="12" ry="8" fill="none" stroke="#EFE0CB" strokeWidth="2" />
          <circle cx="28" cy="34" r="4" fill="#C8472A" />
          <circle cx="36" cy="36" r="3.5" fill="#5E7F4E" />
          <path d="M22 16c2 3-1 5 1 8M32 14c2 3-1 5 1 8" stroke="#F2B544" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )
    case 'season':
      return (
        <>
          <rect x="22" y="14" width="20" height="28" rx="4" fill="#FFF4E4" stroke="#D9BF9E" strokeWidth="2" />
          <rect x="26" y="18" width="12" height="8" rx="2" fill="#C8472A" />
          <circle cx="28" cy="36" r="1.8" fill="#5A4A40" />
          <circle cx="34" cy="34" r="1.5" fill="#5A4A40" />
          <circle cx="31" cy="40" r="1.6" fill="#5A4A40" />
          <path d="M30 42v6M26 48h8" stroke="#8B5A3C" strokeWidth="2" strokeLinecap="round" />
        </>
      )
    case 'heat':
      return (
        <>
          <path d="M14 30h36v12a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8z" fill="#C8472A" />
          <path d="M12 30h40" stroke="#8B3A1F" strokeWidth="3" strokeLinecap="round" />
          <path d="M24 16c-1 4 2 5 0 9M32 12c-1 4 2 5 0 9M40 16c-1 4 2 5 0 9" stroke="#F2B544" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      )
    default:
      return (
        <>
          <path d="M14 26h36v14a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8z" fill="#C8472A" />
          <path d="M12 26h40" stroke="#8B3A1F" strokeWidth="3" strokeLinecap="round" />
          <path d="M26 16c-1 3 2 4 0 7M38 16c-1 3 2 4 0 7" stroke="#F2B544" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      )
  }
}

/** Compact illustrative tile for a cooking step (keyword-matched). */
export function StepPic({ kind, size = 56, className }: { kind: StepKind; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={STEP_LABELS[kind]}
    >
      <rect width="64" height="64" rx="16" fill={BG[kind]} />
      {art(kind)}
    </svg>
  )
}
