import { useNavigate } from "react-router-dom";
import Button from "../components/SimpleButton";
import { MOCK_OPERATORS, plainLabel } from "../data/operators";
import {
  audienceNeedsAttention,
  conditionCount,
  customOperatorIds,
  operatorHasFailingTests,
  useAudiences,
} from "../data/audiences";
import "./ModuleList.css";
import "./Operators.css";
import "./Audiences.css";

function formatModified(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function AudienceList() {
  const navigate = useNavigate();
  const audiences = useAudiences();
  const create = () => navigate("/audiences/new");

  return (
    <div className="module-list-page">
      <header className="module-list-header">
        <div className="module-list-title-section">
          <h1 className="module-list-title">Audiences</h1>
        </div>
        <p className="module-list-description">
          An audience is a group of visitors who match a set of conditions on their attributes.
        </p>
      </header>

      {audiences.length === 0 ? (
        <div className="aud-empty">
          <p>Audiences group visitors by the conditions they meet. Create one to get started.</p>
          <Button type="primary" onClick={create}>
            <i className="fas fa-plus" aria-hidden="true" /> Create audience
          </Button>
        </div>
      ) : (
        <>
          <div className="module-list-toolbar">
            <Button type="primary" onClick={create}>
              <i className="fas fa-plus" aria-hidden="true" /> Create audience
            </Button>
          </div>
          <div className="module-table-container">
            <table className="module-table">
              <thead>
                <tr>
                  <th className="module-table-th">Audience</th>
                  <th className="module-table-th">Conditions</th>
                  <th className="module-table-th">Custom operators</th>
                  <th className="module-table-th">Last modified</th>
                </tr>
              </thead>
              <tbody>
                {audiences.map((a) => {
                  const count = conditionCount(a);
                  const ops = customOperatorIds(a);
                  return (
                    <tr key={a.id} className="module-table-row op-row" onClick={() => navigate(`/audiences/${a.id}`)}>
                      <td className="module-table-td">
                        <div className="aud-name">{a.name}</div>
                        {a.description && <div className="aud-desc">{a.description}</div>}
                        {audienceNeedsAttention(a) && (
                          <div className="aud-attention">
                            <i className="fas fa-exclamation-triangle" aria-hidden="true" /> Needs attention
                          </div>
                        )}
                      </td>
                      <td className="module-table-td op-muted">
                        {count} {count === 1 ? "condition" : "conditions"}
                      </td>
                      <td className="module-table-td" onClick={(e) => e.stopPropagation()}>
                        {ops.length === 0 ? (
                          <span className="op-muted">None</span>
                        ) : (
                          <div className="aud-ops">
                            {ops.map((id) => {
                              const op = MOCK_OPERATORS.find((o) => o.id === id);
                              const failing = operatorHasFailingTests(id);
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  className={`aud-op-chip ${failing ? "aud-op-chip-failing" : ""}`}
                                  onClick={() => navigate(op ? `/operators/${id}` : "/operators")}
                                >
                                  <span className="aud-op-fx" aria-hidden="true">ƒ</span>
                                  {op ? plainLabel(op.label, op.operands) : "Operator not found"}
                                  {failing && (
                                    <>
                                      <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                                      <span className="sr-only">(failing tests)</span>
                                    </>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="module-table-td op-muted">{formatModified(a.lastModified)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
