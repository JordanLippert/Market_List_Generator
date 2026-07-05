import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';
import * as haptics from '@app/lib/haptics';

interface MastheadProps {
  totalItems: number;
  onOpenHistory(): void;
  onOpenFavorites(): void;
}

function today(): { date: string; day: string } {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}`;
  const dayNames = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
  return { date, day: dayNames[now.getDay()] };
}

export function Masthead({ totalItems, onOpenHistory, onOpenFavorites }: MastheadProps) {
  const { date, day } = today();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <AppText family="display" size="3xl" color="ink" style={styles.wordmark}>Lista.</AppText>
        <View style={{ flex: 1 }} />
        <View style={styles.stampCol}>
          <AppText family="mono" size="xs" color="ink">{date}</AppText>
          <AppText family="mono" size="xs" color="muted">{day}</AppText>
        </View>
      </View>

      <View style={styles.subRow}>
        <AppText family="mono" size="xs" color="muted">
          compra da semana — <AppText family="mono" size="xs" color="ink2">{totalItems} produtos disponíveis</AppText>
        </AppText>

        <View style={styles.iconBtns}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir histórico"
            hitSlop={12}
            onPress={() => {
              haptics.light();
              onOpenHistory();
            }}
            style={styles.iconBtn}
          >
            <AppText family="mono" size="sm" color="ink">Hist</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir favoritos"
            hitSlop={12}
            onPress={() => {
              haptics.light();
              onOpenFavorites();
            }}
            style={styles.iconBtn}
          >
            <AppText family="mono" size="sm" color="ink">★</AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1.5,
    borderColor: theme.colors.ink,
    paddingBottom: theme.spacing[4],
    marginBottom: theme.spacing[4]
  },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  wordmark: { lineHeight: 56 },
  stampCol: { alignItems: 'flex-end' },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing[2]
  },
  iconBtns: { flexDirection: 'row', gap: 12 },
  iconBtn: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 6
  }
});
