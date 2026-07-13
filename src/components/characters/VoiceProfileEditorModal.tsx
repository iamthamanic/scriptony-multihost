/**
 * MVE voice editor modal — all voice settings for a character (MVP 0.1).
 * Location: src/components/characters/VoiceProfileEditorModal.tsx
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMveVoicePreview } from "@/hooks/useMveVoicePreview";
import { useGlobalLoadingProgress } from "@/hooks/useGlobalLoadingProgress";
import { useSaveVoiceProfile } from "@/hooks/useSaveVoiceProfile";
import {
  prefetchAllVoiceboxVoiceProfiles,
  useTtsVoiceProfiles,
} from "@/hooks/useTtsVoiceProfiles";
import { DEFAULT_VOICE_ENGINE } from "@/lib/config/voice-engine";
import {
  isVoiceboxBackedProvider,
  resolveVoiceProviderId,
  voiceProviderLabel,
  type VoiceProviderId,
} from "@/lib/config/voice-providers";
import { voiceboxModelStatusHint } from "@/lib/voicebox/voicebox-model-status";
import { generateVoiceFromDescription } from "@/lib/mve/casting/generate-voice-from-description";
import { compileVoiceDesignPrompt } from "@/lib/mve/casting/compile-voice-design-prompt";
import {
  discardVoiceDesignPreviewSession,
  previewVoiceDesignCandidates,
} from "@/lib/mve/casting/preview-voice-design-candidates";
import { saveVoiceDesignCandidate } from "@/lib/mve/casting/save-voice-design-candidate";
import type {
  VoiceDesignCandidate,
  VoiceDesignPreviewSession,
} from "@/lib/mve/casting/voice-design-candidate";
import { usePersistMvePreviewText } from "@/hooks/usePersistMvePreviewText";
import { playVoiceDesignCandidateLive } from "@/lib/mve/play-voice-design-candidate";
import { createTunedVoiceProfile } from "@/lib/mve/tune/create-tuned-voice-profile";
import {
  createMveVoiceProfile,
  getLatestVerifiedMveVoiceConsent,
  getMveVoiceProfile,
} from "@/lib/api-adapter/mve-adapter";
import { requestVoiceClone } from "@/lib/mve/clone/request-voice-clone";
import {
  revokeVoiceCloneConsent,
  submitVoiceCloneConsent,
} from "@/lib/mve/safety/submit-voice-clone-consent";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { mveDefaultPreviewForCharacter } from "@/lib/mve/default-preview-text";
import { resolveMveTtsVoiceId } from "@/lib/mve/resolve-tts-voice-id";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import { VoiceProfileEditorForm } from "./VoiceProfileEditorForm";
import { VoiceDesignSaveDialog } from "./VoiceDesignSaveDialog";
import type { VoiceTuneSubmitOptions } from "./VoiceStudioTuneSection";
import {
  emptyVoiceDesignSpec,
  type MveVoiceDesignSpec,
} from "@/lib/multi-voice-engine/schema/voice-design-spec";
import { isDesktopShell } from "@/runtime/detect-runtime";

export interface VoiceProfileEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectDir?: string;
  characterId: string;
  characterName: string;
  profile?: MveVoiceProfile | null;
  onSaved: () => void;
}

export function VoiceProfileEditorModal({
  open,
  onOpenChange,
  projectId,
  projectDir,
  characterId,
  characterName,
  profile,
  onSaved,
}: VoiceProfileEditorModalProps) {
  const [activeProfile, setActiveProfile] = useState<MveVoiceProfile | null>(
    profile ?? null,
  );
  const [previewText, setPreviewText] = useState(
    profile?.previewText ?? mveDefaultPreviewForCharacter(characterName),
  );
  const [description, setDescription] = useState(profile?.description ?? "");
  const [designSpec, setDesignSpec] = useState<MveVoiceDesignSpec>(
    profile?.designSpec ?? emptyVoiceDesignSpec(),
  );
  const [designPreviewSession, setDesignPreviewSession] =
    useState<VoiceDesignPreviewSession | null>(null);
  const [saveCandidate, setSaveCandidate] =
    useState<VoiceDesignCandidate | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [playingCandidateId, setPlayingCandidateId] = useState<string | null>(
    null,
  );
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(
    null,
  );
  const designPreviewSessionRef = useRef<VoiceDesignPreviewSession | null>(
    null,
  );
  const [speed, setSpeed] = useState(profile?.defaultSettings?.speed ?? 1);
  const [generateHint, setGenerateHint] = useState<string | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDesigning, setIsDesigning] = useState(false);
  const [isCloneBusy, setIsCloneBusy] = useState(false);
  const [isCloneStartBusy, setIsCloneStartBusy] = useState(false);
  const [isTuneBusy, setIsTuneBusy] = useState(false);
  const [latestConsent, setLatestConsent] = useState<MveVoiceConsent | null>(
    null,
  );
  const [tuneSourceProfile, setTuneSourceProfile] =
    useState<MveVoiceProfile | null>(null);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProviderId>(
    resolveVoiceProviderId(profile?.engine),
  );
  const providerSyncKeyRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const localVoices = useTtsVoiceProfiles({
    projectDir,
    provider: voiceProvider,
    enabled: open && (Boolean(projectDir) || voiceProvider === "elevenlabs"),
  });

  const refreshSaved = useCallback(() => onSaved(), [onSaved]);
  const { playPreview, isPlaying } = useMveVoicePreview();
  const { runWithProgress } = useGlobalLoadingProgress();
  const { saveVoiceProfile, isSaving } = useSaveVoiceProfile(refreshSaved);

  const handlePreviewTextPersisted = useCallback((text: string) => {
    setActiveProfile((prev) => (prev ? { ...prev, previewText: text } : prev));
  }, []);

  usePersistMvePreviewText({
    profileId: activeProfile?.id,
    previewText,
    enabled: open,
    onPersisted: handlePreviewTextPersisted,
  });

  useEffect(() => {
    if (!open) {
      providerSyncKeyRef.current = null;
      return;
    }

    const syncKey = characterId;
    const shouldSyncProvider = providerSyncKeyRef.current !== syncKey;
    providerSyncKeyRef.current = syncKey;

    setActiveProfile(profile ?? null);
    setPreviewText(
      profile?.previewText ?? mveDefaultPreviewForCharacter(characterName),
    );
    setDescription(profile?.description ?? "");
    setDesignSpec(profile?.designSpec ?? emptyVoiceDesignSpec());
    setDesignPreviewSession(null);
    designPreviewSessionRef.current = null;
    setSaveCandidate(null);
    setSaveDialogOpen(false);
    setSpeed(profile?.defaultSettings?.speed ?? 1);
    setGenerateHint(undefined);
    setLatestConsent(null);
    setTuneSourceProfile(null);
    if (shouldSyncProvider) {
      setVoiceProvider(resolveVoiceProviderId(profile?.engine));
    }
  }, [open, profile, characterName, characterId]);

  useEffect(() => {
    if (!open || !projectDir) return;
    void prefetchAllVoiceboxVoiceProfiles(queryClient, projectDir);
  }, [open, projectDir, queryClient]);

  useEffect(() => {
    if (!open || !activeProfile?.id) {
      setLatestConsent(null);
      return;
    }
    void getLatestVerifiedMveVoiceConsent(activeProfile.id).then(
      setLatestConsent,
    );
  }, [open, activeProfile?.id]);

  useEffect(() => {
    if (
      !open ||
      activeProfile?.type !== "tuned" ||
      !activeProfile.baseVoiceId
    ) {
      setTuneSourceProfile(null);
      return;
    }
    void getMveVoiceProfile(activeProfile.baseVoiceId).then(
      setTuneSourceProfile,
    );
  }, [open, activeProfile?.type, activeProfile?.baseVoiceId]);

  const voiceId = resolveMveTtsVoiceId(activeProfile, tuneSourceProfile);

  const handleVoiceAssigned = useCallback(
    (assigned: MveVoiceProfile) => {
      setActiveProfile(assigned);
      if (assigned.description) setDescription(assigned.description);
      if (assigned.designSpec) setDesignSpec(assigned.designSpec);
      refreshSaved();
    },
    [refreshSaved],
  );

  const handleSave = async () => {
    if (!activeProfile?.id) {
      return;
    }
    const ok = await saveVoiceProfile({
      profileId: activeProfile.id,
      previewText,
      description,
      designSpec,
      defaultSettings: { speed },
    });
    if (ok) onOpenChange(false);
  };

  const catalogVoices = localVoices.data?.voices?.length
    ? localVoices.data.voices
    : [];

  const handleSuggestFromDescription = useCallback(async () => {
    if (!description.trim()) return;

    if (localVoices.data && !localVoices.data.engineReady) {
      toast.error(
        localVoices.data.engineError ??
          `${localVoices.data.providerLabel} ist noch nicht bereit.`,
      );
    }

    setIsGenerating(true);
    setGenerateHint(undefined);
    try {
      const result = await generateVoiceFromDescription({
        projectId,
        characterId,
        characterName,
        description,
        voices: catalogVoices,
        providerLabel:
          localVoices.data?.providerLabel ?? voiceProviderLabel(voiceProvider),
        existingProfile: activeProfile,
        previewText,
      });
      setActiveProfile(result.profile);
      setGenerateHint(result.hint);
      refreshSaved();
      toast.success(
        `Stimme zugeordnet: ${result.matchedVoice.name}${result.weakMatch ? " (Näherung)" : ""}`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Stimme konnte nicht zugeordnet werden.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    activeProfile,
    catalogVoices,
    characterId,
    characterName,
    description,
    localVoices.data,
    previewText,
    projectId,
    refreshSaved,
    voiceProvider,
  ]);

  const handleDesignFromDescription = useCallback(async () => {
    const designPrompt = compileVoiceDesignPrompt({
      basicDescription: description,
      designSpec,
    });
    if (!designPrompt.trim()) return;

    if (!isLocalProfile() || !isDesktopShell()) {
      toast.error("Prompt-to-Voice nur lokal in der Desktop-App verfügbar.");
      return;
    }
    if (!projectDir) {
      toast.error("Lokales Projekt erforderlich für Voicebox.");
      return;
    }

    if (designPreviewSessionRef.current) {
      await discardVoiceDesignPreviewSession(designPreviewSessionRef.current);
      designPreviewSessionRef.current = null;
      setDesignPreviewSession(null);
    }

    setIsDesigning(true);
    setGenerateHint(undefined);
    try {
      const session = await runWithProgress({
        id: `voicebox-design-${characterId}-${projectDir}`,
        title: "Stimme erzeugen",
        initialMessage: "Voicebox erstellt Stimm-Kandidaten…",
        initialPercent: 8,
        run: (report) =>
          previewVoiceDesignCandidates({
            characterName,
            basicDescription: description,
            designSpec,
            previewText,
            projectDir,
            onProgress: report,
          }),
      });
      designPreviewSessionRef.current = session;
      setDesignPreviewSession(session);
      setGenerateHint(
        "Drei Kandidaten bereit — anhören und eine Stimme speichern.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Stimme konnte nicht erzeugt werden.",
      );
    } finally {
      setIsDesigning(false);
    }
  }, [
    characterId,
    characterName,
    description,
    designSpec,
    previewText,
    projectDir,
    runWithProgress,
  ]);

  const handlePlayDesignCandidate = useCallback(
    async (candidate: VoiceDesignCandidate) => {
      if (!projectDir) {
        toast.error("Lokales Projekt erforderlich für Voicebox.");
        return;
      }
      const text = previewText.trim();
      if (!text) {
        toast.error("Bitte einen Standard-Satz für die Vorschau eingeben.");
        return;
      }

      setPlayingCandidateId(candidate.id);
      try {
        await runWithProgress({
          id: `voice-design-play-${candidate.id}`,
          title: `Kandidat ${candidate.label} anhören`,
          initialMessage: "Vorschau wird mit aktuellem Satz erzeugt…",
          initialPercent: 12,
          run: (report) =>
            playVoiceDesignCandidateLive({
              voiceboxProfileId: candidate.voiceboxProfileId,
              previewText: text,
              projectDir,
              speed,
              onProgress: report,
            }),
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Vorschau fehlgeschlagen.",
        );
      } finally {
        setPlayingCandidateId(null);
      }
    },
    [previewText, projectDir, runWithProgress, speed],
  );

  const handleSaveDesignCandidateClick = useCallback(
    (candidate: VoiceDesignCandidate) => {
      setSaveCandidate(candidate);
      setSaveDialogOpen(true);
    },
    [],
  );

  const handleSaveDesignCandidateConfirm = useCallback(
    async (voiceName: string) => {
      if (!saveCandidate || !designPreviewSession || !projectDir) return;

      setSavingCandidateId(saveCandidate.id);
      try {
        const result = await runWithProgress({
          id: `voicebox-save-${saveCandidate.voiceboxProfileId}`,
          title: "Stimme speichern",
          initialMessage: "Stimme wird dem Charakter zugewiesen…",
          initialPercent: 12,
          run: () =>
            saveVoiceDesignCandidate({
              projectId,
              characterId,
              characterName,
              voiceName,
              candidate: saveCandidate,
              session: designPreviewSession,
              designPrompt: designPreviewSession.designPrompt,
              designSpec,
              existingProfile: activeProfile,
              previewText,
            }),
        });
        setActiveProfile(result.profile);
        setDescription(result.profile.description ?? description);
        setDesignSpec(result.profile.designSpec ?? designSpec);
        setVoiceProvider("voicebox");
        setGenerateHint(result.hint);
        designPreviewSessionRef.current = null;
        setDesignPreviewSession(null);
        setSaveDialogOpen(false);
        setSaveCandidate(null);
        refreshSaved();
        void prefetchAllVoiceboxVoiceProfiles(queryClient, projectDir);
        toast.success(`Stimme gespeichert: ${result.voiceboxProfileName}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Speichern fehlgeschlagen.",
        );
      } finally {
        setSavingCandidateId(null);
      }
    },
    [
      activeProfile,
      characterId,
      characterName,
      description,
      designPreviewSession,
      designSpec,
      previewText,
      projectDir,
      projectId,
      queryClient,
      refreshSaved,
      runWithProgress,
      saveCandidate,
    ],
  );

  const handleModalOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && designPreviewSessionRef.current) {
        void discardVoiceDesignPreviewSession(
          designPreviewSessionRef.current,
        ).finally(() => {
          designPreviewSessionRef.current = null;
          setDesignPreviewSession(null);
        });
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const ensureProfileForClone =
    useCallback(async (): Promise<MveVoiceProfile> => {
      if (activeProfile?.id) return activeProfile;
      const created = await createMveVoiceProfile(projectId, {
        name: `${characterName.trim() || "Charakter"} — Stimme`,
        characterId,
        engine: DEFAULT_VOICE_ENGINE,
        language: "de",
        status: "draft",
        consentStatus: "pending",
        previewText,
      });
      setActiveProfile(created);
      refreshSaved();
      return created;
    }, [
      activeProfile,
      characterId,
      characterName,
      previewText,
      projectId,
      refreshSaved,
    ]);

  const handleCloneSubmit = useCallback(
    async (
      file: File,
      options: { consentConfirmed: boolean; commercialUseAllowed: boolean },
    ) => {
      if (!isLocalProfile()) {
        toast.error("Voice Clone Consent ist nur lokal verfügbar.");
        return;
      }
      setIsCloneBusy(true);
      try {
        const voiceProfile = await ensureProfileForClone();
        const result = await submitVoiceCloneConsent({
          projectId,
          voiceProfileId: voiceProfile.id,
          file,
          consentConfirmed: options.consentConfirmed,
          commercialUseAllowed: options.commercialUseAllowed,
        });
        setActiveProfile(result.profile);
        setLatestConsent(result.consent);
        refreshSaved();
        toast.success("Consent gespeichert — Clone kann vorbereitet werden.");
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Consent konnte nicht gespeichert werden.",
        );
      } finally {
        setIsCloneBusy(false);
      }
    },
    [ensureProfileForClone, projectId, refreshSaved],
  );

  const handleCloneRevoke = useCallback(async () => {
    if (!activeProfile?.id) return;
    setIsCloneBusy(true);
    try {
      const updated = await revokeVoiceCloneConsent(
        projectId,
        activeProfile.id,
      );
      setActiveProfile(updated);
      setLatestConsent(null);
      refreshSaved();
      toast.success("Consent widerrufen — Stimme gesperrt.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Widerruf fehlgeschlagen.",
      );
    } finally {
      setIsCloneBusy(false);
    }
  }, [activeProfile?.id, projectId, refreshSaved]);

  const handleCloneStart = useCallback(async () => {
    if (!isLocalProfile()) {
      toast.error("Voice Clone ist nur lokal verfügbar.");
      return;
    }
    if (!activeProfile?.id) return;
    const profileId = activeProfile.id;
    setIsCloneStartBusy(true);
    setActiveProfile((prev) =>
      prev ? { ...prev, status: "processing" } : prev,
    );
    try {
      const result = await requestVoiceClone({
        projectId,
        voiceProfileId: profileId,
      });
      setActiveProfile(result.profile);
      refreshSaved();
      toast.success("Stimme geklont — Vorschau abspielbar.");
    } catch (err) {
      const refreshed = await getMveVoiceProfile(profileId);
      if (refreshed) setActiveProfile(refreshed);
      toast.error(err instanceof Error ? err.message : "Clone fehlgeschlagen.");
    } finally {
      setIsCloneStartBusy(false);
    }
  }, [activeProfile?.id, projectId, refreshSaved]);

  const handleTuneSubmit = useCallback(
    async (options: VoiceTuneSubmitOptions) => {
      if (!isLocalProfile()) {
        toast.error("Voice Tune ist nur lokal verfügbar.");
        return;
      }
      if (!activeProfile?.id || activeProfile.type === "tuned") {
        toast.error("Bitte zuerst eine Basis-Stimme wählen oder erzeugen.");
        return;
      }
      setIsTuneBusy(true);
      try {
        const tuned = await createTunedVoiceProfile({
          projectId,
          baseProfile: activeProfile,
          tuneDescription: options.tuneDescription,
          overrides: {
            pitch: options.pitch,
            pace: options.pace,
            energy: options.energy,
            speed: options.speed,
          },
        });
        setActiveProfile(tuned);
        setSpeed(tuned.defaultSettings?.speed ?? options.speed);
        setDescription(tuned.description ?? "");
        refreshSaved();
        toast.success("Getunte Stimme erstellt — Original unverändert.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Tune fehlgeschlagen.",
        );
      } finally {
        setIsTuneBusy(false);
      }
    },
    [activeProfile, projectId, refreshSaved],
  );

  const compiledDesignPrompt = compileVoiceDesignPrompt({
    basicDescription: description,
    designSpec,
  });

  const saveCandidateDefaultName = saveCandidate
    ? `${characterName.trim() || "Charakter"} — Kandidat ${saveCandidate.label}`
    : "";

  const modelStatusHint =
    localVoices.data?.engineReady &&
    isVoiceboxBackedProvider(voiceProvider) &&
    !localVoices.data.voiceboxModelLoaded
      ? voiceboxModelStatusHint({
          modelLoaded: localVoices.data.voiceboxModelLoaded,
          modelDownloaded: localVoices.data.voiceboxModelDownloaded,
        })
      : undefined;

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Charakterstimme — {characterName}</DialogTitle>
          <DialogDescription>
            Stimme zuweisen, Vorschau-Satz und Basis-Einstellungen für diesen
            Charakter.
          </DialogDescription>
        </DialogHeader>

        <VoiceProfileEditorForm
          projectId={projectId}
          projectDir={projectDir}
          characterId={characterId}
          characterName={characterName}
          profile={activeProfile}
          previewText={previewText}
          description={description}
          designSpec={designSpec}
          speed={speed}
          voiceId={voiceId}
          isPlaying={isPlaying}
          generateBusy={isGenerating || isDesigning}
          generateDisabled={localVoices.isLoading}
          generateHint={generateHint}
          showDesignVoice={isDesktopShell() && Boolean(projectDir)}
          designVoiceDisabled={
            !isLocalProfile() || !compiledDesignPrompt.trim()
          }
          onDesignFromDescription={() => void handleDesignFromDescription()}
          cloneBusy={isCloneBusy}
          cloneStartBusy={isCloneStartBusy}
          cloneDisabled={!isLocalProfile()}
          tuneBusy={isTuneBusy}
          tuneDisabled={!isLocalProfile()}
          latestConsent={latestConsent}
          onPreviewTextChange={setPreviewText}
          onDescriptionChange={setDescription}
          onDesignSpecChange={setDesignSpec}
          designCandidates={designPreviewSession?.candidates ?? []}
          playingCandidateId={playingCandidateId}
          savingCandidateId={savingCandidateId}
          onPlayDesignCandidate={(c) => void handlePlayDesignCandidate(c)}
          onSaveDesignCandidate={handleSaveDesignCandidateClick}
          onSpeedChange={setSpeed}
          onPlayPreview={() =>
            playPreview({
              projectDir,
              voiceId,
              characterName,
              previewText,
              speed,
              engine: activeProfile?.engine,
            })
          }
          onVoiceAssignedProfile={handleVoiceAssigned}
          onSuggestFromDescription={() => void handleSuggestFromDescription()}
          onCloneSubmit={(file, options) =>
            void handleCloneSubmit(file, options)
          }
          onCloneRevoke={() => void handleCloneRevoke()}
          onCloneStart={() => void handleCloneStart()}
          onTuneSubmit={(options) => void handleTuneSubmit(options)}
          voiceProvider={voiceProvider}
          onVoiceProviderChange={setVoiceProvider}
        />

        {modelStatusHint ? (
          <p
            className="text-[11px] text-amber-600 dark:text-amber-500 px-1"
            data-testid="voice-editor-model-status"
          >
            {modelStatusHint}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !activeProfile?.id}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speichern…
              </>
            ) : (
              "Speichern"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <VoiceDesignSaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        defaultName={saveCandidateDefaultName}
        busy={Boolean(savingCandidateId)}
        onConfirm={(name) => void handleSaveDesignCandidateConfirm(name)}
      />
    </Dialog>
  );
}
