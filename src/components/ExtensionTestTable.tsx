import React, { useState } from "react";
import AutoGrowTextarea from "./AutoGrowTextarea";
import {
  formatExtensionValue,
  placeholderFor,
  type ExtensionParam,
  type ExtensionTest,
  type ExtensionTestResult,
  type TestVariable,
} from "../utils/extensionRuntime";

interface ExtensionTestTableProps {
  inputs: ExtensionParam[];
  outputs: ExtensionParam[];
  tests: ExtensionTest[];
  results: ExtensionTestResult[];
  onChange: (tests: ExtensionTest[]) => void;
  variables: TestVariable[];
  variableErrors: Map<string, string>;
  onVariablesChange: (variables: TestVariable[]) => void;
}

const isPassing = (r: ExtensionTestResult | undefined) => !!r && r.ok && r.pass;

function SummaryChips({ values, params }: { values: Record<string, string>; params: ExtensionParam[] }) {
  const set = params.filter((p) => (values[p.variableName] ?? "").trim() !== "");
  if (set.length === 0) return <span className="ext-chip ext-chip-empty">nothing set</span>;
  return (
    <>
      {set.map((p) => {
        const value = values[p.variableName].replace(/\s+/g, " ").trim();
        return (
          <span key={p.variableName} className="ext-chip" title={`${p.variableName} = ${value}`}>
            <span className="ext-chip-key">{p.variableName}</span>
            <span className="ext-chip-value">{value}</span>
          </span>
        );
      })}
    </>
  );
  }

