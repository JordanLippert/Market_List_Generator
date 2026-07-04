import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { AppText } from '@ui/components/AppText';
import { styles } from './styles';

export type ButtonVariant = 'ghost' | 'ghostDark' | 'go';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, variant = 'ghost', disabled, style, ...rest }: ButtonProps) {
  const surface = variant === 'go' ? styles.go : variant === 'ghostDark' ? styles.ghostDark : styles.ghost;
  const labelStyle = variant === 'go' ? styles.labelGo : variant === 'ghostDark' ? styles.labelGhostDark : styles.labelGhost;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.base, surface, disabled && styles.disabled, style]}
      {...rest}
    >
      <AppText family="display" size="sm" style={labelStyle}>
        {label}
      </AppText>
    </Pressable>
  );
}
