export interface SelectedItem {
  itemId: number;
  variationLabel: string | null;
}

export interface HistoryEntry {
  sentAt: string; // ISO
  items: SelectedItem[];
}
