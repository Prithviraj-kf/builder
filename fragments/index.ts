/**
 * Fragment bundles — the SINGLE SOURCE OF TRUTH for what fragments exist and
 * how they group. Each entry maps 1:1 to a fragments/<name> folder and carries
 * its tier: "generic" (entity-agnostic — pass bdo + a field map) vs "domain"
 * (fixed entity contracts, shipped as a wired bundle).
 *
 * Everything derives from this list:
 *   - `fragmentRegistry` (below) — the flat name→fragment map the agent prompt
 *     and the eject-on-write expander consume.
 *   - the blocks showcase — groups by bundle/tier (showcase/blocks/blockMeta.ts
 *     imports `fragmentBundles` directly).
 *
 * To add a bundle, add ONE entry here; the agent and the showcase pick it up.
 * Server-safe: fragments import zod + types only.
 */
import type { FragmentRegistry } from "@/lib/jr/schema";
import { ecommerceFragments } from "./ecommerce";
import { genericFragments } from "./generic";

export type FragmentTier = "generic" | "domain";

export interface FragmentBundle {
  /** Folder name under fragments/, also the showcase sub-group label. */
  name: string;
  tier: FragmentTier;
  fragments: FragmentRegistry;
}

export const fragmentBundles: FragmentBundle[] = [
  { name: "generic", tier: "generic", fragments: genericFragments },
  { name: "ecommerce", tier: "domain", fragments: ecommerceFragments },
];

/** Flat registry derived from the bundles — what the agent + expander consume. */
export const fragmentRegistry: FragmentRegistry = Object.fromEntries(
  fragmentBundles.flatMap((b) => Object.entries(b.fragments)),
) as FragmentRegistry;
