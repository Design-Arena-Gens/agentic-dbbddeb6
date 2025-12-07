"use client";

import { useRef } from "react";
import type { PromptMode } from "@/types";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  mode: PromptMode;
  onModeChange: (mode: PromptMode) => void;
  onImageSelected: (file: File | null) => void;
  imagePreview?: string | null;
  imageName?: string | null;
}

const MODE_LABELS: { value: PromptMode; label: string; description: string }[] = [
  {
    value: "text",
    label: "Text",
    description: "Standard prompt focusing on language-only reasoning.",
  },
  {
    value: "image",
    label: "Image",
    description: "Single image prompt. Text field can carry instructions.",
  },
  {
    value: "multimodal",
    label: "Multimodal",
    description:
      "Blend text with image context for richer evaluation scenarios.",
  },
];

export function PromptInput({
  value,
  onChange,
  mode,
  onModeChange,
  onImageSelected,
  imagePreview,
  imageName,
}: PromptInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="card grid" aria-labelledby="prompt-config">
      <header>
        <p className="sectionTitle" id="prompt-config">
          Prompt Configuration
        </p>
        <p className="cardSubtitle">
          Craft a prompt and modality target. Optionally attach a reference image
          to stress-test multimodal reasoning.
        </p>
      </header>
      <div className="grid" style={{ gap: "1.25rem" }}>
        <div>
          <p className="fieldLabel">Prompt Modality</p>
          <div className="grid" style={{ gap: "0.75rem" }}>
            {MODE_LABELS.map((modeOption) => {
              const isActive = modeOption.value === mode;
              return (
                <button
                  key={modeOption.value}
                  type="button"
                  className={`card cardInteractive ${isActive ? "cardInteractiveSelected" : ""}`}
                  style={{
                    padding: "0.9rem 1rem",
                    border: isActive
                      ? "1px solid rgba(14, 165, 233, 0.75)"
                      : "1px solid rgba(148, 163, 184, 0.3)",
                    background: isActive
                      ? "rgba(14, 165, 233, 0.22)"
                      : "rgba(15, 23, 42, 0.55)",
                    textAlign: "left",
                  }}
                  onClick={() => onModeChange(modeOption.value)}
                >
                  <p style={{ fontWeight: 600, fontSize: "1rem" }}>{modeOption.label}</p>
                  <p style={{ color: "rgba(226,232,240,0.7)", fontSize: "0.9rem" }}>
                    {modeOption.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="fieldLabel">Prompt Body</p>
          <textarea
            className="textarea"
            placeholder="Describe the scenario or test case you want each model to solve..."
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
        {mode !== "text" ? (
          <div>
            <p className="fieldLabel">Attach Reference Image</p>
            <div className="card" style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  onImageSelected(file);
                }}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="buttonPrimary"
                style={{ justifySelf: "start" }}
                onClick={() => fileInputRef.current?.click()}
              >
                {imageName ? "Replace image" : "Upload image"}
              </button>
              {imageName ? (
                <div className="chip" style={{ justifyContent: "space-between", width: "100%" }}>
                  <span>{imageName}</span>
                  <button
                    type="button"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(148, 163, 184, 0.9)",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                      onImageSelected(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p style={{ color: "rgba(226,232,240,0.6)", fontSize: "0.9rem" }}>
                  PNG, JPG, or WebP up to 5MB. We store the file locally for this
                  comparison only.
                </p>
              )}
              {imagePreview ? (
                <div
                  style={{
                    borderRadius: "1rem",
                    overflow: "hidden",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    maxWidth: "360px",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Prompt reference preview"
                    style={{ width: "100%", display: "block" }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
