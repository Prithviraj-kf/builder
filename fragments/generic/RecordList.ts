/**
 * RecordList — a GENERIC (entity-agnostic) list block.
 *
 * Unlike the e-commerce domain fragments, this block bakes in NO entity or
 * field names. You pass it the entity (`bdo`) and a FIELD MAP (`titleField`,
 * `subtitleField?`, `badgeField?`); it owns its own `bdo.list` datasource, its
 * init, and the repeat binding. One $fragment ref → a fully wired list that
 * works over ANY entity that has the mapped fields.
 *
 * This is the "Variant B" pattern: the fields are dynamic params, so a single
 * block serves a Task list, an Order list, a Contact list, etc.
 */
import { z } from "zod";
import type { Fragment } from "@/lib/jr/schema";

const Params = z.object({
  bdo: z.string().describe("Entity to list, e.g. 'Task' or 'Contact'."),
  titleField: z
    .string()
    .describe("Field id rendered as each row's primary text, e.g. 'Title'."),
  subtitleField: z
    .string()
    .nullable()
    .default(null)
    .describe("Optional field id rendered as muted secondary text under the title."),
  badgeField: z
    .string()
    .nullable()
    .default(null)
    .describe("Optional field id rendered as a Badge on the right of each row, e.g. 'Status'."),
  title: z.string().default("Records").describe("Card heading above the list."),
  searchable: z
    .boolean()
    .default(false)
    .describe(
      "Read a free-text search from /filters/<ns>/search (drive it with a sibling FilterBar pointed at this instance).",
    ),
  filterFields: z
    .array(z.string())
    .default([])
    .describe(
      "Field ids to EQ-filter on, each bound to /filters/<ns>/<field> (drive them with a sibling FilterBar). Pruned when the value is empty/'All'.",
    ),
  sortField: z
    .string()
    .nullable()
    .default(null)
    .describe("Optional field id to sort by. null = insertion order."),
  sortDirection: z.enum(["ASC", "DESC"]).default("DESC"),
  pageSize: z.number().int().min(5).max(100).default(20),
  emptyTitle: z.string().default("No records yet"),
});

type P = z.infer<typeof Params>;

export const RecordList: Fragment<P> = {
  name: "RecordList",
  version: "1.0.0",
  description:
    "Generic, entity-agnostic record list: a titled card of rows, each showing a title field plus an optional subtitle field and a status Badge. Owns its own bdo.list (you pass the entity + field map) — works over ANY entity. Use for simple 'list of X' screens instead of hand-building a repeat.",
  category: "display",
  params: Params as z.ZodType<P>,
  build: (
    {
      bdo,
      titleField,
      subtitleField,
      badgeField,
      title,
      searchable,
      filterFields,
      sortField,
      sortDirection,
      pageSize,
      emptyTitle,
    },
    ns,
  ) => {
    const items = `${ns}-items`;
    const filters = `/filters/${ns}`;
    const reactive = searchable || filterFields.length > 0;

    return {
      root: ns,
      elements: {
        [ns]: {
          type: "Card",
          props: { title, description: null, maxWidth: null, centered: null, className: null },
          children: [`${ns}-body`],
        },
        [`${ns}-body`]: {
          type: "Stack",
          props: { direction: "vertical", gap: "md" },
          children: [`${ns}-rows`, `${ns}-empty`],
        },
        [`${ns}-rows`]: {
          type: "Stack",
          props: { direction: "vertical", gap: "sm" },
          repeat: { statePath: `/queries/${items}/data`, key: "_id" },
          children: [`${ns}-row`],
        },
        [`${ns}-row`]: {
          type: "Stack",
          props: {
            direction: "horizontal",
            justify: "between",
            align: "center",
            className: "rounded-lg border border-border px-4 py-3",
          },
          children: [`${ns}-row-main`, ...(badgeField ? [`${ns}-row-badge`] : [])],
        },
        [`${ns}-row-main`]: {
          type: "Stack",
          props: { direction: "vertical", gap: "none" },
          children: [`${ns}-row-title`, ...(subtitleField ? [`${ns}-row-subtitle`] : [])],
        },
        [`${ns}-row-title`]: {
          type: "Text",
          props: { text: { $item: titleField }, variant: "body" },
        },
        ...(subtitleField
          ? {
              [`${ns}-row-subtitle`]: {
                type: "Text",
                props: { text: { $item: subtitleField }, variant: "muted" },
              },
            }
          : {}),
        ...(badgeField
          ? {
              [`${ns}-row-badge`]: {
                type: "Badge",
                props: { text: { $item: badgeField }, variant: "secondary" },
              },
            }
          : {}),
        [`${ns}-empty`]: {
          type: "Empty",
          props: { title: emptyTitle, description: "Records will appear here once added." },
          visible: { $state: `/queries/${items}/page/total`, eq: 0 },
        },
      },
      datasources: {
        [items]: {
          type: "bdo.list",
          params: {
            bdo,
            ...(searchable ? { Search: { $state: `${filters}/search` } } : {}),
            ...(filterFields.length > 0
              ? {
                  Filter: {
                    Operator: "AND",
                    Condition: filterFields.map((field) => ({
                      LHSField: field,
                      Operator: "EQ",
                      RHSValue: { $state: `${filters}/${field}` },
                    })),
                  },
                }
              : {}),
            ...(sortField ? { Sort: [{ [sortField]: sortDirection }] } : {}),
            Page: { number: 1, size: pageSize },
          },
          // Debounce when reactive so typing in a sibling FilterBar doesn't
          // refire on every keystroke.
          ...(reactive ? { debounceMs: 250 } : {}),
        },
      },
      init: [{ action: "datasource.refresh", params: { names: [items] } }],
    };
  },
};
