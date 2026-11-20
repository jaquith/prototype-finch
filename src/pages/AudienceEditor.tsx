import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/SimpleButton";
import EnrichmentConditions, { conditionProblem, type EnrichmentCondition } from "../components/EnrichmentConditions";
import { MOCK_ATTRIBUTES } from "../data/attributes";
import { deleteAudience, findAudience, isAudienceNameTaken, saveAudience } from "../data/audiences";
import "./Operators.css";
import "./Audiences.css";

const ATTRIBUTE_OPTIONS = MOCK_ATTRIBUTES.map((a) => ({ name: a.name, type: a.type }));

const emptyCondition = (): EnrichmentCondition => ({ attribute: "", operator: "equals", values: [""] });

interface Draft {
  id?: string;
  name: string;
  description: string;
  conditionGroups: EnrichmentCondition[][];
}

export default function AudienceEditor() {
  const { id = "new" } = useParams();
  const navigate = useNavigate();
  const isNewRoute = id === "new";
  const source = isNewRoute ? undefined : findAudience(id);

  const [draft, setDraft] = useState<Draft>(() =>
    source
      ? structuredClone({ id: source.id, name: source.name, description: source.description, conditionGroups: source.conditionGroups })
      : { name: "", description: "", conditionGroups: [[emptyCondition()]] },
  );
  const [showErrors, setShowErrors] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!isNewRoute && !source && !draft.id) {
    return (
      <div className="aud-editor">
        <h1 className="aud-editor-title">Audience not found</h1>
        <button type="button" className="op-link" onClick={() => navigate("/audiences")}>
          <i className="fas fa-arrow-left" aria-hidden="true" /> Back to Audiences
        </button>
      </div>
    );
  }

  const name = draft.name.trim();
  const nameError = !name
    ? "Enter a name."
    : isAudienceNameTaken(name, draft.id)
      ? "Another audience already uses this name."
      : null;
  const allConditions = draft.conditionGroups.flat();
  const conditionsError = allConditions.length === 0 ? "Add at least one condition." : null;
  const hasConditionProblems = allConditions.some((c) => conditionProblem(c, ATTRIBUTE_OPTIONS) !== null);

  const change = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSavedAt(null);
  };

  const setGroup = (index: number, conditions: EnrichmentCondition[]) => {
    const groups = draft.conditionGroups.map((g, i) => (i === index ? conditions : g));
    change({ conditionGroups: groups.length > 1 ? groups.filter((g) => g.length > 0) : groups });
  };

  const save = () => {
    setShowErrors(true);
    if (nameError || conditionsError || hasConditionProblems) return;
    const saved = saveAudience({ ...draft, name });
    setDraft((d) => ({ ...d, id: saved.id, name }));
    setShowErrors(false);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    if (isNewRoute) navigate(`/audiences/${saved.id}`, { replace: true });
  };

  const remove = () => {
    if (draft.id) deleteAudience(draft.id);
    navigate("/audiences");
  };

  return (
    <div className="aud-editor">
      <div className="op-editor-topbar">
        <button type="button" className="op-back" onClick={() => navigate("/audiences")}>
          <i className="fas fa-arrow-left" aria-hidden="true" /> Audiences
        </button>
        <div className="op-editor-actions">
          {savedAt && <span className="op-saved">Saved at {savedAt}</span>}
          <Button type="primary" onClick={save}>
            {draft.id ? "Save" : "Create audience"}
          </Button>
        </div>
      </div>

      <h1 className="aud-editor-title">{draft.id ? draft.name || "Untitled audience" : "New audience"}</h1>

      <section className="aud-card" aria-labelledby="aud-details-title">
        <h2 id="aud-details-title" className="aud-card-title">Details</h2>
        <label className="op-field">
          <span>Name</span>
          <input
            value={draft.name}
            aria-invalid={showErrors && !!nameError}
            aria-describedby={showErrors && nameError ? "aud-name-err" : undefined}
            onChange={(e) => change({ name: e.target.value })}
          />
          {showErrors && nameError && (
            <span id="aud-name-err" className="op-error-text">{nameError}</span>
          )}
        </label>
        <label className="op-field">
          <span>
            Description <span className="op-muted">(optional)</span>
          </span>
          <textarea rows={2} value={draft.description} onChange={(e) => change({ description: e.target.value })} />
        </label>
      </section>

      <section className="aud-card" aria-labelledby="aud-conds-title">
        <h2 id="aud-conds-title" className="aud-card-title">Conditions</h2>
        <p className="aud-card-help">
          A visitor joins this audience when they match every condition in at least one group.
        </p>
        {draft.conditionGroups.map((group, gi) => (
          <div key={gi} className="aud-group-wrap">
            {gi > 0 && <div className="aud-or">OR</div>}
            <div className="aud-group" role="group" aria-label={`Condition group ${gi + 1}`}>
              <EnrichmentConditions
                variant="audience"
                editing
                showErrors={showErrors}
                conditions={group}
                attributes={ATTRIBUTE_OPTIONS}
                onChange={(next) => setGroup(gi, next)}
              />
            </div>
          </div>
        ))}
        {showErrors && conditionsError && <p className="op-error-text">{conditionsError}</p>}
        <div className="aud-group-actions">
          <button
            type="button"
            className="op-add-btn"
            onClick={() => change({ conditionGroups: [...draft.conditionGroups, [emptyCondition()]] })}
          >
            <i className="fas fa-plus" aria-hidden="true" /> Add OR group
          </button>
        </div>
      </section>

      {draft.id && (
        <div className="aud-danger">
          {confirmingDelete ? (
            <>
              <span>Delete this audience? This can&apos;t be undone.</span>
              <Button type="destructive" onClick={remove}>Delete</Button>
              <Button type="secondary" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
            </>
          ) : (
            <Button type="secondary" onClick={() => setConfirmingDelete(true)}>
              <i className="fas fa-trash" aria-hidden="true" /> Delete audience
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
