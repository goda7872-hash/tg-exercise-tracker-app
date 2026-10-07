"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/date-utils";
import { WEIGHT_UNIT } from "@/lib/constants";
import { ProgressChart } from "./progress-chart";

export function ProgressPanel({ blockId }: { blockId: string }) {
  const [report, setReport] = useState<any>(null);
  const [exerciseId, setExerciseId] = useState("");
  const [metric, setMetric] = useState<"weight" | "reps" | "rpe">("weight");
  const [progress, setProgress] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setReport(null);
    setProgress(null);
    setExerciseId("");
    setError("");
    api<any>(`/api/v1/analytics/cycle-report?blockId=${blockId}`)
      .then((r) => {
        setReport(r);
        if (r.exercises[0]) setExerciseId(r.exercises[0].id);
      })
      .catch((e) => setError(e.message));
  }, [blockId]);

  useEffect(() => {
    if (!exerciseId) return;
    api<any>(`/api/v1/analytics/progress?blockId=${blockId}&exerciseId=${exerciseId}&metric=${metric}`)
      .then(setProgress)
      .catch((e) => setError(e.message));
  }, [blockId, exerciseId, metric]);

  if (error) return <p className="text-tg-danger text-sm">{error}</p>;
  if (!report) return <div className="spinner" />;

  const unit = metric === "weight" ? WEIGHT_UNIT : metric === "reps" ? "reps" : "RPE";

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold">{report.blockName}</h2>
        <p className="text-sm text-tg-text-secondary mt-1">
          {report.clientName} · {formatDate(report.startDate)} → {formatDate(report.actualEndDate ?? report.expectedEndDate)} · {report.status}
        </p>
        <p className="mt-4 text-sm">
          Adherence: <span className="font-bold text-tg-orange">{report.adherence.percent}%</span>{" "}
          <span className="text-tg-text-secondary">
            ({report.adherence.completedDays}/{report.adherence.trainingDays} training days)
          </span>
        </p>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <select className="input max-w-xs" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            {report.exercises.map((x: any) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
          <select className="input max-w-[10rem]" value={metric} onChange={(e) => setMetric(e.target.value as any)}>
            <option value="weight">Top weight</option>
            <option value="reps">Top reps</option>
            <option value="rpe">Avg RPE</option>
          </select>
        </div>
        <ProgressChart data={progress?.weekly ?? []} unit={unit} />
        {progress?.summary && (
          <p className="text-sm text-tg-text-secondary mt-3">
            {progress.summary.first} → {progress.summary.last} {unit} ({progress.summary.change >= 0 ? "+" : ""}
            {progress.summary.change}) · best {progress.summary.best}
          </p>
        )}
      </div>

      <div className="card overflow-x-auto">
        <h3 className="font-bold mb-3">Cycle report</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-tg-text-secondary">
              <th className="py-2 pr-4">Exercise</th>
              <th className="py-2 pr-4">Start ({WEIGHT_UNIT})</th>
              <th className="py-2 pr-4">Latest ({WEIGHT_UNIT})</th>
              <th className="py-2 pr-4">Change</th>
            </tr>
          </thead>
          <tbody>
            {report.exercises.map((x: any) => (
              <tr key={x.id} className="border-t border-tg-border">
                <td className="py-2 pr-4">{x.name}</td>
                <td className="py-2 pr-4">{x.startWeight ?? "—"}{x.startReps != null ? ` × ${x.startReps}` : ""}</td>
                <td className="py-2 pr-4">{x.endWeight ?? "—"}{x.endReps != null ? ` × ${x.endReps}` : ""}</td>
                <td className="py-2 pr-4 text-tg-orange">
                  {x.weightChangePct == null ? "—" : `${x.weightChangePct > 0 ? "+" : ""}${x.weightChangePct}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
