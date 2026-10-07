"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/date-utils";
import { ProgressPanel } from "@/components/progress-panel";

export default function CoachAnalytics() {
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState("");
  const [blocks, setBlocks] = useState<any[]>([]);
  const [blockId, setBlockId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<any[]>("/api/v1/clients")
      .then((c) => {
        setClients(c);
        if (c[0]) setClientId(c[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!clientId) return;
    setBlocks([]);
    setBlockId("");
    api<any[]>(`/api/v1/blocks?clientId=${clientId}`)
      .then((b) => {
        setBlocks(b);
        if (b[0]) setBlockId(b[0].id);
      })
      .catch((e) => setError(e.message));
  }, [clientId]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
      {error && <p className="text-tg-danger mb-4">{error}</p>}
      <div className="flex flex-wrap gap-3 mb-6">
        <select className="input max-w-xs" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.user.name || c.user.email}</option>)}
        </select>
        <select className="input max-w-xs" value={blockId} onChange={(e) => setBlockId(e.target.value)}>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>{b.template.name} · {formatDate(b.startDate)} ({b.status})</option>
          ))}
        </select>
      </div>
      {blockId ? <ProgressPanel blockId={blockId} /> : <div className="card text-center text-tg-text-secondary">No programs to show.</div>}
    </div>
  );
}
