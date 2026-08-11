import type { RecentProject } from "../shared/api";
import type { Translate } from "../shared/i18n";

interface WelcomeScreenProps {
  recentProjects: RecentProject[];
  translate: Translate;
  onOpenProject: () => void;
  onOpenRecentProject: (path: string) => void;
}

export function WelcomeScreen({
  recentProjects,
  translate,
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
          <button
            type="button"
            className="welcomeOpenProject"
            onClick={onOpenProject}
          >
            {translate("welcome.openProject")}
          </button>
        </section>

        <section className="welcomeRecent" aria-label={translate("welcome.recentProjects")}>
          <h2>{translate("welcome.recentProjects")}</h2>
          {recentProjects.length === 0 ? (
            <div className="welcomeRecentEmpty">{translate("recent.empty")}</div>
          ) : (
            <nav className="welcomeRecentList" aria-label={translate("welcome.recentProjects")}>
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