function TestVariables({
  variables,
  errors,
  onChange,
}: {
  variables: TestVariable[];
  errors: Map<string, string>;
  onChange: (variables: TestVariable[]) => void;
}) {
  const update = (id: string, patch: Partial<TestVariable>) =>
    onChange(variables.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  return (
    <section className="ext-vars" aria-labelledby="ext-vars-title">
      <div className="ext-vars-header">
        <h4 id="ext-vars-title" className="ext-suite-title">Shared variables</h4>
        <p className="op-help">
          Define a value once and reference it in any test field as <code className="op-mono">{"{{name}}"}</code>. A variable can use the ones above it.
        </p>
      </div>
      {variables.length > 0 && (
        <ul className="ext-var-list">
          {variables.map((v) => {
            const error = errors.get(v.id);
            return (
              <li key={v.id} className="ext-var-row">
                <label className="ext-field ext-var-name">
                  <span className="sr-only">Variable name</span>
                  <span className="ext-var-brace" aria-hidden="true">{"{{"}</span>
                  <input
                    className="op-mono"
                    value={v.name}
                    placeholder="name"
                    aria-invalid={!!error}
                    onChange={(e) => update(v.id, { name: e.target.value })}
                  />
                  <span className="ext-var-brace" aria-hidden="true">{"}}"}</span>
                </label>
                <label className="ext-field ext-var-value">
                  <span className="sr-only">Value of {v.name || "variable"}</span>
                  <AutoGrowTextarea
                    className="op-mono"
                    value={v.value}
                    placeholder="value"
                    aria-invalid={!!error}
                    onChange={(e) => update(v.id, { value: e.target.value })}
                  />
                  {error && <span className="ext-actual">{error}</span>}
                </label>
                <button
                  type="button"
                  className="op-icon-btn"
                  aria-label={`Remove variable ${v.name}`}
                  onClick={() => onChange(variables.filter((x) => x.id !== v.id))}
                >
                  <i className="fas fa-trash" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div>
        <button
          type="button"
          className="op-link-btn"
          onClick={() => onChange([...variables, { id: `v${Date.now()}`, name: "", value: "" }])}
        >
          <i className="fas fa-plus" aria-hidden="true" /> Add variable
        </button>
      </div>
    </section>
  );
}

export default function ExtensionTestTable({
  inputs,
  outputs,
  tests,
  results,
  onChange,
  variables,
  variableErrors,
  onVariablesChange,
}: ExtensionTestTableProps) {
  const namedInputs = inputs.filter((p) => p.variableName);
  const namedOutputs = outputs.filter((p) => p.variableName);
  const passing = results.filter(isPassing).length;

  // Failing tests open by default; the user's own toggles win after that.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (t: ExtensionTest, i: number) => toggled[t.id] ?? !isPassing(results[i]);

  const update = (id: string, patch: (t: ExtensionTest) => ExtensionTest) =>
    onChange(tests.map((t) => (t.id === id ? patch(t) : t)));

  const addTest = () => {
    const id = `t${Date.now()}`;
    const suite = tests[tests.length - 1]?.suite;
    onChange([...tests, { id, suite, name: "new test", inputs: {}, expected: {} }]);
    setToggled((s) => ({ ...s, [id]: true }));
  };

  const suites: { name: string; items: { t: ExtensionTest; i: number }[] }[] = [];
  tests.forEach((t, i) => {
    const name = t.suite ?? "";
    const last = suites[suites.length - 1];
    if (last && last.name === name) last.items.push({ t, i });
    else suites.push({ name, items: [{ t, i }] });
  });

  return (
    <div className="ext-tests">
      <div className="ext-tests-header">
        <p className="op-help">
          Give each input a value and say what each output should be. Leave a field blank for a missing attribute, or for an output that should stay unchanged. Tests re-run as you edit.
        </p>
        {tests.length > 0 && (
          <span className={passing === tests.length ? "op-pass" : "op-fail"}>
            {passing}/{tests.length} passing
          </span>
        )}
      </div>

      <TestVariables variables={variables} errors={variableErrors} onChange={onVariablesChange} />

      {suites.map((s) => (
        <section key={`${s.name}-${s.items[0].t.id}`} className="ext-suite" aria-label={s.name || "Tests"}>
          {s.name && <h4 className="ext-suite-title">{s.name}</h4>}
          <ul className="ext-test-list">
            {s.items.map(({ t, i }) => {
              const r = results[i];
              const open = isOpen(t, i);
              const bodyId = `ext-test-body-${t.id}`;
              return (
                <li key={t.id} className={`ext-test ${isPassing(r) ? "" : "ext-test-failing"} ${open ? "ext-test-open" : ""}`}>
                  <div className="ext-test-row">
                    <button
                      type="button"
                      className="ext-test-toggle"
                      aria-expanded={open}
                      aria-controls={bodyId}
                      onClick={() => setToggled((x) => ({ ...x, [t.id]: !open }))}
                    >
                      <i className={`fas fa-chevron-${open ? "down" : "right"} ext-test-chevron`} aria-hidden="true" />
                      <span className="ext-test-text">
                        <span className="ext-test-name">{t.name || "Untitled test"}</span>
                        {!open && (
                          <span className="ext-test-summary">
                            <SummaryChips values={t.inputs} params={namedInputs} />
                            <i className="fas fa-arrow-right ext-test-arrow" aria-hidden="true" />
                            <span className="sr-only">expecting</span>
                            <SummaryChips values={t.expected} params={namedOutputs} />
                          </span>
                        )}
                      </span>
                    </button>
                    {r?.ok ? (
                      <span className={`op-result ${r.pass ? "op-result-true" : "op-result-false"}`}>{r.pass ? "PASS" : "FAIL"}</span>
                    ) : (
                      <span className="op-result op-result-error">ERROR</span>
                    )}
                    <button
                      type="button"
                      className="op-icon-btn"
                      aria-label={`Remove test ${t.name}`}
                      onClick={() => onChange(tests.filter((x) => x.id !== t.id))}
                    >
                      <i className="fas fa-trash" aria-hidden="true" />
                    </button>
                  </div>

                  {open && (
                    <div id={bodyId} className="ext-test-body">
                      <label className="ext-field">
                        <span className="ext-field-label">Test name</span>
                        <input value={t.name} onChange={(e) => update(t.id, (x) => ({ ...x, name: e.target.value }))} />
                      </label>

                      <div className="ext-test-columns">
                        <fieldset className="ext-test-group">
                          <legend>Given</legend>
                          {namedInputs.length === 0 && <p className="op-help">This extension has no inputs.</p>}
                          {namedInputs.map((p) => (
                            <label key={`i-${p.variableName}`} className="ext-field">
                              <span className="ext-field-label">
                                input.{p.variableName} <span className="op-th-type">{p.type}</span>
                              </span>
                              <AutoGrowTextarea
                                className="op-mono"
                                value={t.inputs[p.variableName] ?? ""}
                                placeholder={placeholderFor(p.type)}
                                onChange={(e) => update(t.id, (x) => ({ ...x, inputs: { ...x.inputs, [p.variableName]: e.target.value } }))}
                              />
                            </label>
                          ))}
                        </fieldset>

                        <fieldset className="ext-test-group">
                          <legend>Expect</legend>
                          {namedOutputs.map((p) => {
                            const check = r?.ok ? r.checks.find((c) => c.name === p.variableName) : undefined;
                            return (
                              <label key={`o-${p.variableName}`} className="ext-field">
                                <span className="ext-field-label">
                                  output.{p.variableName} <span className="op-th-type">{p.type}</span>
                                </span>
                                <AutoGrowTextarea
                                  className="op-mono"
                                  value={t.expected[p.variableName] ?? ""}
                                  placeholder="unchanged"
                                  aria-invalid={!!check && !check.pass}
                                  onChange={(e) => update(t.id, (x) => ({ ...x, expected: { ...x.expected, [p.variableName]: e.target.value } }))}
                                />
                                {check && !check.pass && (
                                  <span className="ext-actual">
                                    Expected: {formatExtensionValue(check.expected, p.type)}
                                    <br />
                                    Received: {formatExtensionValue(check.actual, p.type)}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </fieldset>
                      </div>

                      {r && !r.ok && <p className="ext-actual">{r.error}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div>
        <button type="button" className="op-link-btn" onClick={addTest}>
          <i className="fas fa-plus" aria-hidden="true" /> Add test
        </button>
      </div>
    </div>
  );
}
