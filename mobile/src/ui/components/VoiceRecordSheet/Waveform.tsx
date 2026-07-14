import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@ui/styles/theme';

const BASE_HEIGHTS = [6, 14, 22, 30, 18, 10, 16, 26, 32, 20, 12, 8, 14, 24, 30, 22, 14, 10];
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 32;

interface WaveformProps {
  active: boolean;
  level: number;
  waveform: number[] | null;
}

export function Waveform({ active, level, waveform }: WaveformProps) {
  const [heights, setHeights] = useState<number[]>(BASE_HEIGHTS);
  const levelRef = useRef(level);
  levelRef.current = level;
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      setHeights(
        waveform
          ? waveform.map((v) => MIN_HEIGHT + Math.round(v * (MAX_HEIGHT - MIN_HEIGHT)))
          : BASE_HEIGHTS
      );
      return;
    }
    const start = Date.now();
    const tick = () => {
      const t = (Date.now() - start) / 200;
      const lvl = levelRef.current;
      setHeights(
        BASE_HEIGHTS.map((base, idx) => {
          const wave = Math.abs(Math.sin(t + idx * 0.5));
          const amplitude = MIN_HEIGHT + (base - MIN_HEIGHT) * wave * (0.3 + lvl);
          return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(amplitude)));
        })
      );
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [active, waveform]);

  return (
    <View style={styles.row}>
      {heights.map((h, idx) => (
        <View key={idx} style={[styles.bar, { height: h }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: MAX_HEIGHT,
    flex: 1,
    justifyContent: 'center'
  },
  bar: { width: 3.5, borderRadius: 2, backgroundColor: theme.colors.ink }
});
