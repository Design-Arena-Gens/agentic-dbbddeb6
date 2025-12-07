"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useMemo } from "react";
import clsx from "clsx";
import type { ModelOption } from "@/types";

interface ModelSelectorProps {
  models: ModelOption[];
  selectedIds: string[];
  onToggle: (modelId: string) => void;
  maxSelections?: number;
}

export function ModelSelector({
  models,
  selectedIds,
  onToggle,
  maxSelections = 5,
}: ModelSelectorProps) {
  const quotaReached = selectedIds.length >= maxSelections;

  const availableModels = useMemo(() => {
    return models.sort((a, b) => a.name.localeCompare(b.name));
  }, [models]);

  return (
    <section className="card grid" aria-labelledby="model-selection">
      <header>
        <p id="model-selection" className="sectionTitle">
          Model Roster
        </p>
        <div className="flexRow" aria-live="polite">
          <span className="badge badgePrimary">
            {selectedIds.length} / {maxSelections} selected
          </span>
          {quotaReached ? (
            <span className="badge badgeNeutral">
              Maximum reached. Deselect one to switch.
            </span>
          ) : null}
        </div>
      </header>
      <div className="grid" style={{ gap: "0.9rem" }}>
        {availableModels.map((model) => {
          const isSelected = selectedIds.includes(model.id);
          const disabled = !isSelected && quotaReached;
          return (
            <button
              key={model.id}
              type="button"
              className={clsx("card", "cardInteractive", {
                cardInteractiveSelected: isSelected,
              })}
              style={{
                background: isSelected
                  ? "rgba(14, 165, 233, 0.2)"
                  : "rgba(15, 23, 42, 0.55)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                border: isSelected
                  ? "1px solid rgba(14, 165, 233, 0.75)"
                  : "1px solid rgba(148, 163, 184, 0.25)",
                padding: "1.05rem 1.2rem",
              }}
              onClick={() => {
                if (disabled) return;
                onToggle(model.id);
              }}
            >
              <div className="flexRow" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  {isSelected ? (
                    <CheckCircle2 size={22} color="#38bdf8" />
                  ) : (
                    <Circle size={22} color="rgba(148, 163, 184, 0.7)" />
                  )}
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "1.05rem" }}>{model.name}</p>
                    <p style={{ color: "rgba(226,232,240,0.65)", fontSize: "0.9rem" }}>
                      {model.provider} • {model.modality.join(" / ")}
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {model.tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
