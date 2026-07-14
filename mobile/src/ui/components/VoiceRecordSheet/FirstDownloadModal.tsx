import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';

interface FirstDownloadModalProps {
  visible: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function FirstDownloadModal({ visible, onConfirm, onCancel }: FirstDownloadModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <AppText family="display" size="lg" color="ink">Primeiro uso</AppText>
          <AppText family="mono" size="xs" color="muted" style={styles.body}>
            vamos baixar ~21mb pra reconhecer sua voz. precisa de internet agora, depois funciona offline.
          </AppText>
          <View style={styles.actions}>
            <Button label="Agora não" variant="ghostDark" onPress={onCancel} style={styles.actionBtn} />
            <Button label="Entendi" variant="go" onPress={onConfirm} style={styles.actionBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[5]
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: theme.colors.paper,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    padding: theme.spacing[4]
  },
  body: { marginTop: theme.spacing[2], marginBottom: theme.spacing[4] },
  actions: { flexDirection: 'row', gap: theme.spacing[2], justifyContent: 'flex-end' },
  actionBtn: { minWidth: 96 }
});
