import React, { forwardRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';

interface VoiceCommandSheetProps {
  onSubmit(text: string): void;
  onClose(): void;
}

export const VoiceCommandSheet = forwardRef<BottomSheet, VoiceCommandSheetProps>(function VoiceCommandSheet(
  { onSubmit, onClose },
  ref
) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setText('');
  };

  return (
    <Sheet ref={ref} snapPoints={['45%']} onClose={onClose}>
      <AppText family="display" size="lg" color="ink">Adicionar por voz</AppText>
      <AppText family="mono" size="xs" color="muted" style={styles.subtitle}>
        toque no campo, use o microfone do teclado, dite os itens separados por vírgula ou "e"
      </AppText>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="arroz, feijão, leite..."
        placeholderTextColor={theme.colors.muted}
        style={styles.input}
        multiline
        autoFocus
        accessibilityLabel="Ditar itens da lista"
      />

      <Button label="Adicionar" variant="go" onPress={handleSubmit} style={styles.confirm} />
    </Sheet>
  );
});

const styles = StyleSheet.create({
  subtitle: { marginTop: theme.spacing[1], marginBottom: theme.spacing[4] },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    padding: theme.spacing[3],
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  confirm: { marginTop: theme.spacing[4], alignSelf: 'flex-end' }
});
