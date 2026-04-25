import { type Objective, type KeyResult } from "@/lib/types";

import { ProgressBar, RagIndicator } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";

type ObjectiveCardProps = {
  objective: Objective;
};

type KeyResultCardProps = {
  keyResult: KeyResult;
};

function getRagStatus(progress: number): "green" | "amber" | "red" {
  if (progress >= 70) {
    return "green";
  }
  if (progress >= 40) {
    return "amber";
  }
  return "red";
}

function getTone(progress: number): "success" | "warning" | "error" {
  if (progress >= 70) {
    return "success";
  }
  if (progress >= 40) {
    return "warning";
  }
  return "error";
}

export function ObjectiveCard({ objective }: ObjectiveCardProps) {
  return (
    <article className="okr-objective-panel">
      <div className="okr-objective-top-row">
        <div>
          <p className="okr-card-label">Objective</p>
          <h2 className="okr-objective-title">{objective.title}</h2>
        </div>
        <RagIndicator status={getRagStatus(objective.progress)} />
      </div>
      <div className="okr-progress-block">
        <ProgressBar value={objective.progress} label="Objective progress" />
      </div>
      <div className="okr-kr-grid">
        {objective.key_results.map((keyResult) => (
          <KeyResultCard key={keyResult.id} keyResult={keyResult} />
        ))}
      </div>
    </article>
  );
}

export function KeyResultCard({ keyResult }: KeyResultCardProps) {
  return (
    <article className="okr-kr-card">
      <div className="okr-kr-header">
        <p className="okr-card-label">Key Result</p>
        <StatusPill tone={getTone(keyResult.progress)}>{keyResult.progress}%</StatusPill>
      </div>
      <h3 className="okr-kr-title">{keyResult.title}</h3>
      <ProgressBar value={keyResult.progress} showPercent={false} />
      <div className="okr-initiative-stack">
        {keyResult.initiatives.length > 0 ? (
          keyResult.initiatives.map((initiative) => (
            <div key={initiative.id} className="okr-initiative-chip">
              <div className="okr-initiative-title-row">
                <span className="okr-initiative-title">{initiative.title}</span>
                <span className="okr-initiative-progress">{initiative.progress}%</span>
              </div>
              <div className="okr-mini-track">
                <div
                  className="okr-mini-fill"
                  style={{ width: `${initiative.progress}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="okr-empty-note">No initiatives linked yet.</p>
        )}
      </div>
    </article>
  );
}