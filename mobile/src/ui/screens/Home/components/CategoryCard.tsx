import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';
import type { Item, CategoryDescriptor } from '@app/types/catalog';
import { getCategoryEmoji } from '@app/lib/catalog';
import { ItemRow } from './ItemRow';
import { useList } from '@app/contexts/ListContext';

interface CategoryCardProps {
  descriptor: CategoryDescriptor;
  items: Item[];
  selectedCount: number;
  onItemPress(item: Item): void;
  onItemLongPress(item: Item): void;
}

export function CategoryCard({ descriptor, items, selectedCount, onItemPress, onItemLongPress }: CategoryCardProps) {
  const list = useList();

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <AppText family="display" size="lg" color="ink">{getCategoryEmoji(descriptor.key)}</AppText>
        <AppText family="display" size="lg" color="ink" style={styles.title}>
          {descriptor.name.toLowerCase()}
        </AppText>
        <AppText family="mono" size="xs" color="muted">
          <AppText family="mono" size="xs" color="ink">{selectedCount}</AppText>
          /{items.length}
        </AppText>
      </View>

      <View style={styles.rows}>
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            checked={list.isSelected(item.id)}
            variation={list.getSelectedVariation(item.id) ?? null}
            isFavorite={list.isFavorite(item.id, list.getSelectedVariation(item.id) ?? null)}
            onPress={() => onItemPress(item)}
            onLongPress={() => onItemLongPress(item)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    padding: theme.spacing[4],
    marginBottom: -1.5 // hairline grid: overlap borders
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingBottom: theme.spacing[3],
    borderBottomWidth: theme.hairline,
    borderColor: theme.colors.ink
  },
  title: { flex: 1, textTransform: 'lowercase' },
  rows: { marginTop: theme.spacing[2] }
});
