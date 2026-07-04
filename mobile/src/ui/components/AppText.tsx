import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { theme } from '@ui/styles/theme';

type Family = 'display' | 'body' | 'bodyRegular' | 'mono';
type Size = keyof typeof theme.fontSize;
type Color = keyof typeof theme.colors;

export interface AppTextProps extends TextProps {
  family?: Family;
  size?: Size;
  color?: Color;
  uppercase?: boolean;
}

export function AppText({
  family = 'bodyRegular',
  size = 'base',
  color = 'ink',
  uppercase,
  style,
  children,
  ...rest
}: AppTextProps) {
  const composed: TextStyle = {
    fontFamily: theme.fontFamily[family],
    fontSize: theme.fontSize[size],
    color: theme.colors[color],
    textTransform: uppercase ? 'uppercase' : 'none',
    letterSpacing: family === 'mono' ? 0.4 : family === 'display' ? -0.4 : 0
  };
  return (
    <Text {...rest} style={[composed, style]}>
      {children}
    </Text>
  );
}
