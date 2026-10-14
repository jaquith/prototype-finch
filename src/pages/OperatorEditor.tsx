import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/SimpleButton";
import OperatorCodeField from "../components/OperatorCodeField";
import {
  MOCK_OPERATORS,
  OPERATOR_USAGE,
  SUBJECT_TYPES,
  createBlankOperator,
  type OperandType,
  type OperatorDef,
  type OperatorTest,
  type SubjectType,
} from "../data/operators";
import { evaluateOperator, parseOperand, parseSubject, type EvaluationResult } from "../utils/operatorRuntime";
import "./Operators.css";

const OPERAND_TYPES: { value: OperandType; label: string }[] = [
  { value: "none", label: "None (unary)" },
  { value: "String", label: "String" },
  { value: "Number", label: "Number" },
  { value: "List of Strings", label: "List of Strings (comma-separated)" },
];

function ResultPill({ result }: { result: EvaluationResult | null }) {
  if (!result) return <span className="op-result op-result-idle">Not run</span>;
  if (!result.ok) {
    return (
      <span className="op-result op-result-error" title={result.error}>
        <i className="fas fa-exclamation-triangle" aria-hidden="true" /> Error
      </span>
    );
  }
  return <span className={`op-result ${result.value ? "op-result-true" : "op-result-false"}`}>{result.value ? "TRUE" : "FALSE"}</span>;
}

