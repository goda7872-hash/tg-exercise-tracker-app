import { prisma } from "../prisma";
import { ApiError } from "../api-response";

/**
 * For each set of a day, suggests the weight the client used last week for the same exercise
 * (their most recent logged working weight). Returns { [assignedSetId]: weight | null }.
 */
export async function getCarryoverForDay(assignedDayId: string): Promise<Record<string, number | null>> {
  const day = await prisma.assignedDay.findUnique({
    where: { id: assignedDayId },
    include: {
      assignedWeek: { select: { assignedBlockId: true, weekNumber: true } },
      assignedSets: { select: { id: true, blockExercise: { select: { exerciseMasterId: true } } } },
    },
  });
  if (!day) throw new ApiError(404, "NOT_FOUND", "Day not found");

  const result: Record<string, number | null> = {};
  for (const s of day.assignedSets) result[s.id] = null;

  const prevWeek = await prisma.assignedWeek.findFirst({
    where: {
      assignedBlockId: day.assignedWeek.assignedBlockId,
      weekNumber: day.assignedWeek.weekNumber - 1,
    },
    select: { id: true },
  });
  if (!prevWeek) return result;

  const exerciseIds = Array.from(new Set(day.assignedSets.map((s) => s.blockExercise.exerciseMasterId)));
  const logs = await prisma.loggedSet.findMany({
    where: {
      isSkipped: false,
      weight: { not: null },
      assignedSet: {
        assignedDay: { assignedWeekId: prevWeek.id },
        blockExercise: { exerciseMasterId: { in: exerciseIds } },
      },
    },
    select: {
      weight: true,
      loggedAt: true,
      assignedSet: { select: { setNumber: true, blockExercise: { select: { exerciseMasterId: true } } } },
    },
  });

  // Most recent session wins; within it, the last set.
  const best = new Map<string, { weight: number; at: number; setNumber: number }>();
  for (const l of logs) {
    const ex = l.assignedSet.blockExercise.exerciseMasterId;
    const at = l.loggedAt.getTime();
    const cur = best.get(ex);
    if (!cur || at > cur.at || (at === cur.at && l.assignedSet.setNumber > cur.setNumber)) {
      best.set(ex, { weight: l.weight as number, at, setNumber: l.assignedSet.setNumber });
    }
  }

  for (const s of day.assignedSets) {
    result[s.id] = best.get(s.blockExercise.exerciseMasterId)?.weight ?? null;
  }
  return result;
}
