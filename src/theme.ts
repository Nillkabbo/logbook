import { useColorScheme } from 'react-native';

/**
 * The single source of LogBook's visual identity. "Layered calm": tonal zinc
 * surfaces floating on the canvas, depth from soft ambient shadows instead of
 * borders, an emerald accent for the working state, red strictly reserved for
 * check-out, over-target, and destructive. Follows the system light/dark mode.
 */

/** A floating card's ambient shadow — iOS shadow props plus an Android elevation stand-in. */
export interface Shadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface Theme {
  /** Card and sheet background — floats on the canvas. */
  surface: string;
  /** The canvas behind every screen. */
  canvas: string;
  /** Inset surfaces: inputs, progress tracks, unselected pills. */
  inset: string;
  text: string;
  /** Secondary text at ~60% — captions, hints. */
  muted: string;
  /** Soft ambient shadow that lifts a floating card off the canvas. */
  cardShadow: Shadow;
  /** Legacy hairline — retiring with the bordered-card look. */
  border: string;
  /** The working state: check-in, active pills, fills, links. */
  accent: string;
  /** ~10% accent tint — tonal chip fills. */
  accentSoft: string;
  /** Text/icon color on accent and stop fills. */
  onAccent: string;
  /** Gradient partner of the accent (idle toggle). */
  accentAlt: string;
  /** Check-out, over-target, destructive. Nothing else. */
  stop: string;
  /** ~10% stop tint — the over-target chip fill. */
  stopSoft: string;
}

const light: Theme = {
  surface: '#FFFFFF',
  canvas: '#F4F4F5',
  inset: '#E4E4E7',
  text: '#18181B',
  muted: 'rgba(24,24,27,0.6)',
  cardShadow: {
    shadowColor: '#18181B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  border: 'rgba(24,24,27,0.08)',
  accent: '#059669',
  accentSoft: 'rgba(5,150,105,0.1)',
  onAccent: '#FFFFFF',
  accentAlt: '#0D9488',
  stop: '#DC2626',
  stopSoft: 'rgba(220,38,38,0.1)',
};

const dark: Theme = {
  surface: '#27272A',
  canvas: '#18181B',
  inset: '#3F3F46',
  text: '#FAFAFA',
  muted: 'rgba(250,250,250,0.6)',
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 3,
  },
  border: 'rgba(250,250,250,0.12)',
  accent: '#34D399',
  accentSoft: 'rgba(52,211,153,0.15)',
  onAccent: '#0B3B2E',
  accentAlt: '#2DD4BF',
  stop: '#F87171',
  stopSoft: 'rgba(248,113,113,0.15)',
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

/** Shape: card radius, control radius, pill radius, bar height. */
export const RADIUS = { card: 24, control: 12, pill: 999, bar: 10 } as const;

/** Type scale — system font, tabular numerals wherever times appear. */
export const TYPE = {
  /** The live elapsed timer on a running Home. */
  display: { fontSize: 64, fontWeight: '600' as const },
  /** The week-to-date fraction — the biggest quiet number on Home. */
  stat: { fontSize: 34, fontWeight: '600' as const },
  title: { fontSize: 22, fontWeight: '700' as const },
  body: { fontSize: 15 },
  caption: { fontSize: 13 },
} as const;
