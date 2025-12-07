"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  Loader2,
  RefreshCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  CrossEvaluation,
  GeminiVerdict,
  LeaderboardEntry,
  ModelOption,
  ModelResponse,
  PromptMode,
} from "@/types";
import { ModelSelector } from "./components/ModelSelector";
import { PromptInput } from "./components/PromptInput";
import {
  computeLeaderboard,
  formatScore,
  generateCrossEvaluation,
  generateModelResponse,
  summariseAlignment,
  synthesiseGeminiVerdict,
} from "@/lib/scoring";

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "gpt4o",
    name: "GPT-4.1 Omni",
    provider: "OpenAI",
    tags: ["reasoning", "tools", "multimodal"],
    modality: ["text", "vision", "audio"],
  },
  {
    id: "claude3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    tags: ["analysis", "alignment", "orchestration"],
    modality: ["text", "vision"],
  },
  {
    id: "gemini-1.5",
    name: "Gemini 1.5 Pro",
    provider: "Google DeepMind",
    tags: ["reasoning", "multimodal", "long-context"],
    modality: ["text", "vision", "audio", "video"],
  },
  {
    id: "llama3-70b",
    name: "Llama 3 70B",
    provider: "Meta AI",
    tags: ["open", "fine-tuning", "deployable"],
    modality: ["text", "vision"],
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral AI",
    tags: ["europe", "balanced", "multilingual"],
    modality: ["text", "vision"],
  },
  {
    id: "qwen2-vl",
    name: "Qwen2 VL 72B",
    provider: "Alibaba Cloud",
    tags: ["vision-language", "instruction", "enterprise"],
    modality: ["text", "vision"],
  },
  {
    id: "idefics3",
    name: "Idefics 3",
    provider: "Hugging Face",
    tags: ["open", "vision", "creative"],
    modality: ["text", "vision"],
  },
];

const DEFAULT_PROMPT = `You are assisting a multidisciplinary innovation team exploring climate-resilient urban farming. Combine systems-level reasoning with tangible design suggestions. The response should include: (1) a comparative assessment of three candidate multimodal greenhouse layouts, (2) evaluation of potential failure modes under extreme weather events, (3) opportunities to incorporate community participation and sensing infrastructure.`;

interface ResultState {
  responses: ModelResponse[];
  crossEvaluations: CrossEvaluation[];
  leaderboard: LeaderboardEntry[];
  geminiVerdict: GeminiVerdict | null;
  topThree: string[];
}

const MAX_SELECTIONS = 5;
const MIN_MODELS = 4;

