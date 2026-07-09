import React, { useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type BottomSheet from '@gorhom/bottom-sheet';
import { theme } from '@ui/styles/theme';
import { Masthead } from './components/Masthead';
import { SearchBar } from './components/SearchBar';
import { CategoryCard } from './components/CategoryCard';
import { Dock } from './components/Dock';
import { VariationSheet } from '@ui/components/VariationSheet';
import { HistorySheet } from '@ui/components/HistorySheet';
import { FavoritesSheet } from '@ui/components/FavoritesSheet';
import { groupItemsByCategory, getItems } from '@app/lib/catalog';
import { useList } from '@app/contexts/ListContext';
import type { Item } from '@app/types/catalog';
import { VoiceCommandSheet } from '@ui/components/VoiceCommandSheet';
import { Toast } from '@ui/components/Toast';
import { parseVoiceCommand } from '@app/lib/voiceCommand';

export function HomeScreen() {
  const list = useList();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [variationTarget, setVariationTarget] = useState<Item | null>(null);

  const variationRef = useRef<BottomSheet>(null);
  const historyRef = useRef<BottomSheet>(null);
  const favoritesRef = useRef<BottomSheet>(null);
  const voiceRef = useRef<BottomSheet>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const groups = useMemo(() => groupItemsByCategory(), []);
  const totalItems = useMemo(() => getItems().length, []);

  const q = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (q === '') return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((i) => i.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  const visibleItemIds = useMemo(
    () => new Set(filteredGroups.flatMap((g) => g.items.map((i) => i.id))),
    [filteredGroups]
  );

  const handleItemPress = (item: Item) => {
    if (item.variations.length > 0 && !list.isSelected(item.id)) {
      setVariationTarget(item);
      variationRef.current?.expand();
      return;
    }
    list.toggle(item.id);
  };

  const handleItemLongPress = (item: Item) => {
    list.toggleFavorite(item.id, list.getSelectedVariation(item.id) ?? null);
  };

  const handleVariationPick = (label: string) => {
    if (variationTarget) {
      list.toggle(variationTarget.id, label);
      variationRef.current?.close();
      setVariationTarget(null);
    }
  };

  const handleSelectVisible = () => {
    for (const g of filteredGroups) {
      for (const item of g.items) {
        if (item.variations.length > 0) continue; // skip items needing choice
        if (!list.isSelected(item.id)) {
          list.toggle(item.id);
        }
      }
    }
  };

  const handleVoiceSubmit = (text: string) => {
    const { matched } = parseVoiceCommand(text, getItems());
    const added: string[] = [];

    for (const item of matched) {
      if (list.isSelected(item.id)) continue;
      const variationLabel = item.variations.length > 0 ? item.variations[0].label : undefined;
      list.toggle(item.id, variationLabel);
      added.push(item.name);
    }

    voiceRef.current?.close();

    if (added.length === 0) {
      setToastMessage('Nenhum item reconhecido, tenta de novo');
      return;
    }
    setToastMessage(`${added.length} adicionado${added.length > 1 ? 's' : ''}: ${added.join(', ')}`);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + theme.spacing[4] }]}
        keyboardShouldPersistTaps="handled"
      >
        <Masthead
          totalItems={totalItems}
          onOpenHistory={() => historyRef.current?.expand()}
          onOpenFavorites={() => favoritesRef.current?.expand()}
          onOpenVoice={() => voiceRef.current?.expand()}
        />
        <SearchBar value={query} onChangeText={setQuery} />
        {filteredGroups.map((g) => {
          const selected = g.items.reduce((n, i) => (list.isSelected(i.id) ? n + 1 : n), 0);
          return (
            <CategoryCard
              key={g.descriptor.key}
              descriptor={g.descriptor}
              items={g.items}
              selectedCount={selected}
              onItemPress={handleItemPress}
              onItemLongPress={handleItemLongPress}
            />
          );
        })}
      </ScrollView>

      <Dock
        count={list.selection.length}
        onClear={list.clear}
        onSelectVisible={handleSelectVisible}
        onSend={list.send}
        disabled={list.selection.length === 0}
      />

      <VariationSheet
        ref={variationRef}
        item={variationTarget}
        onPick={handleVariationPick}
        onCancel={() => {
          variationRef.current?.close();
          setVariationTarget(null);
        }}
      />
      <HistorySheet
        ref={historyRef}
        entries={list.history}
        onRestore={(entry) => list.restoreFromHistory(entry)}
        onClose={() => historyRef.current?.close()}
      />
      <FavoritesSheet
        ref={favoritesRef}
        favorites={list.favorites}
        onAddAll={() => list.addAllFavoritesToSelection()}
        onRemove={(fav) => list.toggleFavorite(fav.itemId, fav.variationLabel)}
        onClose={() => favoritesRef.current?.close()}
      />
      <VoiceCommandSheet
        ref={voiceRef}
        onSubmit={handleVoiceSubmit}
        onClose={() => voiceRef.current?.close()}
      />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.paper },
  scroll: { padding: theme.spacing[4], paddingBottom: 200 }
});
