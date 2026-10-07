"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate, toISODate } from "@/lib/date-utils";

const statusStyle = (status: string) => {
  switch (status) {
    case "SUBMITTED":
    case "LOCKED":
      return "bg-tg-success/10 text-tg-success border-tg-success/30";
    case "IN_PROGRESS":
      return "bg-tg-orange/10 text-tg-orange border-tg-orange/30";
    default:
      return "bg-tg-gray/20 text-tg-text border-tg-border";
  }
};

export default function ClientDashboard() {
  const [block, setBlock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const me = await api<any>("/api/v1/clients");
        const active = me?.assignedBlocks?.[0];
        if (active) setBlock(await api(`/api/v1/blocks/${active.id}`));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const currentWeek = block?.weeks.find(
    (w: any) => toISODate(w.scheduledStartDate) <= today && today <= toISODate(w.scheduledEndDate)
  )?.weekNumber;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {error && <p className="text-tg-danger mb-4">{error}</p>}
      {loading ? (
        <div className="text-center py-12"><div className="spinner" /></div>
      ) : !block ? (
        <div className="card p-12 text-center">
          <p className="text-tg-text-secondary">No active workout program assigned yet.</p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1">{block.template.name}</h1>
            <p className="text-tg-text-secondary">
              {currentWeek ? `Week ${currentWeek} of ${block.weeks.length}` : `${block.weeks.length} weeks`}
            </p>
          </div>
          <div className="space-y-6">
            {block.weeks.map((week: any) => (
              <div key={week.id} className={`card p-0 overflow-hidden ${week.weekNumber === currentWeek ? "border-tg-orange" : ""}`}>
                <div className="bg-tg-orange px-6 py-3">
                  <h2 className="text-lg font-bold text-tg-black">Week {week.weekNumber}</h2>
                </div>
                <div className="grid gap-3 p-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {week.days.map((day: any) =>
                    day.isRestDay ? (
                      <div key={day.id} className="p-4 rounded-lg border border-tg-border text-tg-text-secondary">
                        <h3 className="font-semibold">{day.dayName}</h3>
                        <p className="text-xs mt-2">Rest day · {formatDate(day.scheduledDate)}</p>
                      </div>
                    ) : (
                      <Link
                        key={day.id}
                        href={`/dashboard/client/workouts/${day.id}`}
                        className={`p-4 rounded-lg border-2 transition-all hover:border-tg-orange ${statusStyle(day.status)}`}
                      >
                        <h3 className="font-semibold text-tg-text">{day.dayName}</h3>
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(day.scheduledDate)}</span>
                          <span>{day.status.replace("_", " ")}</span>
                        </div>
                      </Link>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
