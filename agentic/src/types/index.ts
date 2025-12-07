export type PromptMode = "text" | "image" | "multimodal";

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  tags: string[];
  modality: ("text" | "vision" | "audio" | "video")[];
}

export interface MetricScores {
  clarity: number;
  relevance: number;
  accuracy: number;
  depth: number;
  safety: number;
}

export interface ModelResponse {
  modelId: string;
  content: string;
  supportingPoints: string[];
  modalityNotes: string;
  overallScore: number;
  metrics: MetricScores;
}

export interface CrossEvaluation {
  evaluatorId: string;
  targetId: string;
  metrics: MetricScores;
  overall: number;
  commentary: string;
}

export interface LeaderboardEntry {
  modelId: string;
  aggregateScore: number;
  ownScore: number;
  crossScore: number;
}

export interface GeminiVerdict {
  orderedModelIds: string[];
  commentary: string;
}
