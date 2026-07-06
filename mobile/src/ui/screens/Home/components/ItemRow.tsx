import React, { useEffect } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';
import type { Item } from '@app/types/catalog';

interface ItemRowProps {
  item: Item;
  checked: boolean;
  variation: string | null;
  isFavorite: boolean;
  onPress(): void;
  onLongPress(): void;
}

export function ItemRow({ item, checked, variation, isFavorite, onPress, onLongPress }: ItemRowProps) {
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 140 });
  }, [checked, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: theme.colors.ink,
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }]
  }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={item.name + (variation ? ` (${variation})` : '')}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={styles.row}
    >
      <View style={styles.box}>
        <Animated.View style={[StyleSheet.absoluteFill, fillStyle]} />
      </View>
      <AppText family={checked ? 'body' : 'bodyRegular'} size="base" color={checked ? 'muted' : 'ink2'} style={styles.label}>
        {item.name}
      </AppText>
      {variation && (
        <AppText family="mono" size="xs" color="muted">({variation})</AppText>
      )}
      {isFavorite && (
        <Feather name="star" size={14} color={theme.colors.ink} style={styles.fav} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4
  },
  box: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    overflow: 'hidden'
  },
  label: { flex: 1 },
  fav: { marginLeft: 6 }
});
