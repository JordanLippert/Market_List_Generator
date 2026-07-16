import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import type BottomSheet from '@gorhom/bottom-sheet';
import { AudioRecorder } from '@hearsay-pwa/core/src/AudioRecorder';
import { computeWaveform } from '@hearsay-pwa/core/src/Waveform';
import { VoiceButton } from '@hearsay-pwa/react/src/VoiceButton';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';
import { Waveform } from './Waveform';
import { FirstDownloadModal } from './FirstDownloadModal';
import { ensureVoiceButtonReset } from './webButtonReset';
import { hasAcknowledgedVoiceModelDownload, acknowledgeVoiceModelDownload } from '@app/lib/voiceModelAck';
import { decodeAudioTo16kMono, TARGET_SAMPLE_RATE } from '@app/lib/decodeAudioTo16kMono';
import { trimSilence } from '@app/lib/trimSilence';
import { WhisperWorkerClient, type WhisperWorkerStatus } from '@app/lib/whisperWorkerClient';
import { theme } from '@ui/styles/theme';
import * as haptics from '@app/lib/haptics';

ensureVoiceButtonReset();

interface VoiceRecordSheetProps {
  onSubmit(text: string): void;
  onClose(): void;
  onError(message: string): void;
}

type SheetStatus = 'idle' | 'loading-model' | 'recording' | 'transcribing';

const STATUS_LABEL: Record<SheetStatus, string> = {
  idle: 'segure pra gravar',
  'loading-model': 'preparando reconhecimento de voz...',
  recording: 'gravando — solte pra transcrever',
  transcribing: 'transcrevendo...'
};

