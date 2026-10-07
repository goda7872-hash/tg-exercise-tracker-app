"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";

type Ex = { exerciseMasterId: string; targetSets: number; targetReps: string };
type DayDraft = { dayName: string; exercises: Ex[] };

export default function TemplatesPage() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [days, setDays] = useState<DayDraft[]>([{ dayName: "Day 1", exercises: [] }]);
  const [newEx, setNewEx] = useState({ name: "", category: "STRENGTH" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [e, t] = await Promise.all([api<any[]>("/api/v1/exercises"), api<any[]>("/api/v1/templates")]);
      setExercises(e);
      setTemplates(t);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patchDay = (i: number, patch: Partial<DayDraft>) =>
    setDays((d) => d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const patchEx = (i: number, j: number, patch: Partial<Ex>) =>
    patchDay(i, { exercises: days[i].exercises.map((e, k) => (k === j ? { ...e, ...patch } : e)) });
  const addEx = (i: number) => {
    if (!exercises.length) return;
    patchDay(i, { exercises: [...days[i].exercises, { exerciseMasterId: exercises[0].id, targetSets: 3, targetReps: "8-12" }] });
  };
  const removeEx = (i: number, j: number) => patchDay(i, { exercises: days[i].exercises.filter((_, k) => k !== j) });

  const addLibraryExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api("/api/v1/exercises", { method: "POST", body: JSON.stringify(newEx) });
      setNewEx({ name: "", category: newEx.category });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/api/v1/templates", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || undefined,
          durationWeeks: weeks,
          days: days.map((d) => ({
            dayName: d.dayName,
            exercises: d.exercises.map((x) => ({
              exerciseMasterId: x.exerciseMasterId,
              targetSets: x.targetSets,
              targetReps: x.targetReps || undefined,
            })),
          })),
        }),
      });
      setName("");
      setDescription("");
      setDays([{ dayName: "Day 1", exercises: [] }]);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">Templates</h1>
      {error && <p className="text-tg-danger text-sm">{error}</p>}

      <form onSubmit={addLibraryExercise} className="card flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="label">Add exercise to library</label>
          <input className="input" required placeholder="e.g. Incline Dumbbell Press" value={newEx.name}
            onChange={(e) => setNewEx({ ...newEx, name: e.target.value })} />
        </div>
        <select className="input sm:w-48" value={newEx.category} onChange={(e) => setNewEx({ ...newEx, category: e.target.value })}>
          <option value="STRENGTH">Strength</option>
          <option value="CARDIO">Cardio</option>
          <option value="MOBILITY">Mobility</option>
          <option value="CONDITIONING">Conditioning</option>
        </select>
        <button className="btn-primary"><Plus size={16} /> Add</button>
      </form>

      <form onSubmit={save} className="card space-y-5">
        <h2 className="text-lg font-bold">New template</h2>
        <p className="text-xs text-tg-text-secondary">
          Build one week. It repeats for every week of the block. A day with no exercises is a rest day.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Weeks</label>
            <input className="input" type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(Number(e.target.value) || 1)} />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {days.map((d, i) => (
          <div key={i} className="border border-tg-border rounded-lg p-4 space-y-3">
            <div className="flex gap-2">
              <input className="input" value={d.dayName} onChange={(e) => patchDay(i, { dayName: e.target.value })} />
              <button type="button" className="btn-danger" onClick={() => setDays(days.filter((_, k) => k !== i))} disabled={days.length === 1}>
                <Trash2 size={16} />
              </button>
            </div>
            {d.exercises.map((x, j) => (
              <div key={j} className="grid grid-cols-[1fr_4rem_5rem_auto] gap-2">
                <select className="input" value={x.exerciseMasterId} onChange={(e) => patchEx(i, j, { exerciseMasterId: e.target.value })}>
                  {exercises.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input className="input" type="number" min={1} max={20} title="Sets" value={x.targetSets}
                  onChange={(e) => patchEx(i, j, { targetSets: Number(e.target.value) || 1 })} />
                <input className="input" placeholder="Reps" value={x.targetReps} onChange={(e) => patchEx(i, j, { targetReps: e.target.value })} />
                <button type="button" className="btn-ghost px-2" onClick={() => removeEx(i, j)}><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" className="btn-ghost" onClick={() => addEx(i)} disabled={!exercises.length}>
              <Plus size={14} /> Exercise
            </button>
          </div>
        ))}

        <div className="flex gap-3">
          <button type="button" className="btn-ghost" disabled={days.length >= 7}
            onClick={() => setDays([...days, { dayName: `Day ${days.length + 1}`, exercises: [] }])}>
            <Plus size={14} /> Day
          </button>
          <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save template"}</button>
        </div>
      </form>

      <div className="card">
        <h2 className="text-lg font-bold mb-3">Your templates</h2>
        {!templates.length ? (
          <p className="text-sm text-tg-text-secondary">None yet.</p>
        ) : (
          <ul className="divide-y divide-tg-border">
            {templates.map((t) => (
              <li key={t.id} className="py-2 text-sm flex justify-between">
                <span>{t.name}</span>
                <span className="text-tg-text-secondary">{t.durationWeeks} weeks</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
