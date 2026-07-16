import { getJSON, setJSON, StorageKeys } from './storage';

export async function hasAcknowledgedVoiceModelDownload(): Promise<boolean> {
  return getJSON<boolean>(StorageKeys.voiceModelAck, false);
}

export async function acknowledgeVoiceModelDownload(): Promise<void> {
  await setJSON(StorageKeys.voiceModelAck, true);
}
