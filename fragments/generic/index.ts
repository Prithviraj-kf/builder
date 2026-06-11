/**
 * Generic fragment bundle — entity-AGNOSTIC blocks. Unlike the domain bundles,
 * these bake in no entity or field names; you pass the entity (`bdo`) plus a
 * field map as params, so one block works over any data model.
 */
import type { FragmentRegistry } from "@/lib/jr/schema";
import { FilterBar } from "./FilterBar";
import { RecordList } from "./RecordList";
import { SalesStats } from "./SalesStats";

export const genericFragments = {
  RecordList,
  FilterBar,
  SalesStats,
} as unknown as FragmentRegistry;
