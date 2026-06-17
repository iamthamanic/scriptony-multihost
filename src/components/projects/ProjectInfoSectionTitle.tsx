/** Card title for project info blocks: Lucide icon matches project type (film / series / book / audio). */
import { CardTitle } from "../ui/card";
import { getProjectTypeInfo } from "@/lib/projects/projects-page-utils";

export function ProjectInfoSectionTitle({
  projectType,
}: {
  projectType: string;
}) {
  const { Icon } = getProjectTypeInfo(projectType);
  return (
    <CardTitle className="text-base flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      Projekt-Informationen
    </CardTitle>
  );
}
