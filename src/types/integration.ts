export type IntegrationSyncStatus = "OK" | "PARTIAL" | "ERROR";

/** Estado agregado da última sync (factory_integration_state). */
export interface IntegrationState {
  sourceSystem: string;
  lastSuccessfulSyncAt?: string | null;
  lastAttemptAt?: string;
  status?: IntegrationSyncStatus;
  lastReceivedCount?: number;
  lastCreatedCount?: number;
  lastUpdatedCount?: number;
  lastErrorCount?: number;
}
