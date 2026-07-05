import React, { forwardRef } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';
import type { SelectedItem } from '@app/types/selection';
import { getItemById } from '@app/lib/catalog';
import * as haptics from '@app/lib/haptics';

interface FavoritesSheetProps {
  favorites: SelectedItem[];
  onAddAll(): void;
  onRemove(fav: SelectedItem): void;
  onClose(): void;
}

export const FavoritesSheet = forwardRef<BottomSheet, FavoritesSheetProps>(function FavoritesSheet(
  { favorites, onAddAll, onRemove, onClose },
  ref
) {
  return (
    <Sheet ref={ref} snapPoints={['40%', '80%']} onClose={onClose}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText family="display" size="lg" color="ink">Favoritos</AppText>
          <AppText family="mono" size="xs" color="muted">segure pra remover</AppText>
        </View>
        {favorites.length > 0 && (
          <Button
            label="Adicionar tudo"
            variant="ghostDark"
            onPress={() => {
              haptics.light();
              onAddAll();
              onClose();
            }}
          />
        )}
      </View>

      {favorites.length === 0 ? (
        <AppText family="mono" size="sm" color="muted" style={styles.empty}>
          sem favoritos — segure em um item pra favoritar
        </AppText>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(f) => `${f.itemId}:${f.variationLabel ?? ''}`}
          renderItem={({ item }) => {
            const catalogItem = getItemById(item.itemId);
            const label = catalogItem?.name ?? `#${item.itemId}`;
            const suffix = item.variationLabel ? ` (${item.variationLabel})` : '';
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover ${label}${suffix}`}
                onLongPress={() => {
                  haptics.light();
                  onRemove(item);
                }}
                style={styles.row}
              >
                <AppText family="body" size="base" color="ink">{label}{suffix}</AppText>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[4]
  },
  empty: { textAlign: 'center', marginTop: theme.spacing[8] },
  row: { paddingVertical: theme.spacing[3] },
  sep: { height: theme.hairline, backgroundColor: theme.colors.ink }
});
