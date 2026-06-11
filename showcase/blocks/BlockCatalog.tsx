"use client";

/**
 * The Blocks gallery — the fragment registry browsed like the component
 * catalog. Sidebar groups blocks by tier (Generic / Domain); the main panel
 * expands the selected block's $fragment ref to primitives, renders it live
 * against the in-memory mock executor, and shows the "one ref → many
 * primitives" expansion side by side.
 */
import { useEffect, useMemo, useState } from "react";
import type { Spec } from "@/lib/jr/schema";
import { fragmentRegistry } from "@/fragments";
import { expandFragments } from "@/lib/server/fragment-expander";
import { BlockPreview } from "./BlockPreview";
import { type BlockEntry, type BlockTier, buildBlockEntries, TIER_ORDER } from "./blockMeta";
import { JsonTree } from "../shared/JsonTree";

const TIER_LABEL: Record<BlockTier, string> = { generic: "Generic", domain: "Domain" };

function TierBadge({ tier }: { tier: BlockTier }) {
  const cls =
    tier === "generic"
      ? "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400"
      : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {TIER_LABEL[tier]}
    </span>
  );
}

const instanceIdFor = (name: string) =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Drop internal tooling metadata (incl. the volatile ejectedAt timestamp in
 *  _boundaries) so the displayed JSON is deterministic and SSR-stable. */
function omitMeta(spec: Record<string, unknown>): Record<string, unknown> {
  const { _boundaries, __expandDepth, ...rest } = spec;
  void _boundaries;
  void __expandDepth;
  return rest;
}

function BlockDetail({ entry }: { entry: BlockEntry }) {
  const instanceId = instanceIdFor(entry.name);

  const { sourceRef, expanded } = useMemo(() => {
    if (!entry.demo) return { sourceRef: null, expanded: null };
    // Composite demo (e.g. FilterBar + RecordList wired together).
    if (entry.demo.source) {
      const result = expandFragments(entry.demo.source as Record<string, unknown>, fragmentRegistry);
      return { sourceRef: entry.demo.source.elements, expanded: result };
    }
    const ref = { $fragment: entry.name, params: entry.demo.params };
    const source = { root: instanceId, elements: { [instanceId]: ref } };
    const result = expandFragments(source as Record<string, unknown>, fragmentRegistry);
    return { sourceRef: { [instanceId]: ref }, expanded: result };
  }, [entry, instanceId]);

  const elementCount = expanded ? Object.keys((expanded.spec.elements as object) ?? {}).length : 0;
  const dsCount = expanded ? Object.keys((expanded.spec.datasources as object) ?? {}).length : 0;
  const expansionFailed = !!expanded && expanded.issues.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{entry.category}</div>
      <div className="flex items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{entry.name}</h1>
        <TierBadge tier={entry.tier} />
      </div>
      {entry.description && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{entry.description}</p>
      )}

      <div className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</div>
      <div className="canvas-grid mt-2 flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border p-8">
        <div className="w-full">
          {!entry.demo ? (
            <p className="text-center text-sm text-muted-foreground">
              No preview data authored yet — this block needs its sample entity + records.
            </p>
          ) : expansionFailed ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              Expansion failed: {expanded?.issues.join("; ")}
            </div>
          ) : (
            <BlockPreview spec={expanded!.spec as unknown as Spec} seed={entry.demo.seed} />
          )}
        </div>
      </div>

      {entry.demo && !expansionFailed && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What the agent writes
            </div>
            <JsonTree data={sourceRef} />
            <p className="mt-2 text-xs text-muted-foreground">One element reference.</p>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Expands to
            </div>
            <JsonTree data={omitMeta(expanded!.spec)} />
            <p className="mt-2 text-xs text-muted-foreground">
              {elementCount} elements · {dsCount} datasource{dsCount === 1 ? "" : "s"} · materialised at save time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function BlockCatalog() {
  const entries = useMemo(() => buildBlockEntries(), []);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const byTier = useMemo(() => {
    const map = new Map<BlockTier, BlockEntry[]>();
    for (const tier of TIER_ORDER) map.set(tier, []);
    for (const e of filtered) map.get(e.tier)?.push(e);
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [filtered]);

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!filtered.some((e) => e.name === selected)) setSelected(filtered[0].name);
  }, [filtered, selected]);

  const selectedEntry = entries.find((e) => e.name === selected) ?? filtered[0] ?? null;

  return (
    <>
      <aside className="flex w-72 shrink-0 flex-col border-r border-border">
        <div className="shrink-0 border-b border-border p-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks…"
            className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          {TIER_ORDER.map((tier) => {
            const list = byTier.get(tier) ?? [];
            if (list.length === 0) return null;
            // Sub-group a tier's blocks by bundle, preserving sorted order.
            const bundles = new Map<string, BlockEntry[]>();
            for (const entry of list) {
              const group = bundles.get(entry.bundle);
              if (group) group.push(entry);
              else bundles.set(entry.bundle, [entry]);
            }
            return (
              <div key={tier} className="mb-2">
                <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="flex-1">{TIER_LABEL[tier]}</span>
                  <span className="text-[10px] font-normal">{list.length}</span>
                </div>
                {[...bundles].map(([bundle, entries]) => (
                  <div key={bundle}>
                    {/* Show a bundle sub-header only when it adds info (e.g.
                        "ecommerce" under Domain) — not when bundle === tier. */}
                    {bundle !== tier && (
                      <div className="flex items-center gap-1 px-2 py-1 pl-4 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                        <span className="flex-1">{bundle}</span>
                        <span className="font-normal">{entries.length}</span>
                      </div>
                    )}
                    <ul className="ml-2 border-l border-border pl-2">
                      {entries.map((entry) => {
                        const active = entry.name === selected;
                        return (
                          <li key={entry.name}>
                            <button
                              type="button"
                              onClick={() => setSelected(entry.name)}
                              className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors ${
                                active ? "bg-primary/10 font-medium text-primary" : "text-foreground/80 hover:bg-muted"
                              }`}
                            >
                              <span className="font-mono text-[13px]">{entry.name}</span>
                              {!entry.demo && <span className="text-[9px] uppercase text-muted-foreground">soon</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">No blocks match “{query}”.</p>
          )}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        {selectedEntry ? (
          <BlockDetail key={selectedEntry.name} entry={selectedEntry} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a block from the sidebar.
          </div>
        )}
      </main>
    </>
  );
}
