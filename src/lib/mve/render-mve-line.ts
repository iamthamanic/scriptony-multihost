/**
 * Wire renderMveLine to api-adapter + local backend.
 * Location: src/lib/mve/render-mve-line.ts
 */

import {
  getMveLine,
  getMveVoiceProfileForCharacter,
  updateMveLine,
} from "@/lib/api-adapter/mve-adapter";
import {
  createMveAudioJob,
  createMveTake,
  getMveAudioJobsByLine,
  selectMveTake,
  updateMveAudioJob,
  updateMveTake,
} from "@/lib/api-adapter/mve-render-adapter";
import {
  renderMveLine,
  type RenderMveLineInput,
  type RenderMveLineResult,
} from "@/lib/multi-voice-engine/render/render-line";

export async function renderMveLineForProject(
  input: RenderMveLineInput,
): Promise<RenderMveLineResult> {
  return renderMveLine(input, {
    getLine: getMveLine,
    getVoiceForCharacter: getMveVoiceProfileForCharacter,
    listJobsByLine: getMveAudioJobsByLine,
    createJob: (projectId, payload) =>
      createMveAudioJob(projectId, {
        lineId: payload.lineId,
        engine: payload.engine,
        takeCount: payload.takeCount,
        scriptSnapshot: payload.scriptSnapshot,
        status: payload.status,
      }),
    updateJob: updateMveAudioJob,
    createTake: (projectId, payload) =>
      createMveTake(projectId, {
        lineId: payload.lineId,
        jobId: payload.jobId,
        takeIndex: payload.takeIndex,
        directionSnapshot: payload.directionSnapshot,
        status: payload.status,
      }),
    updateTake: updateMveTake,
    selectTake: selectMveTake,
    updateLine: (lineId, patch) =>
      updateMveLine(lineId, {
        status: patch.status,
        selectedTakeId: patch.selectedTakeId,
      }),
  });
}
