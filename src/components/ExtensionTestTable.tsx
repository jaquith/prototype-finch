import React from "react";
import {
  formatExtensionValue,
  placeholderFor,
  type ExtensionParam,
  type ExtensionTest,
  type ExtensionTestResult,
} from "../utils/extensionRuntime";

interface ExtensionTestTableProps {
  inputs: ExtensionParam[];
  outputs: ExtensionParam[];
  tests: ExtensionTest[];
  results: ExtensionTestResult[];
  onChange: (tests: ExtensionTest[]) => void;
}

export default function ExtensionTestTable({ inputs, outputs, tests, results, onChange }: ExtensionTestTableProps) {
  const namedInputs = inputs.filter((p) => p.variableName);
  const namedOutputs = outputs.filter((p) => p.variableName);
  const passing = results.filter((r) => r.ok && r.pass).length;

  const update = (id: string, patch: (t: ExtensionTest) => ExtensionTest) =>
    onChange(tests.map((t) => (t.id === id ? patch(t) : t)));

  const addTest = () =>
    onChange([...tests, { id: `t${Date.now()}`, name: "new test", inputs: {}, expected: {} }]);

  return (
    <div className="ext-tests">
      <div className="ext-tests-header">
        <p className="op-help">
          Enter a value for each input and the output you expect. Leave a field blank for a missing attribute or an output that should not be set. Tests re-run as you edit.
        </p>
        {tests.length > 0 && (
          <span className={passing === tests.length ? "op-pass" : "op-fail"}>
            {passing}/{tests.length} passing
          </span>
        )}
      </div>

      {tests.length > 0 && (
        <div className="op-tests-scroll">
          <table className="op-tests">
            <thead>
              <tr>
                <th>Name</th>
                {namedInputs.map((p) => (
                  <th key={`i-${p.variableName}`}>
                    input.{p.variableName} <span className="op-th-type">{p.type}</span>
                  </th>
                ))}
                {namedOutputs.map((p) => (
                  <th key={`o-${p.variableName}`} className="ext-th-expect">
                    expect output.{p.variableName} <span className="op-th-type">{p.type}</span>
                  </th>
                ))}
                <th>Result</th>
                <th><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t, i) => {
                const r = results[i];
                const pass = r.ok && r.pass;
                return (
                  <tr key={t.id} className={pass ? "" : "op-test-failing"}>
                    <td>
                      <input aria-label="Test name" value={t.name} onChange={(e) => update(t.id, (x) => ({ ...x, name: e.target.value }))} />
                    </td>
                    {namedInputs.map((p) => (
                      <td key={`i-${p.variableName}`}>
                        <input
                          aria-label={`${t.name}: input.${p.variableName}`}
                          className="op-mono"
                          value={t.inputs[p.variableName] ?? ""}
                          placeholder={placeholderFor(p.type)}
                          onChange={(e) => update(t.id, (x) => ({ ...x, inputs: { ...x.inputs, [p.variableName]: e.target.value } }))}
                        />
                      </td>
                    ))}
                    {namedOutputs.map((p) => {
                      const check = r.ok ? r.checks.find((c) => c.name === p.variableName) : undefined;
                      return (
                        <td key={`o-${p.variableName}`} className="ext-td-expect">
                          <input
                            aria-label={`${t.name}: expected output.${p.variableName}`}
                            className="op-mono"
                            value={t.expected[p.variableName] ?? ""}
                            placeholder="not set"
                            onChange={(e) => update(t.id, (x) => ({ ...x, expected: { ...x.expected, [p.variableName]: e.target.value } }))}
                          />
                          {check && !check.pass && (
                            <span className="ext-actual">got {formatExtensionValue(check.actual)}</span>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      {r.ok ? (
                        <span className={`op-result ${pass ? "op-result-true" : "op-result-false"}`}>{pass ? "PASS" : "FAIL"}</span>
                      ) : (
                        <span className="op-result op-result-error" title={r.error}>ERROR</span>
                      )}
                      {!r.ok && <span className="ext-actual">{r.error}</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="op-icon-btn"
                        aria-label={`Remove test ${t.name}`}
                        onClick={() => onChange(tests.filter((x) => x.id !== t.id))}
                      >
                        <i className="fas fa-trash" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <button type="button" className="op-link-btn" onClick={addTest}>
          <i className="fas fa-plus" aria-hidden="true" /> Add test
        </button>
      </div>
    </div>
  );
}
