import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-response";
import { LockDaySchema } from "@/lib/validators";
import { canAccessClient } from "@/lib/access";
import { getCarryoverForDay } from "@/lib/services/carryover.service";
import { ok, readJson, requireCoach, requireUser, route } from "@/lib/api-handler";

export const GET = route(async (req, ctx) => {
  const user = await requireUser(req);
  const { dayId } = ctx.params as { dayId: string };

  const day = await prisma.assignedDay.findUnique({
    where: { id: dayId },
    include: {
      assignedWeek: { include: { assignedBlock: { include: { client: true } } } },
      assignedSets: {
        orderBy: [{ orderInDay: "asc" }, { setNumber: "asc" }],
        include: {
          blockExercise: { include: { exerciseMaster: { select: { id: true, name: true, category: true } } } },
          loggedSet: true,
        },
      },
      dayTemplate: {
        include: {
          blockExercises: {
            where: { isCardio: true },
            orderBy: { exerciseOrder: "asc" },
            include: { exerciseMaster: { select: { id: true, name: true } } },
          },
        },
      },
      cardioLogs: true,
    },
  });
  if (!day) throw new ApiError(404, "NOT_FOUND", "Day not found");

  const block = day.assignedWeek.assignedBlock;
  if (!canAccessClient(user, block.client)) throw new ApiError(403, "FORBIDDEN", "Access denied");

  const [carryover, noteRow] = await Promise.all([
    getCarryoverForDay(day.id),
    prisma.dayNote.findUnique({
      where: { userId_assignedDayId: { userId: block.client.userId, assignedDayId: day.id } },
    }),
  ]);

  // Group sets by exercise slot (the same exercise can appear twice in a day).
  const groups = new Map<string, any>();
  for (const s of day.assignedSets) {
    const be = s.blockExercise;
    if (!groups.has(be.id)) {
      groups.set(be.id, {
        blockExerciseId: be.id,
        exerciseId: be.exerciseMaster.id,
        name: be.exerciseMaster.name,
        category: be.exerciseMaster.category,
        targetSets: be.targetSets,
        targetReps: be.targetReps,
        sets: [],
      });
    }
    groups.get(be.id).sets.push({
      id: s.id,
      setNumber: s.setNumber,
      carryoverWeight: carryover[s.id] ?? null,
      logged: s.loggedSet
        ? {
            weight: s.loggedSet.weight,
            reps: s.loggedSet.reps,
            rpe: s.loggedSet.rpe,
            isSkipped: s.loggedSet.isSkipped,
          }
        : null,
    });
  }

  const cardio = day.dayTemplate.blockExercises.map((be) => {
    const log = day.cardioLogs.find((c) => c.exerciseOrder === be.exerciseOrder);
    return {
      exerciseOrder: be.exerciseOrder,
      name: be.exerciseMaster.name,
      logged: log ? { duration: log.duration, speed: log.speed, distance: log.distance } : null,
    };
  });

  return ok({
    id: day.id,
    dayName: day.dayName,
    scheduledDate: day.scheduledDate,
    status: day.status,
    isRestDay: day.isRestDay,
    blockStatus: block.status,
    canEdit: user.role === "CLIENT" && day.status !== "LOCKED" && block.status === "ACTIVE" && !day.isRestDay,
    exercises: Array.from(groups.values()),
    cardio,
    note: noteRow?.note ?? "",
  });
});

// Coach locks / unlocks a day so the client can no longer edit it.
export const PATCH = route(async (req, ctx) => {
  const coach = await requireCoach(req);
  const { dayId } = ctx.params as { dayId: string };
  const { locked } = LockDaySchema.parse(await readJson(req));

  const day = await prisma.assignedDay.findUnique({
    where: { id: dayId },
    include: { assignedWeek: { include: { assignedBlock: { include: { client: true } } } } },
  });
  if (!day) throw new ApiError(404, "NOT_FOUND", "Day not found");
  if (day.assignedWeek.assignedBlock.client.coachId !== coach.id) {
    throw new ApiError(403, "FORBIDDEN", "Access denied");
  }

  const updated = await prisma.assignedDay.update({
    where: { id: dayId },
    data: { status: locked ? "LOCKED" : day.submittedAt ? "SUBMITTED" : "PENDING" },
    select: { id: true, status: true },
  });
  return ok(updated);
});
