import type { RecentProject } from "../shared/api";

interface WelcomeScreenProps {
  recentProjects: RecentProject[];
  onOpenProject: () => void;
  onOpenRecentProject: (path: string) => void;
}

export function WelcomeScreen({
  recentProjects,
  onOpenProject,
  onOpenRecentProject
}: WelcomeScreenProps): JSX.Element {
  return (
    <section className="welcomeScreen" aria-label="Welcome">
      <div className="welcomeContent">
        <section className="welcomePrimary" aria-label="Start">
          <div>
            <h1>Pergamum</h1>
            <p>Open a novel project to start writing.</p>
          </div>
          <button
            type="button"
            className="welcomeOpenProject"
            onClick={onOpenProject}
          >
            Open Project...
          </button>
        </section>

        <section className="welcomeRecent" aria-label="Recent projects">
          <h2>Recent Projects</h2>
          {recentProjects.length === 0 ? (
            <div className="welcomeRecentEmpty">No recent projects</div>
          ) : (
            <nav className="welcomeRecentList" aria-label="Recent projects">
              {recentProjects.map((recentProject) => (
                <button
                  key={recentProject.path}
                  type="button"
                  className="welcomeRecentItem"
                  title={recentProject.path}
                  onClick={() => onOpenRecentProject(recentProject.path)}
                >
                  <span className="welcomeRecentName">{recentProject.name}</span>
                  <span className="welcomeRecentPath">{recentProject.path}</span>
                </button>
              ))}
            </nav>
          )}
        </section>
      </div>
    </section>
  );
}
