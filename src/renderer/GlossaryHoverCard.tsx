import type {
  GlossaryHoverCardCandidateContent,
  GlossaryHoverCardContent
} from "./glossaryHoverCardContent";

interface GlossaryHoverCardProps {
  content: GlossaryHoverCardContent;
}

interface GlossaryHoverCardCandidateProps {
  candidate: GlossaryHoverCardCandidateContent;
  isListItem?: boolean;
}

function GlossaryHoverCardMetaRow({
  label,
  value
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="glossaryHoverCardMetaRow">
      <span className="glossaryHoverCardMetaLabel">{label}</span>
      <span className="glossaryHoverCardMetaValue">{value}</span>
    </div>
  );
}

function GlossaryHoverCardCandidate({
  candidate,
  isListItem = false
}: GlossaryHoverCardCandidateProps): JSX.Element {
  const Wrapper = isListItem ? "li" : "div";

  return (
    <Wrapper
      className="glossaryHoverCardCandidate"
      data-missing-entry={candidate.isMissingEntry ? "true" : undefined}
    >
      <div className="glossaryHoverCardCandidateTitle">
        {candidate.canonicalSurface}
      </div>
      <div className="glossaryHoverCardMeta">
        <GlossaryHoverCardMetaRow
          label="matched"
          value={candidate.matchedSurface}
        />
        <GlossaryHoverCardMetaRow
          label="relation"
          value={candidate.relation}
        />
        {candidate.warningPolicy ? (
          <GlossaryHoverCardMetaRow
            label="warning"
            value={candidate.warningPolicy}
          />
        ) : null}
        <GlossaryHoverCardMetaRow
          label="kind"
          value={candidate.kind ?? "unknown"}
        />
      </div>
      {candidate.descriptionPreview ? (
        <p className="glossaryHoverCardDescription">
          {candidate.descriptionPreview}
        </p>
      ) : null}
    </Wrapper>
  );
}

export function GlossaryHoverCard({
  content
}: GlossaryHoverCardProps): JSX.Element {
  const [firstCandidate] = content.candidates;

  return (
    <aside className="glossaryHoverCard" role="tooltip">
      {content.isAmbiguous ? (
        <>
          <div className="glossaryHoverCardTitle">
            {content.matchedSurface}
          </div>
          <div className="glossaryHoverCardCount">
            {content.candidates.length} candidates
          </div>
          <ul className="glossaryHoverCardCandidates">
            {content.candidates.map((candidate) => (
              <GlossaryHoverCardCandidate
                key={`${candidate.entryId}:${candidate.formId}`}
                candidate={candidate}
                isListItem={true}
              />
            ))}
          </ul>
        </>
      ) : firstCandidate ? (
        <GlossaryHoverCardCandidate candidate={firstCandidate} />
      ) : (
        <div className="glossaryHoverCardTitle">
          {content.matchedSurface}
        </div>
      )}
    </aside>
  );
}
