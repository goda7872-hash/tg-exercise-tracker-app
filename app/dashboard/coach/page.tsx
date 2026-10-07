"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { api } from "@/lib/api-client";

export default function CoachDashboard() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setClients(await api<any[]>("/api/v1/clients"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError("");
    try {
      await api("/api/v1/clients", { method: "POST", body: JSON.stringify({ email }) });
      setEmail("");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-1">My clients</h1>
      <p className="text-tg-text-secondary mb-6">Invite a client by the Google email they will sign in with.</p>

      <div className="card mb-8">
        <form onSubmit={invite} className="flex flex-col sm:flex-row gap-3">
          <input type="email" required className="input flex-1" placeholder="client@gmail.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" disabled={inviting} className="btn-primary"><Plus size={18} /> Invite</button>
        </form>
        {error && <p className="text-tg-danger text-sm mt-3">{error}</p>}
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="spinner" /></div>
      ) : !clients.length ? (
        <div className="card p-12 text-center text-tg-text-secondary">No clients yet</div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <div key={c.id} className="card hover:border-tg-orange transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-tg-orange/20 border border-tg-orange flex items-center justify-center">
                  <span className="text-lg font-bold text-tg-orange">
                    {(c.user.name || c.user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.user.name || "Invited (not signed in yet)"}</p>
                  <p className="text-xs text-tg-text-secondary truncate">{c.user.email}</p>
                </div>
              </div>
              <div className="bg-tg-black rounded-lg p-3 mb-4 border border-tg-border">
                <p className="text-xs text-tg-text-secondary mb-1">Active block</p>
                <p className="text-sm font-medium text-tg-orange">
                  {c.assignedBlocks[0] ? c.assignedBlocks[0].template.name : "None"}
                </p>
              </div>
              <Link href={`/dashboard/coach/clients/${c.id}`} className="btn-primary w-full">
                <Eye size={16} /> View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
