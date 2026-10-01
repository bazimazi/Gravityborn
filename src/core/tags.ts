/** Shared content identity, distinct from a modifier's target-tag filter. */
export interface TaggedContent {
  readonly tags: readonly string[];
}
export function collectTags(sources: readonly (TaggedContent | undefined)[]): string[] {
  return [...new Set(sources.flatMap((source) => source?.tags ?? []))];
}
