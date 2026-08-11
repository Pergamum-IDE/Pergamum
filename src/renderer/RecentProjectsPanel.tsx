import type { RecentProject } from "../shared/api";
import type { Translate } from "../shared/i18n";

interface RecentProjectsPanelProps {
  recentProjects: RecentProject[];
  translate: Translate;
  onOpenProject: (path: string) => void;
}

export function RecentProjectsPanel({
  recentProjects,
  translate,
  onOpenProject
}: RecentProjectsPanelProps): JSX.Element {
  return (
    <section className="recentProjectsPanel" aria-label={translate("recent.title")}>
      <div className="recentProjectsHeader">{translate("recent.title")}</div>
      {recentProjects.length === 0 ? (
        <div className="recentProjectsEmpty">{translate("recent.empty")}</div>
      ) : (
        <nav className="recentProjectsList" aria-label={translate("recent.title")}>
          {recentProjects.map((recentProject) => (
            <button
              key={recentProject.path}
              type="button"
              className="recentProjectItem"
              title={recentProject.path}
              onClick={() => onOpenProject(recentProject.path)}
            >
              <span className="recentProjectName">{recentProject.name}</span>
              <span className="recentProjectPath">{recentProject.path}</span>
            </button>
          ))}
        </nav>
      )}
    </section>
  );
}