export const VoiceRecordSheet = forwardRef<BottomSheet, VoiceRecordSheetProps>(function VoiceRecordSheet(
  { onSubmit, onClose, onError },
  ref
) {
  const [status, setStatus] = useState<SheetStatus>('idle');
  const [locked, setLocked] = useState(false);
  const [level, setLevel] = useState(0);
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const recorderRef = useRef<AudioRecorder | null>(null);
  if (!recorderRef.current) recorderRef.current = new AudioRecorder();

  const clientRef = useRef<WhisperWorkerClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new WhisperWorkerClient({
      onStatusChange: (workerStatus: WhisperWorkerStatus) => {
        if (workerStatus === 'loading-model') setStatus('loading-model');
        if (workerStatus === 'transcribing') setStatus('transcribing');
      }
    });
  }

  const sessionRef = useRef(0);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      recorderRef.current?.cancel();
      clientRef.current?.terminate();
    };
  }, []);

  const handleSheetChange = (index: number) => {
    if (index < 0) return;
    hasAcknowledgedVoiceModelDownload().then((ack) => {
      if (!ack) setShowDownloadModal(true);
    });
  };

  const handleConfirmDownload = async () => {
    await acknowledgeVoiceModelDownload();
    setShowDownloadModal(false);
  };

  const handleStart = async () => {
    if (status !== 'idle') return;
    haptics.light();
    const session = (sessionRef.current += 1);
    setStatus('loading-model');
    setWaveform(null);
    try {
      await clientRef.current!.preload();
      if (sessionRef.current !== session) return;
      setStatus('recording');
      // Fresh instance every attempt: AudioRecorder doesn't clear its internal
      // MediaRecorder reference after stop()/cancel(), so reusing the same
      // instance after a failed attempt makes every later start() throw
      // "already recording" forever. Cheap to just not reuse it.
      recorderRef.current = new AudioRecorder();
      await recorderRef.current.start((lvl) => setLevel(lvl));
    } catch (err) {
      if (sessionRef.current !== session) return;
      setStatus('idle');
      setLevel(0);
      const message =
        err instanceof Error && err.name === 'MicPermissionError'
          ? 'Permita o microfone pra gravar'
          : 'Não deu pra carregar o reconhecimento de voz, tenta o ditado';
      console.error('[VoiceRecordSheet] start failed', err);
      onError(message);
    }
  };

  const handleStop = async () => {
    setLocked(false);
    if (status === 'loading-model') {
      sessionRef.current += 1;
      setStatus('idle');
      return;
    }
    if (status !== 'recording') return;
    const session = sessionRef.current;
    setStatus('transcribing');
    setLevel(0);
    try {
      const blob = await recorderRef.current!.stop();
      const [waveformResult, samples] = await Promise.all([
        computeWaveform(blob, 18).catch(() => null),
        decodeAudioTo16kMono(blob)
      ]);
      if (sessionRef.current !== session) return;
      setWaveform(waveformResult);
      const trimmed = trimSilence(samples, TARGET_SAMPLE_RATE);
      const text = await clientRef.current!.transcribe(trimmed);
      console.log('[VoiceRecordSheet] transcript:', text);
      if (sessionRef.current !== session) return;
      setStatus('idle');
      onSubmit(text);
    } catch (err) {
      if (sessionRef.current !== session) return;
      console.error('[VoiceRecordSheet] stop/transcribe failed', err);
      setStatus('idle');
      onError('Não deu pra carregar o reconhecimento de voz, tenta o ditado');
    }
  };

  const active = status === 'recording';
  const micLabel =
    status === 'loading-model' ? 'aguarde' : active ? 'gravando' : status === 'transcribing' ? 'processando' : 'gravar';

  return (
    <Sheet
      ref={ref}
      snapPoints={['50%']}
      onClose={() => {
        sessionRef.current += 1;
        recorderRef.current?.cancel();
        setStatus('idle');
        setLocked(false);
        setLevel(0);
        onClose();
      }}
      onChange={handleSheetChange}
    >
      <AppText family="display" size="lg" color="ink">Gravar por voz</AppText>
      <AppText family="mono" size="xs" color="muted" style={styles.subtitle}>
        segure o botão e fale os itens naturalmente
      </AppText>

      <AppText family="mono" size="xs" color="muted" uppercase style={styles.statusLabel}>
        {locked ? 'gravando — travado' : STATUS_LABEL[status]}
      </AppText>

      <View style={styles.panel}>
        <View style={[styles.dot, active && styles.dotActive]} />
        <Waveform active={active} level={level} waveform={waveform} />
        {locked && (
          <Pressable
            onPress={handleStop}
            style={styles.lockBadge}
            accessibilityRole="button"
            accessibilityLabel="Parar gravação travada"
          >
            <AppText family="mono" size="xs" uppercase style={styles.lockBadgeText}>travado ×</AppText>
          </Pressable>
        )}
      </View>

      <VoiceButton
        mode="press-drag-lock"
        className="hearsay-voice-btn"
        onStart={handleStart}
        onStop={handleStop}
        onLockChange={setLocked}
      >
        <View style={[styles.micBtn, active && styles.micBtnActive]}>
          <View style={styles.micIconRow}>
            {[4, 9, 7, 4].map((h, idx) => (
              <View key={idx} style={[styles.micIconBar, { height: h }, active && styles.micIconBarActive]} />
            ))}
          </View>
          <AppText family="mono" size="xs" uppercase style={active ? styles.micLabelActive : styles.micLabel}>
            {micLabel}
          </AppText>
        </View>
      </VoiceButton>

      <AppText family="mono" size="xs" color="muted" style={styles.hint}>
        arraste para cima trava sem precisar segurar
      </AppText>

      <FirstDownloadModal
        visible={showDownloadModal}
        onConfirm={handleConfirmDownload}
        onCancel={() => setShowDownloadModal(false)}
      />
    </Sheet>
  );
});

const styles = StyleSheet.create({
  subtitle: { marginTop: theme.spacing[1], marginBottom: theme.spacing[4] },
  statusLabel: { textAlign: 'center', marginBottom: theme.spacing[3] },
  panel: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    padding: theme.spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4]
  },
  dot: { width: 8, height: 8, backgroundColor: theme.colors.ink },
  dotActive: { backgroundColor: theme.colors.go },
  lockBadge: {
    backgroundColor: theme.colors.go,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  lockBadgeText: { color: theme.colors.goInk },
  micBtn: {
    borderWidth: 1.5,
    borderColor: theme.colors.go,
    borderRadius: 4,
    backgroundColor: theme.colors.go,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2]
  },
  micBtnActive: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  micIconRow: { flexDirection: 'row', alignItems: 'center', gap: 2.5 },
  micIconBar: { width: 3, borderRadius: 2, backgroundColor: theme.colors.goInk },
  micIconBarActive: { backgroundColor: theme.colors.go },
  micLabel: { color: theme.colors.goInk },
  micLabelActive: { color: theme.colors.go },
  hint: { textAlign: 'center', marginTop: theme.spacing[2] }
});
