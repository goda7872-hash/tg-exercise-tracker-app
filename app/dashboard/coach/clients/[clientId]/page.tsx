"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Lock, Unlock } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/date-utils";

export default function ClientDetail({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const [client, setClient] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [block, setBlock] = useState<any>(null);
  const [templateId, setTemplateId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([
        api<any>(`/api/v1/clients/${clientId}`),
        api<any[]>("/api/v1/templates"),
      ]);
      setClient(c);
      setTemplates(t);
      if (t[0]) setTemplateId((prev) => prev || t[0].id);
      const open = c.assignedBlocks.find((b: any) => b.status === "ACTIVE" || b.status === "PAUSED");
      setBlock(open ? await api(`/api/v1/blocks/${open.id}`) : null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const assign = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => api("/api/v1/blocks", { method: "POST", body: JSON.stringify({ clientId, templateId, startDate }) }));
  };
  const setStatus = (status: string) =>
    run(() => api(`/api/v1/blocks/${block.id}`, { method: "PATCH", body: JSON.stringify({ status }) }));
  const toggleLock = (day: any) =>
    run(() => api(`/api/v1/days/${day.id}`, { method: "PATCH", body: JSON.stringify({ locked: day.status !== "LOCKED" }) }));

  if (!client) return <div className="text-center py-24">{error ? <p className="text-tg-danger">{error}</p> : <div className="spinner" />}</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/dashboard/coach" className="inline-flex items-center gap-1 text-tg-orange mb-4">
        <ChevronLeft size={20} /> Clients
      </Link>
      <h1 className="text-3xl font-bold">{client.user.name || client.user.email}</h1>
      <p className="text-tg-text-secondary mb-6">{client.user.email}</p>
      {error && <p className="text-tg-danger text-sm mb-4">{error}</p>}

      {!block ? (
        <form onSubmit={assign} className="card space-y-4">
          <h2 className="text-lg font-bold">Assign a program</h2>
          {!templates.length ? (
            <p className="text-sm text-tg-text-secondary">
              Create a template first in <Link className="text-tg-orange underline" href="/dashboard/coach/templates">Templates</Link>.
            </p>
          ) : (
            <>
              <div>
                <label className="label">Template</label>
                <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.durationWeeks} wks)</option>)}
                </select>
              </div>
              <div>
                <label className="label">Start date</label>
                <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <button className="btn-primary" disabled={busy}>Assign</button>
            </>
          )}
        </form>
      ) : (
        <div className="space-y-6">
          <div className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{block.template.name}</h2>
              <p className="text-sm text-tg-text-secondary">
                {formatDate(block.startDate)} → {formatDate(block.expectedEndDate)} · {block.status}
              </p>
            </div>
            <div className="flex gap-2">
              {block.status === "ACTIVE" ? (
                <button className="btn-ghost" disabled={busy} onClick={() => setStatus("PAUSED")}>Pause</button>
              ) : (
                <button className="btn-ghost" disabled={busy} onClick={() => setStatus("ACTIVE")}>Resume</button>
              )}
              <button className="btn-primary" disabled={busy} onClick={() => confirm("Mark this block as completed?") && setStatus("COMPLETED")}>Complete</button>
              <button className="btn-danger" disabled={busy} onClick={() => confirm("Cancel this block?") && setStatus("CANCELLED")}>Cancel</button>
            </div>
          </div>

          {block.weeks.map((w: any) => (
            <div key={w.id} className="card">
              <h3 className="font-bold mb-3">Week {w.weekNumber}</h3>
              <div className="divide-y divide-tg-border">
                {w.days.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{d.dayName} <span className="text-tg-text-secondary">· {formatDate(d.scheduledDate)}</span></span>
                    {d.isRestDay ? (
                      <span className="text-tg-text-secondary">Rest</span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <span className={d.status === "SUBMITTED" || d.status === "LOCKED" ? "text-tg-success" : "text-tg-text-secondary"}>{d.status}</span>
                        <button className="btn-ghost px-2 py-1" disabled={busy} onClick={() => toggleLock(d)} title={d.status === "LOCKED" ? "Unlock" : "Lock"}>
                          {d.status === "LOCKED" ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
