/**
 * FilterBar — a GENERIC (entity-agnostic) filter bar that drives a sibling
 * list block (e.g. RecordList) by writing to /filters/<targetNs>/*.
 *
 * Like the domain ProductFilters, this block OWNS the /filters/<targetNs> seed
 * (search + each facet defaulting to "All"); the list block reads those paths
 * via $state and auto-refilters (debounced) — so the two compose with no state
 * collision. The runtime prunes EQ filters whose value is "" / "All", so an
 * unset facet relaxes the filter.
 *
 * Entity-agnostic: you pass which fields are facets and their option values
 * (we can't know an entity's enum values, so the author supplies them).
 */
import { z } from "zod";
import type { Fragment } from "@/lib/jr/schema";

const FacetSchema = z.object({
  field: z.string().describe("Field id this facet filters on (must match the list's filterFields)."),
  label: z.string().nullable().default(null).describe("Display label; defaults to the field id."),
  options: z.array(z.string()).min(1).describe("Selectable values (an 'All' option is prepended)."),
});

const Params = z.object({
  targetNs: z
    .string()
    .describe("Element key (ns) of the list instance this bar drives — writes to /filters/<targetNs>/*."),
  searchable: z.boolean().default(true).describe("Show a free-text search box bound to /filters/<targetNs>/search."),
  facets: z
    .array(FacetSchema)
    .default([])
    .describe("Select facets, each writing to /filters/<targetNs>/<field>."),
});

type P = z.infer<typeof Params>;

export const FilterBar: Fragment<P> = {
  name: "FilterBar",
  version: "1.0.0",
  description:
    "Generic horizontal filter bar (search + select facets + clear) that drives a sibling list block via /filters/<targetNs>/*. Pair with a RecordList: set the bar's targetNs to the list's instance id, and the list's searchable/filterFields to match. Owns the filter seed.",
  category: "browse",
  params: Params as z.ZodType<P>,
  build: ({ targetNs, searchable, facets }, ns) => {
    const filters = `/filters/${targetNs}`;

    const clearValue: Record<string, unknown> = {};
    if (searchable) clearValue.search = "";
    for (const facet of facets) clearValue[facet.field] = "All";

    const elements: Record<string, Record<string, unknown>> = {
      [ns]: {
        type: "Stack",
        props: { direction: "horizontal", gap: "md", align: "end", className: "flex-wrap" },
        children: [
          ...(searchable ? [`${ns}-search`] : []),
          ...facets.map((_, i) => `${ns}-facet-${i}`),
          `${ns}-clear`,
        ],
      },
      [`${ns}-clear`]: {
        type: "Button",
        props: { label: "Clear", variant: "secondary", disabled: null },
        on: {
          press: { action: "setState", params: { statePath: filters, value: clearValue } },
        },
      },
    };

    if (searchable) {
      elements[`${ns}-search`] = {
        type: "Input",
        props: {
          label: "Search",
          name: `${ns}-search`,
          type: "text",
          placeholder: "Search…",
          value: { $bindState: `${filters}/search` },
        },
      };
    }

    facets.forEach((facet, i) => {
      elements[`${ns}-facet-${i}`] = {
        type: "Select",
        props: {
          label: facet.label ?? facet.field,
          name: `${ns}-facet-${i}`,
          options: ["All", ...facet.options],
          placeholder: "All",
          value: { $bindState: `${filters}/${facet.field}` },
        },
      };
    });

    return {
      root: ns,
      elements: elements as never,
      // Owns the target's filter seed (cross-ns by design, like ProductFilters).
      state: { filters: { [targetNs]: clearValue } },
    };
  },
};
