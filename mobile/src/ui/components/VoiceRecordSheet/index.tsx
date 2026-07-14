import React, { forwardRef, useRef } from 'react';
import type BottomSheet from '@gorhom/bottom-sheet';
import { AudioRecorder } from '@hearsay-pwa/core/src/AudioRecorder';
import { computeWaveform } from '@hearsay-pwa/core/src/Waveform';
import { VoiceButton } from '@hearsay-pwa/react/src/VoiceButton';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';

void computeWaveform;

interface VoiceRecordSheetProps {
  onSubmit(text: string): void;
  onClose(): void;
  onError(message: string): void;
}

export const VoiceRecordSheet = forwardRef<BottomSheet, VoiceRecordSheetProps>(function VoiceRecordSheet(
  { onClose },
  ref
) {
  const recorderRef = useRef<AudioRecorder | null>(null);
  if (!recorderRef.current) recorderRef.current = new AudioRecorder();

  return (
    <Sheet ref={ref} snapPoints={['50%']} onClose={onClose}>
      <AppText family="display" size="lg" color="ink">Gravar por voz</AppText>
      <VoiceButton mode="press-release" onStart={() => {}} onStop={() => {}}>
        <AppText family="mono" size="xs" color="ink">gravar</AppText>
      </VoiceButton>
    </Sheet>
  );
});
