import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';

interface DockProps {
  count: number;
  onClear(): void;
  onSelectVisible(): void;
  onSend(): void;
  disabled?: boolean;
}

export function Dock({ count, onClear, onSelectVisible, onSend, disabled }: DockProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
      <View style={styles.countCol}>
        <AppText family="display" size="2xl" color="paper">{count}</AppText>
        <AppText family="mono" size="xs" color="muted" uppercase>itens marcados</AppText>
      </View>
      <View style={styles.actions}>
        <Button label="Limpar" variant="ghost" onPress={onClear} />
        <Button label="Marcar visíveis" variant="ghost" onPress={onSelectVisible} />
        <Button label="Enviar →" variant="go" onPress={onSend} disabled={disabled} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    backgroundColor: theme.colors.ink,
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[3]
  },
  countCol: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: theme.spacing[3] },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }
});
