import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SelectedItem, HistoryEntry } from '@app/types/selection';
import type { Item } from '@app/types/catalog';
import { getJSON, setJSON, StorageKeys } from '@app/lib/storage';
import { getItemById } from '@app/lib/catalog';
import { buildSelectionMessage, openWhatsApp } from '@app/lib/whatsapp';
import * as haptics from '@app/lib/haptics';

const HISTORY_LIMIT = 20;
const SAVE_DEBOUNCE_MS = 300;

interface ListState {
  selection: SelectedItem[];
  favorites: SelectedItem[];
  history: HistoryEntry[];
  isHydrated: boolean;

  isSelected(itemId: number): boolean;
  getSelectedVariation(itemId: number): string | null | undefined;
  toggle(itemId: number, variationLabel?: string | null): void;
  clear(): void;

  isFavorite(itemId: number, variationLabel?: string | null): boolean;
  toggleFavorite(itemId: number, variationLabel?: string | null): void;
  addAllFavoritesToSelection(): void;

  send(): Promise<void>;
  restoreFromHistory(entry: HistoryEntry): void;
}

const Context = createContext<ListState | null>(null);

function sameFav(a: SelectedItem, itemId: number, variationLabel?: string | null): boolean {
  return a.itemId === itemId && (a.variationLabel ?? null) === (variationLabel ?? null);
}

export function ListProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<SelectedItem[]>([]);
  const [favorites, setFavorites] = useState<SelectedItem[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from storage
  useEffect(() => {
    (async () => {
      const [current, favs, hist] = await Promise.all([
        getJSON<SelectedItem[]>(StorageKeys.current, []),
        getJSON<SelectedItem[]>(StorageKeys.favorites, []),
        getJSON<HistoryEntry[]>(StorageKeys.history, [])
      ]);
      setSelection(current);
      setFavorites(favs);
      setHistory(hist);
      setIsHydrated(true);
    })();
  }, []);

  // Debounced save of selection
  const selectionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isHydrated) return;
    if (selectionSaveTimer.current) clearTimeout(selectionSaveTimer.current);
    selectionSaveTimer.current = setTimeout(() => {
      setJSON(StorageKeys.current, selection).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (selectionSaveTimer.current) clearTimeout(selectionSaveTimer.current);
    };
  }, [selection, isHydrated]);

  // Debounced save of favorites
  const favSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isHydrated) return;
    if (favSaveTimer.current) clearTimeout(favSaveTimer.current);
    favSaveTimer.current = setTimeout(() => {
      setJSON(StorageKeys.favorites, favorites).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (favSaveTimer.current) clearTimeout(favSaveTimer.current);
    };
  }, [favorites, isHydrated]);

  // History persists immediately (small writes at send time only)
  useEffect(() => {
    if (!isHydrated) return;
    setJSON(StorageKeys.history, history).catch(() => {});
  }, [history, isHydrated]);

  const isSelected = useCallback(
    (itemId: number) => selection.some((s) => s.itemId === itemId),
    [selection]
  );
  const getSelectedVariation = useCallback(
    (itemId: number) => selection.find((s) => s.itemId === itemId)?.variationLabel,
    [selection]
  );

  const toggle = useCallback((itemId: number, variationLabel: string | null = null) => {
    haptics.selection();
    setSelection((prev) => {
      const idx = prev.findIndex((s) => s.itemId === itemId);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      return [...prev, { itemId, variationLabel: variationLabel ?? null }];
    });
  }, []);

  const clear = useCallback(() => {
    setSelection([]);
  }, []);

  const isFavorite = useCallback(
    (itemId: number, variationLabel: string | null = null) =>
      favorites.some((f) => sameFav(f, itemId, variationLabel)),
    [favorites]
  );

  const toggleFavorite = useCallback((itemId: number, variationLabel: string | null = null) => {
    haptics.light();
    setFavorites((prev) => {
      const idx = prev.findIndex((f) => sameFav(f, itemId, variationLabel));
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { itemId, variationLabel }];
    });
  }, []);

  const addAllFavoritesToSelection = useCallback(() => {
    setSelection((prev) => {
      const next = [...prev];
      for (const f of favorites) {
        if (!next.some((s) => s.itemId === f.itemId)) {
          next.push({ itemId: f.itemId, variationLabel: f.variationLabel });
        }
      }
      return next;
    });
  }, [favorites]);

  const restoreFromHistory = useCallback((entry: HistoryEntry) => {
    setSelection(entry.items);
  }, []);

  const send = useCallback(async () => {
    if (selection.length === 0) return;
    const itemsById = new Map<number, Item>();
    for (const s of selection) {
      const item = getItemById(s.itemId);
      if (item) itemsById.set(item.id, item);
    }
    const text = buildSelectionMessage(selection, itemsById);
    const result = await openWhatsApp(text);
    if (result === 'failed') return;

    haptics.success();
    setHistory((prev) => {
      const entry: HistoryEntry = { sentAt: new Date().toISOString(), items: selection };
      const next = [entry, ...prev];
      return next.slice(0, HISTORY_LIMIT);
    });
    setSelection([]);
  }, [selection]);

  const value = useMemo<ListState>(
    () => ({
      selection,
      favorites,
      history,
      isHydrated,
      isSelected,
      getSelectedVariation,
      toggle,
      clear,
      isFavorite,
      toggleFavorite,
      addAllFavoritesToSelection,
      send,
      restoreFromHistory
    }),
    [
      selection, favorites, history, isHydrated,
      isSelected, getSelectedVariation, toggle, clear,
      isFavorite, toggleFavorite, addAllFavoritesToSelection, send, restoreFromHistory
    ]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useList(): ListState {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useList must be used inside <ListProvider>');
  return ctx;
}
