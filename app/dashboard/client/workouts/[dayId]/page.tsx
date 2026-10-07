"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/date-utils";
import { WEIGHT_UNIT } from "@/lib/constants";

type SetForm = { weight: string; reps: string; rpe: string; isSkipped: boolean };
type CardioForm = { duration: string; speed: string; distance: string };

const toNum = (v: string) => (v.trim() === "" ? null : Number(v));
const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

export default function WorkoutPage({ params }: { params: { dayId: string } }) {
  const router = useRouter();
  const [day, setDay] = useState<any>(null);
  const [form, setForm] = useState<Record<string, SetForm>>({});
  const [cardio, setCardio] = useState<Record<number, CardioForm>>({});
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const d = await api<any>(`/api/v1/days/${params.dayId}`);
        const f: Record<string, SetForm> = {};
        for (const ex of d.exercises) {
          for (const s of ex.sets) {
            f[s.id] = {
              // Saved values win; otherwise suggest last week's weight.
              weight: s.logged ? str(s.logged.weight) : str(s.carryoverWeight),
              reps: str(s.logged?.reps),
              rpe: str(s.logged?.rpe),
              isSkipped: !!s.logged?.isSkipped,
            };
          }
        }
        const c: Record<number, CardioForm> = {};
        for (const x of d.cardio) {
          c[x.exerciseOrder] = {
            duration: str(x.logged?.duration),
            speed: str(x.logged?.speed),
            distance: str(x.logged?.distance),
          };
        }
        setDay(d);
        setForm(f);
        setCardio(c);
        setNote(d.note ?? "");
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.dayId]);

  const patchSet = (id: string, patch: Partial<SetForm>) =>
    setForm((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  const patchCardio = (order: number, patch: Partial<CardioForm>) =>
    setCardio((p) => ({ ...p, [order]: { ...p[order], ...patch } }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Only sets with reps (or skipped) count as done, so suggested weights alone aren't logged.
      const sets = Object.entries(form)
        .filter(([, v]) => v.isSkipped || v.reps.trim() !== "")
        .map(([id, v]) => ({
          assignedSetId: id,
          weight: v.isSkipped ? null : toNum(v.weight),
          reps: v.isSkipped ? null : toNum(v.reps),
          rpe: toNum(v.rpe),
          isSkipped: v.isSkipped,
        }));
      const cardioPayload = Object.entries(cardio)
        .map(([order, v]) => ({
          exerciseOrder: Number(order),
          duration: toNum(v.duration),
          speed: toNum(v.speed),
          distance: toNum(v.distance),
        }))
        .filter((c) => c.duration !== null || c.speed !== null || c.distance !== null);

      await api(`/api/v1/days/${params.dayId}/submit`, {
        method: "POST",
        body: JSON.stringify({ sets, cardio: cardioPayload, dayNotes: note || undefined }),
      });
      router.push("/dashboard/client");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-24"><div className="spinner" /></div>;
  if (!day) return <p className="text-center py-12 text-tg-danger">{error || "Workout not found"}</p>;

  const readOnly = !day.canEdit;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/dashboard/client" className="inline-flex items-center gap-1 text-tg-orange mb-4">
        <ChevronLeft size={20} /> Back
      </Link>
      <h1 className="text-3xl font-bold">{day.dayName}</h1>
      <p className="text-tg-text-secondary mt-1 mb-6">{formatDate(day.scheduledDate)}</p>

      {day.status === "LOCKED" && (
        <p className="mb-4 p-3 rounded-lg bg-tg-gray text-sm">This day was locked by your coach.</p>
      )}
      {error && <p className="mb-4 text-tg-danger text-sm">{error}</p>}

      <form onSubmit={submit} className="space-y-6">
        {day.exercises.map((ex: any) => (
          <div key={ex.blockExerciseId} className="card">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-bold">{ex.name}</h2>
              <span className="text-xs text-tg-text-secondary">
                {ex.targetSets} × {ex.targetReps || "—"}
              </span>
            </div>
            <div className="space-y-2">
              {ex.sets.map((s: any) => {
                const v = form[s.id];
                if (!v) return null;
                return (
                  <div key={s.id} className="grid grid-cols-[2rem_1fr_1fr_4.5rem_auto] gap-2 items-end">
                    <span className="pb-2 text-sm font-bold text-tg-orange">{s.setNumber}</span>
                    <div>
                      <label className="label">{WEIGHT_UNIT}</label>
                      <input className="input" type="number" inputMode="decimal" step="0.5" min="0" disabled={readOnly || v.isSkipped}
                        value={v.weight} onChange={(e) => patchSet(s.id, { weight: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Reps</label>
                      <input className="input" type="number" inputMode="numeric" step="1" min="0" disabled={readOnly || v.isSkipped}
                        value={v.reps} onChange={(e) => patchSet(s.id, { reps: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">RPE</label>
                      <select className="input" disabled={readOnly || v.isSkipped} value={v.rpe}
                        onChange={(e) => patchSet(s.id, { rpe: e.target.value })}>
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <label className="pb-2 text-xs flex items-center gap-1 text-tg-text-secondary">
                      <input type="checkbox" disabled={readOnly} checked={v.isSkipped}
                        onChange={(e) => patchSet(s.id, { isSkipped: e.target.checked })} /> Skip
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {day.cardio.map((c: any) => {
          const v = cardio[c.exerciseOrder];
          if (!v) return null;
          return (
            <div key={c.exerciseOrder} className="card">
              <h2 className="text-lg font-bold mb-3">{c.name}</h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Minutes</label>
                  <input className="input" type="number" inputMode="numeric" step="1" min="0" disabled={readOnly}
                    value={v.duration} onChange={(e) => patchCardio(c.exerciseOrder, { duration: e.target.value })} />
                </div>
                <div>
                  <label className="label">Speed (km/h)</label>
                  <input className="input" type="number" inputMode="decimal" step="0.1" min="0" disabled={readOnly}
                    value={v.speed} onChange={(e) => patchCardio(c.exerciseOrder, { speed: e.target.value })} />
                </div>
                <div>
                  <label className="label">Distance (km)</label>
                  <input className="input" type="number" inputMode="decimal" step="0.01" min="0" disabled={readOnly}
                    value={v.distance} onChange={(e) => patchCardio(c.exerciseOrder, { distance: e.target.value })} />
                </div>
              </div>
            </div>
          );
        })}

        <div className="card">
          <h2 className="text-lg font-bold mb-3">Notes (optional)</h2>
          <textarea className="input" rows={4} maxLength={1000} disabled={readOnly} value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How did it feel? Any pain or notes for your coach?" />
          <p className="text-xs text-tg-text-secondary mt-1">{note.length}/1000</p>
        </div>

        {!readOnly && (
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">
              <Send size={18} /> {saving ? "Saving…" : day.status === "SUBMITTED" ? "Update workout" : "Submit workout"}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-ghost">Cancel</button>
          </div>
        )}
      </form>
    </div>
  );
}
