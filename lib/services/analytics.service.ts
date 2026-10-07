import { prisma } from "../prisma";
import { ApiError } from "../api-response";
import { toISODate } from "../date-utils";

export type Metric = "weight" | "reps" | "rpe";

export async function getExerciseProgress(blockId: string, exerciseMasterId: string, metric: Metric) {
  const logs = await prisma.loggedSet.findMany({
    where: {
      isSkipped: false,
      assignedSet: {
        blockExercise: { exerciseMasterId },
        assignedDay: { assignedWeek: { assignedBlockId: blockId } },
      },
    },
    select: {
      weight: true,
      reps: true,
      rpe: true,
      assignedSet: { select: { assignedDay: { select: { assignedWeek: { select: { weekNumber: true } } } } } },
    },
  });

  const byWeek = new Map<number, number[]>();
  for (const l of logs) {
    const v = metric === "weight" ? l.weight : metric === "reps" ? l.reps : l.rpe;
    if (v === null) continue;
    const wk = l.assignedSet.assignedDay.assignedWeek.weekNumber;
    byWeek.set(wk, [...(byWeek.get(wk) ?? []), v]);
  }

  // Weight/reps: best set of the week. RPE: weekly average.
  const weekly = Array.from(byWeek.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([week, vals]) => ({
      week,
      value:
        metric === "rpe"
          ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
          : Math.max(...vals),
    }));

  const exercise = await prisma.exerciseMaster.findUnique({
    where: { id: exerciseMasterId },
    select: { name: true },
  });

  const values = weekly.map((w) => w.value);
  const summary = values.length
    ? {
        first: values[0],
        last: values[values.length - 1],
        change: Math.round((values[values.length - 1] - values[0]) * 10) / 10,
        best: Math.max(...values),
      }
    : null;

  return { exercise: exercise?.name ?? null, metric, weekly, summary };
}

export async function generateCycleReport(blockId: string) {
  const block = await prisma.assignedBlock.findUnique({
    where: { id: blockId },
    include: {
      template: { select: { name: true } },
      client: { include: { user: { select: { name: true, email: true } } } },
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          days: {
            include: {
              assignedSets: {
                include: {
                  blockExercise: { include: { exerciseMaster: { select: { id: true, name: true } } } },
                  loggedSet: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!block) throw new ApiError(404, "NOT_FOUND", "Block not found");

  let trainingDays = 0;
  let completedDays = 0;
  const exercises = new Map<string, { name: string; weeks: Map<number, { weight: number; reps: number | null }> }>();

  for (const week of block.weeks) {
    for (const day of week.days) {
      if (!day.isRestDay) {
        trainingDays++;
        if (day.status === "SUBMITTED" || day.status === "LOCKED") completedDays++;
      }
      for (const set of day.assignedSets) {
        const m = set.blockExercise.exerciseMaster;
        if (!exercises.has(m.id)) exercises.set(m.id, { name: m.name, weeks: new Map() });
        const l = set.loggedSet;
        if (!l || l.isSkipped || l.weight === null) continue;
        const wk = exercises.get(m.id)!.weeks;
        const cur = wk.get(week.weekNumber);
        if (!cur || l.weight > cur.weight) wk.set(week.weekNumber, { weight: l.weight, reps: l.reps });
      }
    }
  }

  const rows = Array.from(exercises.entries()).map(([id, e]) => {
    const nums = Array.from(e.weeks.keys()).sort((a, b) => a - b);
    if (!nums.length) {
      return { id, name: e.name, startWeek: null, endWeek: null, startWeight: null, endWeight: null, startReps: null, endReps: null, weightChangePct: null, repsChange: null };
    }
    const s = e.weeks.get(nums[0])!;
    const f = e.weeks.get(nums[nums.length - 1])!;
    return {
      id,
      name: e.name,
      startWeek: nums[0],
      endWeek: nums[nums.length - 1],
      startWeight: s.weight,
      endWeight: f.weight,
      startReps: s.reps,
      endReps: f.reps,
      weightChangePct: s.weight > 0 ? Math.round(((f.weight - s.weight) / s.weight) * 1000) / 10 : null,
      repsChange: s.reps !== null && f.reps !== null ? f.reps - s.reps : null,
    };
  });

  return {
    blockId: block.id,
    blockName: block.template.name,
    clientName: block.client.user.name ?? block.client.user.email,
    status: block.status,
    startDate: toISODate(block.startDate),
    expectedEndDate: toISODate(block.expectedEndDate),
    actualEndDate: block.actualEndDate ? toISODate(block.actualEndDate) : null,
    adherence: {
      trainingDays,
      completedDays,
      percent: trainingDays ? Math.round((completedDays / trainingDays) * 100) : 0,
    },
    exercises: rows,
  };
}
