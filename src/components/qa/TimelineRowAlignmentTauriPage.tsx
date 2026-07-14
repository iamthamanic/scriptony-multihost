/**
 * DEV-only Tauri QA — opens real .scriptony project and audits timeline row alignment.
 * Navigate in Tauri dev: #qa-timeline-row-alignment-tauri
 * Location: src/components/qa/TimelineRowAlignmentTauriPage.tsx
 */

import { useEffect, useRef, useState } from "react";
import { StructureTimelineView } from "@/components/structure/StructureTimelineView";
import { useLocalProject } from "@/hooks/useLocalProject";
import { isDesktopShell } from "@/runtime/detect-runtime";
import {
  runTimelineRowAlignmentAudit,
  type TimelineRowAlignmentReport,
} from "@/lib/qa/timeline-row-alignment-audit";

/** Real Hörspiel fixture on this machine (audio project). Override via ?projectPath= */
const DEFAULT_PROJECT_PATH =
  "/Users/halteverbotsocialmacpro/Desktop/arsvivai/scriptony-local/test.scriptony";

const DEFAULT_PROJECT_ID = "local_983e4efa-4af5-4c3e-b25d-30f032f78fea";

function resolveProjectPath(): string {
  if (typeof window === "undefined") return DEFAULT_PROJECT_PATH;
  const hash = window.location.hash.slice(1);
  const qIndex = hash.indexOf("?");
  if (qIndex === -1) return DEFAULT_PROJECT_PATH;
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  return params.get("projectPath")?.trim() || DEFAULT_PROJECT_PATH;
}

export function TimelineRowAlignmentTauriPage() {
  const { openProject, project, isOpen } = useLocalProject();
  const [openError, setOpenError] = useState<string | null>(null);
  const [report, setReport] = useState<TimelineRowAlignmentReport | null>(null);
  const auditScheduled = useRef(false);

  useEffect(() => {
    if (!import.meta.env.DEV || !isDesktopShell()) return;
    let cancelled = false;
    void (async () => {
      try {
        await openProject(resolveProjectPath());
      } catch (err) {
        if (!cancelled) {
          setOpenError(
            err instanceof Error
              ? err.message
              : "Projekt konnte nicht geöffnet werden.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openProject]);

  useEffect(() => {
    if (!import.meta.env.DEV || !isDesktopShell()) return;
    const runAudit = () => setReport(runTimelineRowAlignmentAudit(document));
    (
      window as Window & { __runTimelineAlignment?: () => void }
    ).__runTimelineAlignment = runAudit;
    return () => {
      delete (window as Window & { __runTimelineAlignment?: () => void })
        .__runTimelineAlignment;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || auditScheduled.current) return;
    auditScheduled.current = true;
    const timer = window.setTimeout(() => {
      setReport(runTimelineRowAlignmentAudit(document));
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  if (!import.meta.env.DEV) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        QA-Vorschau nur im Dev-Build verfügbar.
      </p>
    );
  }

  if (!isDesktopShell()) {
    return (
      <div
        className="p-8 text-sm text-muted-foreground"
        data-testid="timeline-row-alignment-tauri-unsupported"
      >
        Diese Seite läuft nur in der Tauri Desktop-App (echtes .scriptony + FS).
      </div>
    );
  }

  if (openError) {
    return (
      <div
        className="p-8 space-y-2"
        data-testid="timeline-row-alignment-tauri-error"
      >
        <p className="text-sm font-medium text-destructive">Projektfehler</p>
        <p className="text-xs text-muted-foreground">{openError}</p>
      </div>
    );
  }

  const projectId = project?.projectId ?? DEFAULT_PROJECT_ID;

  return (
    <div
      className="flex h-screen flex-col bg-background"
      data-testid="timeline-row-alignment-tauri"
    >
      <header className="shrink-0 border-b border-border px-4 py-2 text-xs">
        <span className="font-semibold">Tauri Row Alignment — </span>
        <span className="text-muted-foreground">{resolveProjectPath()}</span>
        {report ? (
          <span
            className={
              report.ok ? "ml-2 text-green-600" : "ml-2 text-destructive"
            }
            data-testid="timeline-alignment-verdict"
          >
            {report.ok ? "PASS" : "FAIL"}
          </span>
        ) : (
          <span className="ml-2 text-muted-foreground">Auditing…</span>
        )}
      </header>
      <div className="min-h-0 flex-1">
        <StructureTimelineView projectId={projectId} projectType="audio" />
      </div>
      {report ? (
        <pre
          className="max-h-40 shrink-0 overflow-auto border-t border-border bg-muted/30 p-2 text-[10px]"
          data-testid="timeline-alignment-report"
        >
          {JSON.stringify(report, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
