export type ThemeName = 'midnight' | 'forest' | 'slate';

export interface ThemePalette {
  bg: string;
  surface: string;
  accent: string;
  text: string;
}

export const themes: Record<ThemeName, ThemePalette> = {
  midnight: {
    bg: '#0B0F1A',
    surface: '#161B2C',
    accent: '#10B981',
    text: '#F8FAFC',
  },
  forest: {
    bg: '#060D06',
    surface: '#0D1A0D',
    accent: '#25D366',
    text: '#ECFDF5',
  },
  slate: {
    bg: '#0F172A',
    surface: '#1E293B',
    accent: '#6366F1',
    text: '#F1F5F9',
  },
};

export const DEFAULT_THEME: ThemeName = 'midnight';
