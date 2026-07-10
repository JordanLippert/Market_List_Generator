import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';

interface ToastProps {
  message: string | null;
  onDismiss(): void;
  durationMs?: number;
}

export function Toast({ message, onDismiss, durationMs = 3000 }: ToastProps) {
  const insets = useSafeAreaInsets();
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onDismissRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs]);

  if (!message) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + theme.spacing[3] }]} pointerEvents="none">
      <AppText family="mono" size="xs" color="paper" style={styles.text}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: theme.spacing[4],
    right: theme.spacing[4],
    backgroundColor: theme.colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  text: { textAlign: 'center' }
});
