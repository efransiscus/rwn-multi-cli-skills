export type Action = 'reorganize' | 'adapt' | 'skip';

export interface MigrationDecision {
  sourcePath: string;
  targetPath: string | null;  // null if adapt/skip
  action: Action;
  classification: string;  // movable, movable-with-rules, framework-pinned, unknown
  reason: string;
}

export interface StrategyResult {
  decisions: MigrationDecision[];
  /** Dirs that don't need any action (already canonical) */
  alreadyCanonical: string[];
}
