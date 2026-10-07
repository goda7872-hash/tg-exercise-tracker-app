"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/date-utils";
import { ProgressPanel } from "@/components/progress-panel";

export default function ClientProgress() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [blockId, setBlockId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<any[]>("/api/v1/blocks")
      .then((b) => {
        setBlocks(b);
        if (b[0]) setBlockId(b[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My progress</h1>
      {error && <p className="text-tg-danger mb-4">{error}</p>}
      {loading ? (
        <div className="spinner" />
      ) : !blocks.length ? (
        <div className="card text-center text-tg-text-secondary">No programs yet.</div>
      ) : (
        <div className="space-y-6">
          <select className="input max-w-sm" value={blockId} onChange={(e) => setBlockId(e.target.value)}>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.template.name} · {formatDate(b.startDate)} ({b.status})
              </option>
            ))}
          </select>
          {blockId && <ProgressPanel blockId={blockId} />}
        </div>
      )}
    </div>
  );
}
