/**
 * React hook — small scene-selection state machine for MVE text-block audio
 * actions (T28). Handles pending action, selected scene id, and queued file.
 *
 * Location: src/hooks/useMveSceneSelection.ts
 */

import { useCallback, useMemo, useState } from "react";

export type MveAudioAction = "generate" | "upload" | "record";

export interface UseMveSceneSelectionOptions {
  initialSceneId?: string;
}

export interface MveSceneSelectionState {
  pendingAction: MveAudioAction | null;
  selectedSceneId: string | null;
  queuedFile: File | null;
  requestSceneForAction: (action: MveAudioAction) => void;
  setSelectedSceneId: (id: string | null) => void;
  queueFile: (file: File) => void;
  confirm: () => MveAudioAction | null;
  cancel: () => void;
}

export function useMveSceneSelection({
  initialSceneId,
}: UseMveSceneSelectionOptions = {}): MveSceneSelectionState {
  const [pendingAction, setPendingAction] = useState<MveAudioAction | null>(
    null,
  );
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(
    initialSceneId ?? null,
  );
  const [queuedFile, setQueuedFile] = useState<File | null>(null);

  const requestSceneForAction = useCallback((action: MveAudioAction) => {
    setPendingAction(action);
  }, []);

  const queueFile = useCallback((file: File) => {
    setQueuedFile(file);
  }, []);

  const confirm = useCallback((): MveAudioAction | null => {
    const action = pendingAction;
    setPendingAction(null);
    return action;
  }, [pendingAction]);

  const cancel = useCallback(() => {
    setQueuedFile(null);
    setPendingAction(null);
  }, []);

  return useMemo(
    () => ({
      pendingAction,
      selectedSceneId,
      queuedFile,
      requestSceneForAction,
      setSelectedSceneId,
      queueFile,
      confirm,
      cancel,
    }),
    [
      pendingAction,
      selectedSceneId,
      queuedFile,
      requestSceneForAction,
      queueFile,
      confirm,
      cancel,
    ],
  );
}