export default function OperatorEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === "new";
  const source = isNew ? undefined : MOCK_OPERATORS.find((o) => o.id === id);

  const [draft, setDraft] = useState<OperatorDef>(() => structuredClone(source ?? createBlankOperator()));
  const [trySubject, setTrySubject] = useState(draft.tests[0]?.subject ?? "");
  const [tryOperand, setTryOperand] = useState(draft.tests[0]?.operand ?? "");
  const [tryResult, setTryResult] = useState<EvaluationResult | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const usage = OPERATOR_USAGE[draft.id] ?? [];
  const subjectType: SubjectType = draft.subjectTypes[0] ?? "String";
  const takesOperand = draft.operandType !== "none";

  const testResults = useMemo(
    () =>
      draft.tests.map((t) => evaluateOperator(draft.code, parseSubject(t.subject, subjectType), parseOperand(t.operand, draft.operandType))),
    [draft.code, draft.tests, draft.operandType, subjectType],
  );
  const passing = testResults.filter((r, i) => r.ok && r.value === draft.tests[i].expected).length;

  if (!isNew && !source) {
    return (
      <div className="op-editor">
        <p>Operator not found.</p>
        <Button onClick={() => navigate("/operators")}>Back to operators</Button>
      </div>
    );
  }

  const update = <K extends keyof OperatorDef>(key: K, value: OperatorDef[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSavedAt(null);
  };

  const toggleSubjectType = (t: SubjectType) => {
    const has = draft.subjectTypes.includes(t);
    if (has && draft.subjectTypes.length === 1) return;
    update("subjectTypes", has ? draft.subjectTypes.filter((x) => x !== t) : [...draft.subjectTypes, t]);
  };

  const updateTest = (testId: string, patch: Partial<OperatorTest>) =>
    update("tests", draft.tests.map((t) => (t.id === testId ? { ...t, ...patch } : t)));

  const addTest = () =>
    update("tests", [...draft.tests, { id: `t${Date.now()}`, name: "new test", subject: "", operand: "", expected: true }]);

  const runTry = () =>
    setTryResult(evaluateOperator(draft.code, parseSubject(trySubject, subjectType), parseOperand(tryOperand, draft.operandType)));

  const canSave = draft.label.trim() !== "" && /^[A-Za-z_$][\w$]*$/.test(draft.identifier);

  const save = () => {
    if (!canSave) return;
    const stamped = { ...draft, lastModified: new Date().toISOString().slice(0, 10) };
    if (isNew) {
      const created = { ...stamped, id: `op${Date.now()}` };
      MOCK_OPERATORS.push(created);
      navigate(`/operators/${created.id}`, { replace: true });
      return;
    }
    Object.assign(source!, stamped);
    setDraft(stamped);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  };

  return (
    <div className="op-editor">
      <div className="op-editor-topbar">
        <button type="button" className="op-back" onClick={() => navigate("/operators")}>
          <i className="fas fa-arrow-left" aria-hidden="true" /> Custom Operators
        </button>
        <div className="op-editor-actions">
          {savedAt && <span className="op-saved">Saved at {savedAt}</span>}
          <label className="op-enabled-toggle">
            <button
              type="button"
              role="switch"
              aria-checked={draft.enabled}
              className={`op-switch ${draft.enabled ? "op-switch-on" : ""}`}
              onClick={() => update("enabled", !draft.enabled)}
            >
              <span className="op-switch-knob" />
            </button>
            {draft.enabled ? "Available in conditions" : "Disabled"}
          </label>
          <Button type="primary" onClick={save} attrProps={{ disabled: !canSave }}>
            {isNew ? "Create Operator" : "Save"}
          </Button>
        </div>
      </div>

      <h1 className="op-editor-title">
        <span className="op-fx op-fx-lg" aria-hidden="true">ƒ</span>
        {draft.label || "New operator"}
      </h1>

      <section className="op-preview" aria-label="How this operator reads in a condition">
        <span className="op-preview-label">In an enrichment condition</span>
        <div className="op-preview-sentence">
          <span className="op-preview-when">WHEN</span>
          <span className="op-preview-attr">{draft.subjectTypes.join(" / ")} attribute</span>
          <span className="op-preview-op">
            <span aria-hidden="true">ƒ</span> {draft.label || "operator"}
          </span>
          {takesOperand && <span className="op-preview-operand">{draft.operandLabel || "value"}</span>}
          <span className="op-preview-arrow" aria-hidden="true">→</span>
          <span className="op-result op-result-true">TRUE</span>
          <span className="op-muted">or</span>
          <span className="op-result op-result-false">FALSE</span>
        </div>
      </section>

      <div className="op-editor-grid">
        <div className="op-editor-main">
          <section className="op-card">
            <h2 className="op-card-title">Definition</h2>
            <div className="op-field-row">
              <label className="op-field">
                <span>Label in condition builder</span>
                <input value={draft.label} placeholder="e.g. is valid email" onChange={(e) => update("label", e.target.value)} />
              </label>
              <label className="op-field">
                <span>Function identifier</span>
                <input
                  className="op-mono"
                  value={draft.identifier}
                  placeholder="isValidEmail"
                  onChange={(e) => update("identifier", e.target.value)}
                  aria-invalid={draft.identifier !== "" && !/^[A-Za-z_$][\w$]*$/.test(draft.identifier)}
                />
              </label>
            </div>
            <label className="op-field">
              <span>Description</span>
              <textarea rows={2} value={draft.description} onChange={(e) => update("description", e.target.value)} />
            </label>
            <fieldset className="op-field">
              <legend>Applies to attribute types</legend>
              <div className="op-chip-row">
                {SUBJECT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={draft.subjectTypes.includes(t)}
                    className={`op-chip op-chip-toggle ${draft.subjectTypes.includes(t) ? "op-chip-on" : ""}`}
                    onClick={() => toggleSubjectType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="op-field-row">
              <label className="op-field">
                <span>Operand</span>
                <select value={draft.operandType} onChange={(e) => update("operandType", e.target.value as OperandType)}>
                  {OPERAND_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              {takesOperand && (
                <label className="op-field">
                  <span>Operand label</span>
                  <input value={draft.operandLabel ?? ""} placeholder="e.g. Days" onChange={(e) => update("operandLabel", e.target.value)} />
                </label>
              )}
            </div>
          </section>

          <section className="op-card">
            <h2 className="op-card-title">Function</h2>
            <p className="op-help">
              Return a boolean. <code>subject</code> is the attribute value
              {takesOperand ? <> and <code>operand</code> is the {draft.operandType.toLowerCase()} configured in the condition</> : null}.
              If the function throws or returns anything other than <code>true</code>/<code>false</code>, the condition evaluates to{" "}
              <strong>FALSE</strong> at runtime.
            </p>
            <OperatorCodeField value={draft.code} onChange={(c) => update("code", c)} />
          </section>

          <section className="op-card">
            <div className="op-card-header">
              <h2 className="op-card-title">Tests</h2>
              {draft.tests.length > 0 && (
                <span className={passing === draft.tests.length ? "op-pass" : "op-fail"}>
                  {passing}/{draft.tests.length} passing
                </span>
              )}
            </div>
            {draft.tests.length === 0 ? (
              <p className="op-help">Add test cases with an expected TRUE or FALSE result. They re-run whenever you edit the function.</p>
            ) : (
              <table className="op-tests">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Subject ({subjectType})</th>
                    {takesOperand && <th>Operand</th>}
                    <th>Expect</th>
                    <th>Actual</th>
                    <th><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {draft.tests.map((t, i) => {
                    const r = testResults[i];
                    const pass = r.ok && r.value === t.expected;
                    return (
                      <tr key={t.id} className={pass ? "" : "op-test-failing"}>
                        <td><input aria-label="Test name" value={t.name} onChange={(e) => updateTest(t.id, { name: e.target.value })} /></td>
                        <td><input aria-label="Subject" className="op-mono" value={t.subject} onChange={(e) => updateTest(t.id, { subject: e.target.value })} /></td>
                        {takesOperand && (
                          <td><input aria-label="Operand" className="op-mono" value={t.operand} onChange={(e) => updateTest(t.id, { operand: e.target.value })} /></td>
                        )}
                        <td>
                          <button
                            type="button"
                            className={`op-result op-result-btn ${t.expected ? "op-result-true" : "op-result-false"}`}
                            onClick={() => updateTest(t.id, { expected: !t.expected })}
                            aria-label={`Expected ${t.expected ? "TRUE" : "FALSE"}, click to flip`}
                          >
                            {t.expected ? "TRUE" : "FALSE"}
                          </button>
                        </td>
                        <td>
                          <span className="op-test-actual">
                            <i className={`fas ${pass ? "fa-check-circle op-pass" : "fa-times-circle op-fail"}`} aria-hidden="true" />
                            <ResultPill result={r} />
                          </span>
                        </td>
                        <td>
                          <button type="button" className="op-icon-btn" aria-label="Remove test" onClick={() => update("tests", draft.tests.filter((x) => x.id !== t.id))}>
                            <i className="fas fa-times" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {testResults.some((r) => !r.ok) && (
              <p className="op-error-text">
                {(testResults.find((r) => !r.ok) as Extract<EvaluationResult, { ok: false }>).error}
              </p>
            )}
            <button type="button" className="op-add-btn" onClick={addTest}>
              <i className="fas fa-plus" aria-hidden="true" /> Add test
            </button>
          </section>
        </div>

        <aside className="op-editor-side">
          <section className="op-card">
            <h2 className="op-card-title">Try it</h2>
            <label className="op-field">
              <span>Subject ({subjectType})</span>
              <input className="op-mono" value={trySubject} onChange={(e) => setTrySubject(e.target.value)} />
            </label>
            {takesOperand && (
              <label className="op-field">
                <span>{draft.operandLabel || "Operand"}</span>
                <input className="op-mono" value={tryOperand} onChange={(e) => setTryOperand(e.target.value)} />
              </label>
            )}
            <Button onClick={runTry}>
              <i className="fas fa-play" aria-hidden="true" /> Evaluate
            </Button>
            {tryResult && (
              <div className="op-try-result" aria-live="polite">
                <ResultPill result={tryResult} />
                <span className="op-muted">{tryResult.durationMs.toFixed(2)} ms</span>
                {!tryResult.ok && <p className="op-error-text">{tryResult.error}</p>}
              </div>
            )}
          </section>

          <section className="op-card">
            <h2 className="op-card-title">Used by</h2>
            {usage.length === 0 ? (
              <p className="op-help">Not used in any enrichment conditions yet.</p>
            ) : (
              <ul className="op-usage">
                {usage.map((u) => (
                  <li key={u.enrichment}>
                    <i className="fas fa-magic" aria-hidden="true" />
                    <div>
                      <div className="op-usage-name">{u.enrichment}</div>
                      <button type="button" className="op-link" onClick={() => navigate(`/attributes?attr=${u.attributeId}`)}>
                        {u.attribute}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