export default function HomePage() {
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([
    "gpt4o",
    "claude3-opus",
    "gemini-1.5",
    "llama3-70b",
  ]);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [mode, setMode] = useState<PromptMode>("multimodal");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDescriptor, setImageDescriptor] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [userChoice, setUserChoice] = useState<string | null>(null);
  const [alignment, setAlignment] = useState<ReturnType<typeof summariseAlignment> | null>(null);
  const [runCounter, setRunCounter] = useState(0);

  const selectedModels = useMemo(
    () =>
      MODEL_OPTIONS.filter((model) => selectedModelIds.includes(model.id)),
    [selectedModelIds],
  );

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleToggleModel = (modelId: string) => {
    setSelectedModelIds((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }
      if (prev.length >= MAX_SELECTIONS) {
        return prev;
      }
      return [...prev, modelId];
    });
  };

  const handleImageSelected = (file: File | null) => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (!file) {
      setImageFile(null);
      setImageDescriptor(null);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(previewUrl);
    const descriptor = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    setImageDescriptor(descriptor);
  };

  useEffect(() => {
    if (userChoice && result?.geminiVerdict) {
      setAlignment(summariseAlignment(result.geminiVerdict, userChoice));
    }
  }, [userChoice, result?.geminiVerdict]);

  const runEvaluation = () => {
    if (selectedModels.length < MIN_MODELS) {
      setErrorMessage(`Select at least ${MIN_MODELS} models to run a comparison.`);
      return;
    }
    if (!prompt.trim()) {
      setErrorMessage("Provide a prompt to evaluate.");
      return;
    }
    setErrorMessage(null);
    setIsProcessing(true);
    setUserChoice(null);
    setAlignment(null);

    const payloadSeed = `${prompt}|${mode}|${imageDescriptor ?? ""}|${runCounter}`;

    window.setTimeout(() => {
      const responses = selectedModels.map((model) =>
        generateModelResponse(model, prompt, mode, imageDescriptor ?? undefined),
      );
      const crossEvaluations: CrossEvaluation[] = [];
      selectedModels.forEach((evaluator) => {
        selectedModels.forEach((target) => {
          crossEvaluations.push(
            generateCrossEvaluation(evaluator, target, prompt, mode, payloadSeed),
          );
        });
      });
      const leaderboard = computeLeaderboard({
        responses,
        crossEvaluations,
      });
      const topThree = leaderboard.slice(0, 3).map((entry) => entry.modelId);
      const geminiVerdict = synthesiseGeminiVerdict(
        selectedModels,
        leaderboard,
        topThree,
        crossEvaluations,
      );

      setResult({ responses, crossEvaluations, leaderboard, geminiVerdict, topThree });
      setIsProcessing(false);
      setRunCounter((count) => count + 1);
    }, 280);
  };

  const formatModelName = (modelId: string) =>
    MODEL_OPTIONS.find((model) => model.id === modelId)?.name ?? modelId;

  return (
    <div className="grid" style={{ gap: "1.75rem" }}>
      <header className="card" style={{ padding: "2.2rem" }}>
        <div className="flexRow" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ maxWidth: "620px" }}>
            <span className="badge badgePrimary" style={{ marginBottom: "0.75rem" }}>
              Multimodal evaluation cockpit
            </span>
            <h1 style={{ fontSize: "2.45rem", fontWeight: 700, lineHeight: 1.1 }}>
              AI Prompt Testing & Model Ranking Arena
            </h1>
            <p className="cardSubtitle" style={{ marginTop: "0.75rem" }}>
              Spin up a head-to-head evaluation between leading multimodal models. We
              auto-generate synthetic peer review, shortlist the top three, and let
              Gemini-3-Pro publish the decisive ranking while you compare your own
              choice.
            </p>
          </div>
          <div className="card" style={{
            background: "rgba(14,116,144,0.22)",
            border: "1px solid rgba(14,165,233,0.4)",
            padding: "1.25rem",
            width: "260px",
          }}>
            <p className="fieldLabel" style={{ marginBottom: "0.75rem" }}>
              Run Checklist
            </p>
            <ul style={{ display: "grid", gap: "0.5rem", fontSize: "0.9rem", color: "rgba(226,232,240,0.75)" }}>
              <li>• Select 4-5 models</li>
              <li>• Pick prompt modality</li>
              <li>• Add prompt & optional media</li>
              <li>• Launch arena & review verdict</li>
            </ul>
          </div>
        </div>
      </header>

      <PromptInput
        value={prompt}
        onChange={setPrompt}
        mode={mode}
        onModeChange={setMode}
        onImageSelected={handleImageSelected}
        imagePreview={imagePreview}
        imageName={imageFile?.name ?? null}
      />

      <ModelSelector
        models={MODEL_OPTIONS}
        selectedIds={selectedModelIds}
        onToggle={handleToggleModel}
        maxSelections={MAX_SELECTIONS}
      />

      <section className="card grid" style={{ gap: "1.5rem" }}>
        <header className="flexRow" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="sectionTitle">Execution</p>
            <p className="cardSubtitle" style={{ marginBottom: 0 }}>
              Fan out prompts to each model, trigger synthetic cross-evaluation, and
              forward the finalists to Gemini-3-Pro.
            </p>
          </div>
          <div className="flexRow">
            <button
              type="button"
              className="buttonPrimary"
              onClick={runEvaluation}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 size={18} className="spin" />
              ) : (
                <Sparkles size={18} />
              )}
              {isProcessing ? "Running" : "Run full evaluation"}
            </button>
            {result ? (
              <button
                type="button"
                className="buttonPrimary"
                style={{ background: "rgba(148,163,184,0.2)", color: "rgba(226,232,240,0.8)" }}
                onClick={() => {
                  setPrompt(DEFAULT_PROMPT);
                  setMode("multimodal");
                  setSelectedModelIds([
                    "gpt4o",
                    "claude3-opus",
                    "gemini-1.5",
                    "llama3-70b",
                  ]);
                  handleImageSelected(null);
                  setResult(null);
                  setUserChoice(null);
                  setAlignment(null);
                }}
              >
                <RefreshCcw size={18} />
                Reset
              </button>
            ) : null}
          </div>
        </header>
        {errorMessage ? (
          <div
            className="card"
            style={{
              border: "1px solid rgba(248, 113, 113, 0.55)",
              background: "rgba(248, 113, 113, 0.1)",
              color: "#fecaca",
            }}
          >
            {errorMessage}
          </div>
        ) : null}
        {result ? (
          <EvaluationDeck
            result={result}
            selectedModels={selectedModels}
            onUserChoice={setUserChoice}
            userChoice={userChoice}
            alignment={alignment}
            formatModelName={formatModelName}
          />
        ) : (
          <div
            className="card"
            style={{
              textAlign: "center",
              color: "rgba(226,232,240,0.7)",
              padding: "3rem",
            }}
          >
            <p style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
              Configure your arena and launch the run to inspect comparative scoring.
            </p>
            <p style={{ fontSize: "0.9rem" }}>
              We synthesise structured responses and peer critique locally — no API keys
              required.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

interface EvaluationDeckProps {
  result: ResultState;
  selectedModels: ModelOption[];
  userChoice: string | null;
  onUserChoice: (modelId: string) => void;
  alignment: ReturnType<typeof summariseAlignment> | null;
  formatModelName: (id: string) => string;
}

function EvaluationDeck({
  result,
  selectedModels,
  userChoice,
  onUserChoice,
  alignment,
  formatModelName,
}: EvaluationDeckProps) {
  const { responses, crossEvaluations, leaderboard, geminiVerdict, topThree } = result;
  const crossMatrix = buildMatrix(crossEvaluations, selectedModels);

  const topThreeNames = topThree.map((id) => formatModelName(id)).join(" → ");

  return (
    <div className="grid" style={{ gap: "1.5rem" }}>
      <article className="card" style={{ padding: "1.5rem" }}>
        <header className="flexRow" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="sectionTitle">Leaderboard</p>
            <p className="cardSubtitle" style={{ marginBottom: 0 }}>
              Aggregate scoring blends own response quality, peer review, and self
              reflection to surface the top trio.
            </p>
          </div>
          <div className="chip" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <Trophy size={18} color="#38bdf8" /> {topThreeNames}
          </div>
        </header>
        <table className="table" style={{ marginTop: "1rem" }}>
          <thead>
            <tr>
              <th style={{ width: "28%" }}>Model</th>
              <th>Own score</th>
              <th>Peer avg</th>
              <th>Self check</th>
              <th>Aggregate</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => {
              const response = responses.find((item) => item.modelId === entry.modelId);
              const selfReflection = crossEvaluations.find(
                (item) =>
                  item.evaluatorId === entry.modelId && item.targetId === entry.modelId,
              );
              return (
                <tr key={entry.modelId}>
                  <td>
                    <div className="flexRow" style={{ gap: "0.6rem" }}>
                      <span className="badge badgeNeutral">#{index + 1}</span>
                      <div>
                        <p style={{ fontWeight: 600 }}>{formatModelName(entry.modelId)}</p>
                        <p style={{ fontSize: "0.8rem", color: "rgba(226,232,240,0.6)" }}>
                          {response?.modalityNotes}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>{formatScore(entry.ownScore)}</td>
                  <td>{formatScore(entry.crossScore)}</td>
                  <td>{selfReflection ? formatScore(selfReflection.overall) : "-"}</td>
                  <td style={{ fontWeight: 600 }}>{entry.aggregateScore}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>

      <article className="card" style={{ padding: "1.5rem" }}>
        <header className="flexRow" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="sectionTitle">Cross-evaluation matrix</p>
            <p className="cardSubtitle" style={{ marginBottom: 0 }}>
              Each model reviews every other model&apos;s response to triangulate clarity,
              relevance, accuracy, depth, and safety.
            </p>
          </div>
        </header>
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table className="table" style={{ minWidth: "640px" }}>
            <thead>
              <tr>
                <th>Evaluator → Target</th>
                {selectedModels.map((model) => (
                  <th key={`header-${model.id}`}>{model.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedModels.map((rowModel) => (
                <tr key={`row-${rowModel.id}`}>
                  <td style={{ fontWeight: 600 }}>{rowModel.name}</td>
                  {selectedModels.map((colModel) => (
                    <td key={`${rowModel.id}-${colModel.id}`} style={{ verticalAlign: "top" }}>
                      <MatrixCell cell={crossMatrix[rowModel.id][colModel.id]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card" style={{ padding: "1.5rem" }}>
        <header className="flexRow" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="sectionTitle">Model narratives</p>
            <p className="cardSubtitle" style={{ marginBottom: 0 }}>
              Inspect the synthesised response summaries for each model to grasp how
              they address the prompt.
            </p>
          </div>
        </header>
        <div className="grid" style={{ gap: "1.25rem", marginTop: "1rem" }}>
          {responses.map((response) => (
            <div key={response.modelId} className="card" style={{ padding: "1.25rem" }}>
              <div className="flexRow" style={{ justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                    {formatModelName(response.modelId)}
                  </h3>
                  <p style={{ color: "rgba(226,232,240,0.6)", fontSize: "0.85rem" }}>
                    Aggregate score {formatScore(response.overallScore)} / 10
                  </p>
                </div>
                <span className="badge badgePrimary" style={{ alignSelf: "start" }}>
                  {response.supportingPoints.length} key points
                </span>
              </div>
              <p style={{ marginTop: "0.85rem", whiteSpace: "pre-line", lineHeight: 1.5 }}>
                {response.content}
              </p>
              <div className="divider" />
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem" }}>
                {Object.entries(response.metrics).map(([metric, score]) => (
                  <MetricBadge key={metric} metric={metric} score={score} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </article>

      {geminiVerdict ? (
        <article className="card" style={{ padding: "1.5rem" }}>
          <header className="flexRow" style={{ justifyContent: "space-between" }}>
            <div>
              <p className="sectionTitle">Gemini-3-Pro final ranking</p>
              <p className="cardSubtitle" style={{ marginBottom: 0 }}>
                We re-score the top trio via a dedicated Gemini-3-Pro arbiter and capture
                its reasoning summary.
              </p>
            </div>
            <Award size={32} color="#38bdf8" />
          </header>
          <div className="grid" style={{ gap: "1rem", marginTop: "1rem" }}>
            {geminiVerdict.orderedModelIds.map((modelId, index) => (
              <div
                key={`gemini-${modelId}`}
                className="card"
                style={{
                  border: index === 0 ? "1px solid rgba(14,165,233,0.7)" : "1px solid rgba(148,163,184,0.25)",
                  background: index === 0 ? "rgba(14,165,233,0.2)" : "rgba(15,23,42,0.55)",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p style={{ fontWeight: 600, fontSize: "1rem" }}>
                    #{index + 1} {formatModelName(modelId)}
                  </p>
                  <p style={{ color: "rgba(226,232,240,0.65)", fontSize: "0.85rem" }}>
                    Aggregate composite {index + 1 === 1 ? "winner" : "candidate"}
                  </p>
                </div>
                {index === 0 ? <Sparkles size={22} color="#f8fafc" /> : <ArrowRight size={20} color="rgba(148,163,184,0.8)" />}
              </div>
            ))}
          </div>
          <p style={{ marginTop: "1rem", color: "rgba(226,232,240,0.75)", fontSize: "0.95rem" }}>
            {geminiVerdict.commentary}
          </p>
        </article>
      ) : null}

      <article className="card" style={{ padding: "1.5rem" }}>
        <header className="flexRow" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="sectionTitle">Your call vs Gemini</p>
            <p className="cardSubtitle" style={{ marginBottom: 0 }}>
              Select the response you would deploy. We track agreement with the Gemini-3-Pro
              arbiter across runs.
            </p>
          </div>
        </header>
        <div className="grid" style={{ gap: "0.75rem", marginTop: "1rem" }}>
          {selectedModels.map((model) => {
            const isChosen = userChoice === model.id;
            const geminiTop = geminiVerdict?.orderedModelIds[0];
            return (
              <button
                key={`user-${model.id}`}
                type="button"
                className={`card cardInteractive ${isChosen ? "cardInteractiveSelected" : ""}`}
                style={{
                  padding: "1rem",
                  border: isChosen
                    ? "1px solid rgba(14,165,233,0.75)"
                    : "1px solid rgba(148,163,184,0.25)",
                  background: isChosen
                    ? "rgba(14,165,233,0.2)"
                    : "rgba(15,23,42,0.55)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onClick={() => onUserChoice(model.id)}
              >
                <div>
                  <p style={{ fontWeight: 600 }}>{model.name}</p>
                  <p style={{ color: "rgba(226,232,240,0.65)", fontSize: "0.85rem" }}>
                    {model.provider} • {model.modality.join(" / ")}
                  </p>
                </div>
                {geminiTop === model.id ? (
                  <span className="badge badgePrimary">Gemini pick</span>
                ) : null}
              </button>
            );
          })}
        </div>
        {userChoice ? (
          <div className="card" style={{ marginTop: "1rem", padding: "1rem", background: "rgba(15,23,42,0.75)" }}>
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              You voted for {formatModelName(userChoice)}
            </p>
            {alignment ? (
              <p style={{ color: "rgba(226,232,240,0.7)" }}>
                Alignment status: <strong style={{ color: "#38bdf8" }}>{alignment.alignment}</strong>
                {alignment.delta !== 999 ? ` (offset ${alignment.delta})` : ""}
              </p>
            ) : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}

interface MatrixCellProps {
  cell: CrossEvaluation | null;
}

function MatrixCell({ cell }: MatrixCellProps) {
  if (!cell) return <span style={{ color: "rgba(148,163,184,0.5)" }}>—</span>;
  const metricsEntries = Object.entries(cell.metrics);
  return (
    <div style={{ display: "grid", gap: "0.4rem" }}>
      <strong style={{ color: "#38bdf8" }}>{formatScore(cell.overall)}</strong>
      <div style={{
        display: "grid",
        gap: "0.2rem",
        fontSize: "0.75rem",
        color: "rgba(226,232,240,0.65)",
      }}>
        {metricsEntries.map(([metric, value]) => (
          <span key={metric}>
            {metric.charAt(0).toUpperCase() + metric.slice(1)} {formatScore(value)}
          </span>
        ))}
      </div>
      <p style={{ fontSize: "0.75rem", color: "rgba(226,232,240,0.6)" }}>{cell.commentary}</p>
    </div>
  );
}

interface MetricBadgeProps {
  metric: string;
  score: number;
}

function MetricBadge({ metric, score }: MetricBadgeProps) {
  return (
    <div className="card" style={{ padding: "0.65rem", background: "rgba(148,163,184,0.08)" }}>
      <p style={{ fontSize: "0.8rem", color: "rgba(226,232,240,0.65)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {metric}
      </p>
      <p style={{ fontWeight: 600, fontSize: "1rem" }}>{formatScore(score)}</p>
    </div>
  );
}

function buildMatrix(
  evaluations: CrossEvaluation[],
  models: ModelOption[],
): Record<string, Record<string, CrossEvaluation | null>> {
  const matrix: Record<string, Record<string, CrossEvaluation | null>> = {};
  models.forEach((row) => {
    matrix[row.id] = {};
    models.forEach((col) => {
      matrix[row.id][col.id] = null;
    });
  });
  evaluations.forEach((entry) => {
    if (!matrix[entry.evaluatorId]) matrix[entry.evaluatorId] = {} as Record<string, CrossEvaluation | null>;
    matrix[entry.evaluatorId][entry.targetId] = entry;
  });
  return matrix;
}
