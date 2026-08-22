import type { RecentProject } from "../shared/api";
import type { Translate } from "../shared/i18n";

interface WelcomeScreenProps {
  recentProjects: RecentProject[];
  translate: Translate;
  onCreateProject: () => void;
  onOpenProject: () => void;
  onOpenRecentProject: (projectFilePath: string) => void;
}

export function WelcomeScreen({
  recentProjects,
  translate,
  onCreateProject,
  onOpenProject,
  onOpenRecentProject
}: WelcomeScreenProps): JSX.Element {
  return (
    <section className="welcomeScreen" aria-label={translate("welcome.title")}>
      <div className="welcomeContent">
        <section className="welcomePrimary" aria-label={translate("welcome.start")}>
          <div>
            <h1>{translate("welcome.title")}</h1>
            <p>{translate("welcome.description")}</p>
          </div>
          <div className="welcomeProjectActions">
            <button
              type="button"
              className="welcomeCreateProject"
              onClick={onCreateProject}
            >
              {translate("welcome.createProject")}
            </button>
            <button
              type="button"
              className="welcomeOpenProject"
              onClick={onOpenProject}
            >
              {translate("welcome.openProject")}
            </button>
          </div>
        </section>

        <section className="welcomeRecent" aria-label={translate("welcome.recentProjects")}>
          <h2>{translate("welcome.recentProjects")}</h2>
          {recentProjects.length === 0 ? (
            <div className="welcomeRecentEmpty">{translate("recent.empty")}</div>
          ) : (
            <nav className="welcomeRecentList" aria-label={translate("welcome.recentProjects")}>
              {recentProjects.map((recentProject) => (
                <button
                  key={recentProject.projectId}
                  type="button"
                  className="welcomeRecentItem"
                  title={recentProject.projectFilePath}
                  onClick={() =>
                    onOpenRecentProject(recentProject.projectFilePath)
                  }
                >
                  <span className="welcomeRecentName">
                    {recentProject.projectName}
                  </span>
                  <span className="welcomeRecentPath">
                    {recentProject.projectFilePath}
                  </span>
                </button>
              ))}
            </nav>
          )}
        </section>
      </div>
    </section>
  );
}
