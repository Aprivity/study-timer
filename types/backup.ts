import type { BackgroundSettings } from "./background";
import type { FocusSession } from "./focus-session";
import type { FocusSettings } from "./settings";

export interface BackupSummary {
  sessionCount: number;
  categoryCount: number;
  completedCount: number;
  stoppedCount: number;
  firstSessionAt: number | null;
  lastSessionAt: number | null;
}

export interface BackupAssetMetadata {
  included: false;
  exists: boolean | null;
  storageKey: string | null;
  mimeType: string | null;
  size: number | null;
}

export interface AprivityFocusBackup {
  format: "aprivity-focus-backup";
  version: 1;
  exportedAt: string;
  app: { name: "Aprivity Focus"; version: string };
  summary: BackupSummary;
  data: {
    sessions: FocusSession[];
    settings: FocusSettings;
    backgroundSettings: BackgroundSettings;
    customCategories?: string[];
    customTimePresets?: number[];
  };
  assets: { backgroundImage: BackupAssetMetadata };
  exclusions: string[];
  warnings?: string[];
}

export interface ImportPreviewSummary extends BackupSummary {
  originalSessionCount: number;
  validSessionCount: number;
  invalidSessionCount: number;
  settingsPresent: boolean;
  pomodoroSettingsPresent: boolean;
  backgroundSettingsPresent: boolean;
  backgroundType: BackgroundSettings["type"];
}

export interface ImportPlan {
  backup: AprivityFocusBackup;
  validSessions: FocusSession[];
  invalidSessionCount: number;
  warnings: string[];
  unknownFields: string[];
  summary: ImportPreviewSummary;
}

export type ImportStrategy = "merge" | "replace";

export interface ImportOptions {
  strategy: ImportStrategy;
  applySettings: boolean;
  applyBackground: boolean;
  backgroundImageExists: boolean;
}

export interface ImportResult {
  strategy: ImportStrategy;
  addedCount: number;
  replacedCount: number;
  duplicateCount: number;
  conflictCount: number;
  invalidCount: number;
  settingsApplied: boolean;
  backgroundApplied: boolean;
  backgroundImageResult: "unchanged" | "available" | "needs-upload";
  recoveryPointCreated: boolean;
  warnings: string[];
}

export interface PreImportRecoveryPoint {
  format: "aprivity-focus-pre-import";
  version: 1;
  createdAt: string;
  data: {
    sessions: FocusSession[];
    settings: FocusSettings;
    backgroundSettings: BackgroundSettings;
  };
}
