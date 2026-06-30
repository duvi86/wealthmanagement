// ============================================================================
// Config Types
// ============================================================================

export interface AppSettings {
  app_version: string;
  data_source: string;
  chatbot_mode: string;
  fte_story_points_rate: number;
}

export interface ConfigResponse {
  app_settings: AppSettings;
}

// ============================================================================
// Capacity Types
// ============================================================================

export interface CapacityInput {
  milestone_date: string;
  fte_next_milestone: number;
  story_points_owner: number;
  story_points_supporting: Record<string, number>;
}

export interface CapacityResult {
  rag_status: "red" | "amber" | "green" | null;
  at_risk: boolean;
}
