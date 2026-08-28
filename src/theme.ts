import { useColorScheme } from 'react-native';

/**
 * The single source of LogBook's visual identity. Calm utility: neutral zinc
 * surfaces, an emerald accent for the working state, red strictly reserved for
 * check-out, over-target, and destructive. Follows the system light/dark mode.
 */

export interface Theme {
  /** Card and sheet background. */
  surface: string;
  /** Inset surfaces: inputs, subtle fills. */
  subtle: string;
  text: string;
  /** Secondary text at ~60% — captions, hints. */
  muted: string;
  /** Hairline card border. */
  border: string;
  /** Progress-bar track. */
  track: string;
  /** The working state: check-in, active pills, fills, links. */
  accent: string;
  /** Gradient partner of the accent (idle toggle). */
  accentAlt: string;
  /** Check-out, over-target, destructive. Nothing else. */
  stop: string;
}

const light: Theme = {
  surface: '#FFFFFF',
  subtle: '#F4F4F5',
  text: '#18181B',
  muted: 'rgba(24,24,27,0.6)',
  border: 'rgba(24,24,27,0.08)',
  track: 'rgba(24,24,27,0.08)',
  accent: '#059669',
  accentAlt: '#0D9488',
  stop: '#DC2626',
};

const dark: Theme = {
  surface: '#18181B',
  subtle: '#27272A',
  text: '#FAFAFA',
  muted: 'rgba(250,250,250,0.6)',
  border: 'rgba(250,250,250,0.12)',
  track: 'rgba(250,250,250,0.12)',
  accent: '#34D399',
  accentAlt: '#2DD4BF',
  stop: '#F87171',
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

/** Shape: card radius, pill radius, bar height. */
export const RADIUS = { card: 16, pill: 18, bar: 8 } as const;

/** Type scale — system font, tabular numerals wherever times appear. */
export const TYPE = {
  display: { fontSize: 52, fontWeight: '600' as const },
  title: { fontSize: 22, fontWeight: '700' as const },
  body: { fontSize: 15 },
  caption: { fontSize: 13 },
};
