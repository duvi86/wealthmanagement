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
// OKR Types
// ============================================================================

export interface Initiative {
  id: number;
  title: string;
  progress: number;
}

export interface KeyResult {
  id: number;
  title: string;
  progress: number;
  initiatives: Initiative[];
}

export interface Objective {
  id: number;
  title: string;
  progress: number;
  key_results: KeyResult[];
}

export interface OkrStructureResponse {
  objectives: Objective[];
}

// ============================================================================
// Dependency Types
// ============================================================================

export interface Dependency {
  id: number;
  source_kr_id: number;
  target_id: number;
  target_type: "key_result" | "objective" | "initiative";
  relationship_type: "positive" | "negative";
  dependency_weight: number;
  target_title?: string;
  target_progress?: number;
}

export interface DependenciesResponse {
  source_kr_id: number;
  dependencies: Dependency[];
}

export interface DependentProgressResponse {
  source_kr_id: number;
  dependent_progress: number | null;
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

// ============================================================================
// Chatbot Types
// ============================================================================

export interface ChatRequest {
  message: string;
  context?: Record<string, unknown>;
}

export interface ChatResponse {
  response: string;
  sources?: string[];
}
