import React, { forwardRef } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';
import type { Item } from '@app/types/catalog';
import * as haptics from '@app/lib/haptics';

interface VariationSheetProps {
  item: Item | null;
  onPick(label: string): void;
  onCancel(): void;
}

export const VariationSheet = forwardRef<BottomSheet, VariationSheetProps>(function VariationSheet(
  { item, onPick, onCancel },
  ref
) {
  return (
    <Sheet ref={ref} snapPoints={['auto']} onClose={onCancel}>
      <AppText family="display" size="lg" color="ink">Escolha a variação</AppText>
      <AppText family="mono" size="xs" color="muted" style={styles.item}>
        {item?.name ?? ''}
      </AppText>

      <View style={styles.chips}>
        {item?.variations.map((v) => (
          <Pressable
            key={v.label}
            accessibilityRole="button"
            accessibilityLabel={`Escolher ${v.label}`}
            onPress={() => {
              haptics.light();
              onPick(v.label);
            }}
            style={styles.chip}
          >
            <AppText family="display" size="sm" color="ink">{v.label}</AppText>
          </Pressable>
        )) ?? null}
      </View>

      <View style={styles.actions}>
        <Button label="Cancelar" variant="ghostDark" onPress={onCancel} />
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  item: { marginTop: theme.spacing[1], marginBottom: theme.spacing[4] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing[4] },
  chip: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', paddingBottom: theme.spacing[6] }
});
