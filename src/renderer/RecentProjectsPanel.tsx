import type { RecentProject } from "../shared/api";

interface RecentProjectsPanelProps {
  recentProjects: RecentProject[];
  onOpenProject: (path: string) => void;
}

export function RecentProjectsPanel({
  recentProjects,
  onOpenProject
}: RecentProjectsPanelProps): JSX.Element {
  return (
    <section className="recentProjectsPanel" aria-label="Recent projects">
      <div className="recentProjectsHeader">Recent Projects</div>
      {recentProjects.length === 0 ? (
        <div className="recentProjectsEmpty">No recent projects</div>
      ) : (
        <nav className="recentProjectsList" aria-label="Recent projects">
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
