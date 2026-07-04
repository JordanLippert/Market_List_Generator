import { StyleSheet } from 'react-native';

export const theme = {
  colors: {
    paper:  '#F5F1E8',
    paper2: '#EDE7D8',
    ink:    '#0A0A0A',
    ink2:   '#2A2724',
    muted:  '#6B6357',
    go:     '#25D366',
    goInk:  '#062B14'
  },
  fontFamily: {
    display:     'SpaceGrotesk_700Bold',
    body:        'Inter_500Medium',
    bodyRegular: 'Inter_400Regular',
    mono:        'JetBrainsMono_500Medium'
  },
  fontSize: {
    xs: 11, sm: 13, base: 15, lg: 18, xl: 24, '2xl': 34, '3xl': 56
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 },
  hairline: StyleSheet.hairlineWidth
} as const;

export type Theme = typeof theme;
