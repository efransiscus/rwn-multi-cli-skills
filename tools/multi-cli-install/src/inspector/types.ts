export interface ProjectProfile {
  projectPath: string;
  inspectedAt: string;
  stack: StackInfo;
  framework: FrameworkInfo;
  dirs: DirInfo;
  commands: CommandInfo;
  conventions: ConventionInfo;
  existingAdrs: AdrInfo;
  secretRisk: SecretRiskInfo;
}

export interface StackInfo {
  language: string;
  packageManager: string;
  manifestFile: string | null;
}

export interface FrameworkInfo {
  name: string;
  version: string | null;
  detectedVia: string[];
  monorepo: MonorepoInfo | null;
}

export interface MonorepoInfo {
  tool: string;
  members: string[];
}

export interface DirInfo {
  source: DetectedDir[];
  test: DetectedDir[];
  docs: DetectedDir[];
  ci: DetectedDir[];
}

export interface DetectedDir {
  path: string;
  reason: string;
}

export interface CommandInfo {
  test: string | null;
  build: string | null;
  lint: string | null;
  source: string | null;
}

export interface ConventionInfo {
  namingStyle: string;
  lintConfig: string[];
}

export interface AdrInfo {
  found: boolean;
  paths: string[];
}

export interface SecretRiskInfo {
  found: boolean;
  files: string[];
}
