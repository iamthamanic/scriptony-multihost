/**
 * Project renders overview with review actions (T88).
 * Location: src/components/projects/ProjectRendersSection.tsx
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { listProjectRenderJobs } from "@/lib/api/stage-project-renders";
import { acceptRenderJob, rejectRenderJob } from "@/lib/api/stage-api";
import { queryKeys } from "@/lib/react-query";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import type { RenderJobStatus, ReviewStatus } from "@/lib/types";
import { toast } from "sonner";

const STATUS_LABELS: Record<RenderJobStatus, string> = {
  queued: "Wartend",
  executing: "Läuft",
  completed: "Fertig",
  failed: "Fehlgeschlagen",
};

const REVIEW_LABELS: Record<ReviewStatus, string> = {
  pending: "Offen",
  accepted: "Akzeptiert",
  rejected: "Abgelehnt",
};

interface ProjectRendersSectionProps {
  projectId: string;
}

export function ProjectRendersSection({
  projectId,
}: ProjectRendersSectionProps) {
  const queryClient = useQueryClient();
  const queryKey = [...queryKeys.renderJobs.byShot(projectId), "project-all"];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => listProjectRenderJobs(projectId),
    enabled: Boolean(projectId),
    staleTime: 20_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const handleReview = async (jobId: string, action: "accept" | "reject") => {
    try {
      if (action === "accept") {
        await acceptRenderJob(jobId);
        toast.success("Render akzeptiert");
      } else {
        await rejectRenderJob(jobId);
        toast.success("Render abgelehnt");
      }
      await invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Aktion fehlgeschlagen",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="size-4 animate-spin" />
        Render-Jobs werden geladen…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive py-4">
        Render-Jobs konnten nicht geladen werden.
      </p>
    );
  }

  const jobs = data ?? [];

  if (jobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Noch keine Render-Jobs in diesem Projekt. Erstelle Jobs im Puppet-Layer
        eines Shots (Struktur → Shot → Puppet-Layer).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {jobs.length} Render-Job(s) über alle Shots
      </p>
      <ul className="divide-y rounded-lg border">
        {jobs.map((job) => {
          const canReview =
            job.status === "completed" && job.reviewStatus === "pending";
          return (
            <li
              key={job.id}
              className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
            >
              <Badge variant="outline">{STATUS_LABELS[job.status]}</Badge>
              <Badge variant="secondary">
                {REVIEW_LABELS[job.reviewStatus]}
              </Badge>
              <span className="text-muted-foreground truncate">
                {job.shotLabel ?? job.shotId}
              </span>
              <span className="text-xs text-muted-foreground">
                {job.type} / {job.jobClass}
              </span>
              {canReview && (
                <span className="ml-auto flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => void handleReview(job.id, "accept")}
                  >
                    <CheckCircle2 className="size-3.5 mr-1" />
                    Akzeptieren
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => void handleReview(job.id, "reject")}
                  >
                    <XCircle className="size-3.5 mr-1" />
                    Ablehnen
                  </Button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
