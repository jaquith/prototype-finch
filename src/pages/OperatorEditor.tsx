import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/SimpleButton";
import OperatorCodeField from "../components/OperatorCodeField";
import OperatorSentence from "../components/OperatorSentence";
import OperatorActivationSwitch from "../components/OperatorActivationSwitch";
import {
  IDENTIFIER_PATTERN,
  MOCK_OPERATORS,
  OPERAND_TYPES,
  OPERATOR_USAGE,
  SUBJECT_TYPES,
  createBlankOperator,
  negatedOperatorLabel,
  plainLabel,
  type OperandDef,
  type OperandType,
  type OperatorDef,
  type OperatorTest,
  type SubjectType,
  type TestValueType,
} from "../data/operators";
import { evaluateCase, operandNameErrors, type EvaluationResult } from "../utils/operatorRuntime";
import "./Operators.css";

const TEST_VALUE_TYPES: TestValueType[] = [...SUBJECT_TYPES, "Null"];

const PLACEHOLDERS: Record<OperandType | TestValueType, string> = {
  String: "text",
  Number: "42",
  Boolean: "true",
  Date: "2026-03-05",
  "Set of Strings": "a, b, c",
  "List of Strings": "a, b, c",
  Null: "",
};

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

function SubjectTypeSelect({ value, allowed, onChange, label }: { value: TestValueType; allowed: SubjectType[]; onChange: (t: TestValueType) => void; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as TestValueType)}>
      {TEST_VALUE_TYPES.filter((t) => t === "Null" || allowed.includes(t as SubjectType) || t === value).map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

export default function OperatorEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === "new";
  const source = isNew ? undefined : MOCK_OPERATORS.find((o) => o.id === id);

  const [draft, setDraft] = useState<OperatorDef>(() => structuredClone(source ?? createBlankOperator()));
  const [tryType, setTryType] = useState<TestValueType>(draft.tests[0]?.subjectType ?? draft.subjectTypes[0] ?? "String");
  const [trySubject, setTrySubject] = useState(draft.tests[0]?.subject ?? "");
  const [tryOperands, setTryOperands] = useState<string[]>(draft.tests[0]?.operands ?? []);
  const [tryResult, setTryResult] = useState<EvaluationResult | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const usage = OPERATOR_USAGE[draft.id] ?? [];
  const nameErrors = operandNameErrors(draft.operands);
  const operandsValid = nameErrors.every((e) => e === null);
  const params = draft.operands.map((o) => o.name);

  const testResults = useMemo(
    () => draft.tests.map((t) => evaluateCase(draft.code, draft.operands, t.subject, t.subjectType, t.operands)),
    [draft.code, draft.tests, draft.operands],
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

  // Operand edits keep each test's positional inputs aligned with the operand list.
  const updateOperand = (index: number, patch: Partial<OperandDef>) =>
    update("operands", draft.operands.map((o, i) => (i === index ? { ...o, ...patch } : o)));

  const addOperand = () => {
    const taken = new Set(params);
    let n = draft.operands.length + 1;
    while (taken.has(`arg${n}`)) n++;
    setDraft((d) => ({
      ...d,
      operands: [...d.operands, { name: `arg${n}`, label: "", type: "String" }],
      tests: d.tests.map((t) => ({ ...t, operands: [...t.operands, ""] })),
    }));
    setTryOperands((v) => [...v, ""]);
    setSavedAt(null);
  };

  const removeOperand = (index: number) => {
    setDraft((d) => ({
      ...d,
      operands: d.operands.filter((_, i) => i !== index),
      tests: d.tests.map((t) => ({ ...t, operands: t.operands.filter((_, i) => i !== index) })),
    }));
    setTryOperands((v) => v.filter((_, i) => i !== index));
    setSavedAt(null);
  };

  const updateTest = (testId: string, patch: Partial<OperatorTest>) =>
    update("tests", draft.tests.map((t) => (t.id === testId ? { ...t, ...patch } : t)));

  const updateTestOperand = (t: OperatorTest, index: number, raw: string) =>
    updateTest(t.id, { operands: draft.operands.map((_, i) => (i === index ? raw : t.operands[i] ?? "")) });

  const addTest = () =>
    update("tests", [
      ...draft.tests,
      {
        id: `t${Date.now()}`,
        name: "new test",
        subjectType: draft.subjectTypes[0] ?? "String",
        subject: "",
        operands: draft.operands.map(() => ""),
        expected: true,
      },
    ]);

  const runTry = () => setTryResult(evaluateCase(draft.code, draft.operands, trySubject, tryType, tryOperands));

  const canSave = draft.label.trim() !== "" && IDENTIFIER_PATTERN.test(draft.identifier) && operandsValid;

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

  const attrLabel = `${draft.subjectTypes.join(" / ")} attribute`;

  return (
    <div className="op-editor">
      <div className="op-editor-topbar">
        <button type="button" className="op-back" onClick={() => navigate("/operators")}>
          <i className="fas fa-arrow-left" aria-hidden="true" /> Custom Operators
        </button>
        <div className="op-editor-actions">
          {savedAt && <span className="op-saved">Saved at {savedAt}</span>}
          <OperatorActivationSwitch
            verbose
            enabled={draft.enabled}
            dependencies={usage}
            operatorName={draft.label ? plainLabel(draft.label, draft.operands) : "operator"}
            onChange={(next) => update("enabled", next)}
          />
          <Button type="primary" onClick={save} attrProps={{ disabled: !canSave }}>
            {isNew ? "Create Operator" : "Save"}
          </Button>
        </div>
      </div>

      <h1 className="op-editor-title">
        <span className="op-fx op-fx-lg" aria-hidden="true">ƒ</span>
        {draft.label ? <OperatorSentence template={draft.label} operands={draft.operands} slotClassName="op-title-slot" /> : "New operator"}
      </h1>

      <section className="op-preview" aria-label="How this operator reads in a condition">
        <span className="op-preview-label">In an enrichment condition</span>
        <div className="op-preview-sentence">
          <span className="op-preview-when">WHEN</span>
          <span className="op-preview-attr">{attrLabel}</span>
          <span className="op-preview-op">
            <span aria-hidden="true">ƒ</span>
            <OperatorSentence template={draft.label || "operator"} operands={draft.operands} slotClassName="op-preview-operand" />
          </span>
          <span className="op-preview-arrow" aria-hidden="true">→</span>
          <span className="op-result op-result-true">TRUE</span>
          <span className="op-muted">or</span>
          <span className="op-result op-result-false">FALSE</span>
        </div>
        <div className="op-preview-sentence op-preview-negated">
          <span className="op-preview-when">WHEN</span>
          <span className="op-preview-attr">{attrLabel}</span>
          <span className="op-preview-op op-preview-op-negated">
            <span className="op-not-badge">NOT</span>
            <span className="op-muted">reads as</span>
            <OperatorSentence template={negatedOperatorLabel(draft)} operands={draft.operands} slotClassName="op-preview-operand" />
          </span>
          <span className="op-preview-arrow" aria-hidden="true">→</span>
          <span className="op-muted">inverse result, generated automatically</span>
        </div>
      </section>

      <div className="op-editor-grid">
        <div className="op-editor-main">
          <section className="op-card">
            <h2 className="op-card-title">Definition</h2>
            <div className="op-field-row">
              <label className="op-field">
                <span>Label in condition builder</span>
                <input value={draft.label} placeholder="e.g. is within {days} days of {other}" onChange={(e) => update("label", e.target.value)} />
              </label>
              <label className="op-field">
                <span>Function identifier</span>
                <input
                  className="op-mono"
                  value={draft.identifier}
                  placeholder="isWithinDaysOf"
                  onChange={(e) => update("identifier", e.target.value)}
                  aria-invalid={draft.identifier !== "" && !IDENTIFIER_PATTERN.test(draft.identifier)}
                />
              </label>
            </div>
            <label className="op-field">
              <span>Negated label (optional)</span>
              <input
                value={draft.negatedLabel ?? ""}
                placeholder={`NOT ${draft.label || "operator"}`}
                onChange={(e) => update("negatedLabel", e.target.value)}
              />
            </label>
            <p className="op-help">
              Reference operands with <code>{"{name}"}</code> to place them inside the sentence. Any condition can flip this
              operator with a NOT toggle, so there&apos;s no need to write an inverse copy.
            </p>
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

            <fieldset className="op-field">
              <legend>Operands</legend>
              {draft.operands.length === 0 ? (
                <p className="op-help">None. This operator only looks at the attribute value.</p>
              ) : (
                <div className="op-operands">
                  <div className="op-operand-row op-operand-head" aria-hidden="true">
                    <span>Parameter</span>
                    <span>Label</span>
                    <span>Type</span>
                    <span />
                  </div>
                  {draft.operands.map((o, i) => (
                    <div key={i} className="op-operand-row">
                      <div className="op-operand-name">
                        <input
                          className="op-mono"
                          aria-label={`Operand ${i + 1} parameter name`}
                          value={o.name}
                          aria-invalid={nameErrors[i] !== null}
                          onChange={(e) => updateOperand(i, { name: e.target.value })}
                        />
                        {nameErrors[i] && <span className="op-error-text">{nameErrors[i]}</span>}
                      </div>
                      <input
                        aria-label={`Operand ${i + 1} label`}
                        value={o.label}
                        placeholder="e.g. Days"
                        onChange={(e) => updateOperand(i, { label: e.target.value })}
                      />
                      <select
                        aria-label={`Operand ${i + 1} type`}
                        value={o.type}
                        onChange={(e) => updateOperand(i, { type: e.target.value as OperandType })}
                      >
                        {OPERAND_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <button type="button" className="op-icon-btn" aria-label={`Remove operand ${o.name}`} onClick={() => removeOperand(i)}>
                        <i className="fas fa-times" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="op-help">
                The declared type is enforced when a condition maps a value to an operand, and the value is converted before your
                function runs.
              </p>
              <button type="button" className="op-add-btn" onClick={addOperand}>
                <i className="fas fa-plus" aria-hidden="true" /> Add operand
              </button>
            </fieldset>
          </section>

          <section className="op-card">
            <h2 className="op-card-title">Function</h2>
            <p className="op-help">
              Return a boolean. Every argument arrives already converted to its declared type: <code>Date</code> values are{" "}
              <code>Date</code> objects, lists are arrays, numbers are numbers. The platform checks types when it maps and runs the
              operator, so you don&apos;t need <code>typeof</code> or <code>instanceof</code> guards. Just write the comparison. A
              missing attribute arrives as <code>null</code>. If the function throws or returns anything other than <code>true</code>/<code>false</code>, the condition
              evaluates to <strong>FALSE</strong>, whether or not it&apos;s negated.
            </p>
            <OperatorCodeField value={draft.code} onChange={(c) => update("code", c)} identifier={draft.identifier} params={params} />
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
              <div className="op-tests-scroll">
                <table className="op-tests">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Subject type</th>
                      <th>Subject</th>
                      {draft.operands.map((o, i) => (
                        <th key={i}>
                          {o.label || o.name} <span className="op-th-type">{o.type}</span>
                        </th>
                      ))}
                      <th>Expect</th>
                      <th>Actual</th>
                      <th><span className="sr-only">Remove</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.tests.map((t, i) => {
                      const r = testResults[i];
                      const pass = r.ok && r.value === t.expected;
                      const isNull = t.subjectType === "Null";
                      return (
                        <tr key={t.id} className={pass ? "" : "op-test-failing"}>
                          <td><input aria-label="Test name" value={t.name} onChange={(e) => updateTest(t.id, { name: e.target.value })} /></td>
                          <td>
                            <SubjectTypeSelect
                              label="Subject type"
                              value={t.subjectType}
                              allowed={draft.subjectTypes}
                              onChange={(subjectType) => updateTest(t.id, { subjectType })}
                            />
                          </td>
                          <td>
                            <input
                              aria-label="Subject"
                              className="op-mono"
                              value={isNull ? "" : t.subject}
                              disabled={isNull}
                              placeholder={isNull ? "null" : PLACEHOLDERS[t.subjectType]}
                              onChange={(e) => updateTest(t.id, { subject: e.target.value })}
                            />
                          </td>
                          {draft.operands.map((o, oi) => (
                            <td key={oi}>
                              <input
                                aria-label={o.label || o.name}
                                className="op-mono"
                                value={t.operands[oi] ?? ""}
                                placeholder={PLACEHOLDERS[o.type]}
                                onChange={(e) => updateTestOperand(t, oi, e.target.value)}
                              />
                            </td>
                          ))}
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
              </div>
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
              <span>Subject type</span>
              <SubjectTypeSelect label="Subject type" value={tryType} allowed={draft.subjectTypes} onChange={setTryType} />
            </label>
            <label className="op-field">
              <span>Subject</span>
              <input
                className="op-mono"
                value={tryType === "Null" ? "" : trySubject}
                disabled={tryType === "Null"}
                placeholder={tryType === "Null" ? "null" : PLACEHOLDERS[tryType]}
                onChange={(e) => setTrySubject(e.target.value)}
              />
            </label>
            {draft.operands.map((o, i) => (
              <label key={i} className="op-field">
                <span>{o.label || o.name} ({o.type})</span>
                <input
                  className="op-mono"
                  value={tryOperands[i] ?? ""}
                  placeholder={PLACEHOLDERS[o.type]}
                  onChange={(e) => setTryOperands(draft.operands.map((_, j) => (j === i ? e.target.value : tryOperands[j] ?? "")))}
                />
              </label>
            ))}
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
