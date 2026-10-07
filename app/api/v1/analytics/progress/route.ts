import { z } from "zod";
import { loadBlockForUser } from "@/lib/access";
import { getExerciseProgress } from "@/lib/services/analytics.service";
import { ok, requireUser, route } from "@/lib/api-handler";

const Query = z.object({
  blockId: z.string().min(1),
  exerciseId: z.string().min(1),
  metric: z.enum(["weight", "reps", "rpe"]).default("weight"),
});

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const sp = req.nextUrl.searchParams;
  const q = Query.parse({
    blockId: sp.get("blockId"),
    exerciseId: sp.get("exerciseId"),
    metric: sp.get("metric") ?? undefined,
  });
  await loadBlockForUser(user, q.blockId);
  return ok(await getExerciseProgress(q.blockId, q.exerciseId, q.metric));
});
