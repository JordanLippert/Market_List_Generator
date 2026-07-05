import React, { forwardRef, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';
import type { HistoryEntry } from '@app/types/selection';

interface HistorySheetProps {
  entries: HistoryEntry[];
  onRestore(entry: HistoryEntry): void;
  onClose(): void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const HistorySheet = forwardRef<BottomSheet, HistorySheetProps>(function HistorySheet(
  { entries, onRestore, onClose },
  ref
) {
  const [confirming, setConfirming] = useState<HistoryEntry | null>(null);

  const handleRestore = (entry: HistoryEntry) => {
    onRestore(entry);
    setConfirming(null);
    onClose();
  };

  return (
    <Sheet ref={ref} snapPoints={['50%', '90%']} onClose={onClose}>
      <AppText family="display" size="lg" color="ink">Histórico</AppText>
      <AppText family="mono" size="xs" color="muted" style={styles.subtitle}>
        últimos envios
      </AppText>

      {entries.length === 0 ? (
        <AppText family="mono" size="sm" color="muted" style={styles.empty}>
          sem histórico ainda
        </AppText>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.sentAt}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Restaurar seleção de ${formatDate(item.sentAt)}`}
              onPress={() => setConfirming(item)}
              style={styles.row}
            >
              <AppText family="mono" size="sm" color="ink">{formatDate(item.sentAt)}</AppText>
              <AppText family="mono" size="xs" color="muted">{item.items.length} itens</AppText>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}

      {confirming && (
        <View style={styles.confirm}>
          <AppText family="body" size="sm" color="ink" style={styles.confirmText}>
            Restaurar seleção? Isso substitui a lista atual.
          </AppText>
          <View style={styles.confirmActions}>
            <Button label="Cancelar" variant="ghostDark" onPress={() => setConfirming(null)} />
            <Button label="Restaurar" variant="ghostDark" onPress={() => handleRestore(confirming)} />
          </View>
        </View>
      )}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  subtitle: { marginTop: theme.spacing[1], marginBottom: theme.spacing[4] },
  empty: { textAlign: 'center', marginTop: theme.spacing[8] },
  row: {
    paddingVertical: theme.spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline'
  },
  sep: { height: theme.hairline, backgroundColor: theme.colors.ink },
  confirm: {
    borderTopWidth: 1.5,
    borderColor: theme.colors.ink,
    paddingTop: theme.spacing[4],
    marginTop: theme.spacing[4]
  },
  confirmText: { marginBottom: theme.spacing[3] },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }
});
