/**
 * @deprecated Use useTimelineTransport — legacy re-export for Epic T55 callers.
 */

export {
  TIMELINE_PLAYHEAD_CSS_VAR,
  useTimelineTransport,
  type UseTimelineTransportOptions as UseTimelinePlayheadOptions,
} from "./useTimelineTransport";

import { useTimelineTransport } from "./useTimelineTransport";
import type { UseTimelineTransportOptions } from "./useTimelineTransport";

/** @deprecated Use useTimelineTransport */
export function useTimelinePlayhead(options: UseTimelineTransportOptions) {
  return useTimelineTransport(options);
}
