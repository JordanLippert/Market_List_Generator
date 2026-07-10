import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';

interface SearchBarProps {
  value: string;
  onChangeText(v: string): void;
}

export function SearchBar({ value, onChangeText }: SearchBarProps) {
  return (
    <View style={styles.wrap}>
      <AppText family="mono" size="xs" color="muted" uppercase>buscar &gt;</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="digite um produto..."
        placeholderTextColor={theme.colors.muted}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        accessibilityLabel="Buscar produto"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: theme.spacing[4]
  },
  input: {
    flex: 1,
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.inputFontSize,
    color: theme.colors.ink,
    padding: 0
  }
});
