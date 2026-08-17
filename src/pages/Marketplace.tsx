import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/SimpleButton";
import SimpleTooltip from "../components/SimpleTooltip";
import { TYPE_ICONS, TYPE_COLORS } from "../constants/typeIcons";
import { useMarketplace } from "../contexts/MarketplaceContext";
import {
  MARKETPLACE_CATALOG,
  MARKETPLACE_CATEGORIES,
  TIER_LABELS,
} from "../data/marketplaceCatalog";
import type { MarketplaceExtension, MarketplaceTier } from "../data/marketplaceCatalog";
import { formatRelative } from "../utils/formatDate";
import "./Marketplace.css";

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="mkt-stars" aria-label={`${rating} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <i
          key={i}
          className={
            i < full
              ? "fas fa-star"
              : i === full && half
                ? "fas fa-star-half-alt"
                : "far fa-star"
          }
          aria-hidden="true"
        />
      ))}
      <span className="mkt-rating-num">{rating.toFixed(1)}</span>
    </span>
  );
}

function ParamPill({ variableName, type }: { variableName: string; type: string }) {
  const baseType = type.replace(/^Static /, "");
  const color = TYPE_COLORS[baseType] || "#6a6a6a";
  const icon = TYPE_ICONS[baseType] || "fas fa-circle";
  return (
    <span className="mkt-param-pill">
      <i className={icon} style={{ color }} aria-hidden="true" />
      <span className="mkt-param-name">{variableName}</span>
      <span className="mkt-param-type">{type}</span>
    </span>
  );
}

function MarketplaceCard({
  ext,
  onOpenDetail,
}: {
  ext: MarketplaceExtension;
  onOpenDetail: (ext: MarketplaceExtension) => void;
}) {
  const navigate = useNavigate();
  const { isAdded, addExtension, getAdded } = useMarketplace();
  const added = isAdded(ext.id);
  const record = getAdded(ext.id);
  return (
    <div
      className="mkt-card"
      onClick={() => onOpenDetail(ext)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpenDetail(ext)}
    >
      <div className="mkt-card-top">
        <span className="mkt-card-icon">
          <i className={ext.icon} aria-hidden="true" />
        </span>
        <div className="mkt-card-heading">
          <div className="mkt-card-name">
            {ext.name}
            {ext.isBulk && (
              <span className="mkt-bulk-tag">
                <i className="fas fa-cubes" aria-hidden="true" /> Bulk
              </span>
            )}
          </div>
          <div className="mkt-card-publisher">
            {ext.publisher}
            {ext.verified && (
              <SimpleTooltip title="Verified publisher">
                <i className="fas fa-circle-check mkt-verified" aria-hidden="true" />
              </SimpleTooltip>
            )}
          </div>
        </div>
      </div>

      <p className="mkt-card-tagline">{ext.tagline}</p>

      <div className="mkt-card-meta">
        <Stars rating={ext.rating} />
        <span className="mkt-installs">
          <i className="fas fa-download" aria-hidden="true" /> {ext.installs}
        </span>
      </div>

      <div className="mkt-card-footer">
        <span className="mkt-category-tag">{ext.category}</span>
        {added ? (
          <span className="mkt-added-actions" onClick={(e) => e.stopPropagation()}>
            <span className="mkt-added-label">
              <i className="fas fa-check" aria-hidden="true" /> Added
            </span>
            {record?.modified && (
              <span className="mkt-modified-dot" title="Modified after install" />
            )}
            <button
              type="button"
              className="mkt-open-link"
              onClick={() => navigate(`/modules/${ext.id}`)}
            >
              Open
            </button>
          </span>
        ) : (
          <span onClick={(e) => e.stopPropagation()}>
            <Button type="primary" onClick={() => addExtension(ext.id)}>
              <i className="fas fa-plus" aria-hidden="true" />
              <span>Add</span>
            </Button>
          </span>
        )}
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { isAdded } = useMarketplace();
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<MarketplaceExtension | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MARKETPLACE_CATALOG.filter((e) => {
      const matchesCat = category === "All" || e.category === category;
      const matchesQ =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.publisher.toLowerCase().includes(q) ||
        e.tagline.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [category, query]);

  const addedCount = MARKETPLACE_CATALOG.filter((e) => isAdded(e.id)).length;
  const tiers: MarketplaceTier[] = ["core", "community"];

  return (
    <div className="mkt-page">
      <div className="mkt-header">
        <div className="mkt-title-row">
          <span className="mkt-title-icon" aria-hidden="true">
            <i className="fas fa-shopping-bag" />
          </span>
          <h1 className="mkt-title">Extension Marketplace</h1>
          <span className="mkt-count-badge">{addedCount} added</span>
        </div>
        <p className="mkt-description">
          Browse ready-to-install extension capsules and add them to your active Extension
          Definitions. Capsules run alongside your existing attributes &mdash; each one is additive
          and opt-in. Added capsules start locked and read-only; unlock one to customize it, and
          every change is tracked against the published version.
        </p>
      </div>

      <div className="mkt-toolbar">
        <div className="mkt-search">
          <i className="fas fa-search" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search extensions, publishers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search marketplace"
          />
        </div>
        <div className="mkt-chips">
          {["All", ...MARKETPLACE_CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`mkt-chip ${category === cat ? "mkt-chip-active" : ""}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {tiers.map((tier) => {
        const items = filtered.filter((e) => e.tier === tier);
        if (items.length === 0) return null;
        const meta = TIER_LABELS[tier];
        return (
          <section key={tier} className="mkt-shelf">
            <div className="mkt-shelf-head">
              <h2 className={`mkt-shelf-title mkt-shelf-title-${tier}`}>
                {tier === "core" ? (
                  <i className="fas fa-circle-check" aria-hidden="true" />
                ) : (
                  <i className="fas fa-users" aria-hidden="true" />
                )}
                {meta.title}
              </h2>
              <span className="mkt-shelf-blurb">{meta.blurb}</span>
            </div>
            <div className="mkt-grid">
              {items.map((ext) => (
                <MarketplaceCard key={ext.id} ext={ext} onOpenDetail={setDetail} />
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <div className="mkt-empty">
          <i className="fas fa-box-open" aria-hidden="true" />
          <p>No extensions match your search.</p>
        </div>
      )}

      {detail && (
        <DetailDrawer
          ext={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function DetailDrawer({ ext, onClose }: { ext: MarketplaceExtension; onClose: () => void }) {
  const navigate = useNavigate();
  const { isAdded, addExtension, getAdded } = useMarketplace();
  const added = isAdded(ext.id);
  const record = getAdded(ext.id);
  const inputs = ext.params.filter((p) => p.direction === "input");
  const outputs = ext.params.filter((p) => p.direction === "output");

  return (
    <div className="mkt-drawer-overlay" onClick={onClose}>
      <aside className="mkt-drawer" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mkt-drawer-close" onClick={onClose} aria-label="Close">
          <i className="fas fa-times" aria-hidden="true" />
        </button>

        <div className="mkt-drawer-head">
          <span className="mkt-card-icon mkt-drawer-icon">
            <i className={ext.icon} aria-hidden="true" />
          </span>
          <div>
            <h2 className="mkt-drawer-name">{ext.name}</h2>
            <div className="mkt-card-publisher">
              {ext.publisher}
              {ext.verified && <i className="fas fa-circle-check mkt-verified" aria-hidden="true" />}
              <span className="mkt-drawer-version">v{ext.version}</span>
            </div>
          </div>
        </div>

        <div className="mkt-drawer-meta">
          <Stars rating={ext.rating} />
          <span className="mkt-installs">
            <i className="fas fa-download" aria-hidden="true" /> {ext.installs} installs
          </span>
          <span className="mkt-category-tag">{ext.category}</span>
        </div>

        <p className="mkt-drawer-desc">{ext.description}</p>

        <div className="mkt-replaces">
          <span className="mkt-replaces-label">
            <i className="fas fa-magic" aria-hidden="true" /> Replaces today
          </span>
          <p className="mkt-replaces-text">{ext.replaces}</p>
        </div>

        <div className="mkt-drawer-section">
          <h3 className="mkt-drawer-section-title">Inputs</h3>
          <div className="mkt-param-list">
            {inputs.map((p) => (
              <ParamPill key={p.id} variableName={p.variableName} type={p.type} />
            ))}
          </div>
        </div>

        <div className="mkt-drawer-section">
          <h3 className="mkt-drawer-section-title">Outputs</h3>
          <div className="mkt-param-list">
            {outputs.map((p) => (
              <ParamPill key={p.id} variableName={p.variableName} type={p.type} />
            ))}
          </div>
        </div>

        <div className="mkt-drawer-section">
          <h3 className="mkt-drawer-section-title">Source Preview</h3>
          <pre className="mkt-code-preview">{ext.code.trim()}</pre>
        </div>

        <div className="mkt-drawer-actions">
          {added ? (
            <>
              <span className="mkt-added-label mkt-added-label-lg">
                <i className="fas fa-check" aria-hidden="true" /> Added to Definitions
                {record?.modified && <span className="mkt-modified-inline"> · Modified</span>}
              </span>
              <Button type="primary" onClick={() => navigate(`/modules/${ext.id}`)}>
                <i className="fas fa-arrow-right" aria-hidden="true" />
                <span>Open in editor</span>
              </Button>
            </>
          ) : (
            <Button type="primary" onClick={() => addExtension(ext.id)}>
              <i className="fas fa-plus" aria-hidden="true" />
              <span>Add to Definitions</span>
            </Button>
          )}
        </div>
        {added && record && (
          <p className="mkt-drawer-added-note">
            Added by {record.addedBy} {formatRelative(record.addedAt)}
          </p>
        )}
      </aside>
    </div>
  );
}
