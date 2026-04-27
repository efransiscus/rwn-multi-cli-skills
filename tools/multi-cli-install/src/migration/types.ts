export interface MigrationOp {
  type: 'move' | 'update-config';
  source: string;       // relative path
  target: string;       // relative path (for move) or file to update (for config)
  description: string;
}

export interface MigrationPlan {
  ops: MigrationOp[];
  /** Human-readable summary */
  summary: string;
}

export interface MigrationResult {
  success: boolean;
  opsExecuted: number;
  errors: string[];
}
