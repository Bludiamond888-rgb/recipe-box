// Inline SVG icons (crisp at any scale).
import type { ReactNode } from 'react'

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
