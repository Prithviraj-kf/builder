/**
 * Showcase metadata for blocks (fragments). Each block's name/description/
 * category comes from the live fragment; a per-block DEMO supplies the
 * $fragment params + sample seed records so the block renders against the
 * in-memory mock executor.
 *
 * Blocks are grouped by BUNDLE — which maps 1:1 to the fragments/<bundle>
 * folders. A bundle's tier decides the top-level group: "generic" (entity-
 * agnostic — you pass bdo + a field map) vs "domain" (fixed entity contracts,
 * shipped as a wired bundle, e.g. ecommerce).
 */
import { fragmentBundles, type FragmentTier } from "@/fragments";

type Rec = Record<string, unknown>;
export type BlockTier = FragmentTier;

export interface BlockDemo {
  /** Sample records per entity the block reads/writes. */
  seed: Record<string, Rec[]>;
  /** Single-ref demo: params for this block's $fragment ref. */
  params?: Record<string, unknown>;
  /**
   * Composite demo: a full source spec (multiple $fragment refs wired together)
   * — used when a block is only meaningful alongside another, e.g. a FilterBar
   * driving a RecordList.
   */
  source?: { root: string; elements: Record<string, unknown> };
}

export interface BlockEntry {
  name: string;
  tier: BlockTier;
  /** Source bundle/folder under fragments/ (e.g. "generic", "ecommerce"). */
  bundle: string;
  category: string;
  description: string;
  /** null when no preview demo has been authored yet. */
  demo: BlockDemo | null;
}

// Sample data reused across the generic demos.
const TASKS: Rec[] = [
  { Title: "Fix login redirect loop", Assignee: "Priya Nair", Status: "Open" },
  { Title: "Write onboarding docs", Assignee: "Marcus Reid", Status: "In Progress" },
  { Title: "Ship dark mode toggle", Assignee: "Lena Fischer", Status: "Done" },
  { Title: "Migrate to Next 16", Assignee: "Sam Okoye", Status: "Open" },
  { Title: "Add CSV export", Assignee: "Aisha Khan", Status: "In Progress" },
  { Title: "Audit accessibility", Assignee: "Diego Marín", Status: "Done" },
];

/**
 * Per-block preview demos. Blocks without an entry render as "preview data not
 * authored yet" but still appear in the gallery and schema views.
 */
const DEMOS: Record<string, BlockDemo> = {
  RecordList: {
    params: {
      bdo: "Task",
      titleField: "Title",
      subtitleField: "Assignee",
      badgeField: "Status",
      title: "Tasks",
      sortField: "Title",
      sortDirection: "ASC",
    },
    seed: { Task: TASKS },
  },
  SalesStats: {
    params: {
      columns: 3,
      stats: [
        { label: "Total tasks", bdo: "Task", type: "COUNT" },
        { label: "Open", bdo: "Task", type: "COUNT", filterField: "Status", filterValue: "Open" },
        { label: "Done", bdo: "Task", type: "COUNT", filterField: "Status", filterValue: "Done" },
      ],
    },
    seed: { Task: TASKS },
  },
  // Composite demo: FilterBar only makes sense driving a list, so the preview
  // wires it to a RecordList by instance id (targetNs === the list's element key).
  FilterBar: {
    seed: { Task: TASKS },
    source: {
      root: "demo",
      elements: {
        demo: {
          type: "Stack",
          props: { direction: "vertical", gap: "md" },
          children: ["task-filters", "task-list"],
        },
        "task-filters": {
          $fragment: "FilterBar",
          params: {
            targetNs: "task-list",
            searchable: true,
            facets: [{ field: "Status", label: "Status", options: ["Open", "In Progress", "Done"] }],
          },
        },
        "task-list": {
          $fragment: "RecordList",
          params: {
            bdo: "Task",
            titleField: "Title",
            subtitleField: "Assignee",
            badgeField: "Status",
            title: "Tasks",
            searchable: true,
            filterFields: ["Status"],
            sortField: "Title",
            sortDirection: "ASC",
          },
        },
      },
    },
  },
};

export function buildBlockEntries(): BlockEntry[] {
  return fragmentBundles.flatMap((bundle) =>
    Object.values(bundle.fragments).map((f) => ({
      name: f.name,
      tier: bundle.tier,
      bundle: bundle.name,
      category: f.category,
      description: f.description,
      demo: DEMOS[f.name] ?? null,
    })),
  );
}

/** Tier display order, derived from the bundle manifest. */
export const TIER_ORDER: BlockTier[] = [...new Set(fragmentBundles.map((b) => b.tier))];
