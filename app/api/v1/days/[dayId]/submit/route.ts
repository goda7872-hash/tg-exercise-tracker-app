import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-response";
import { SubmitDaySchema } from "@/lib/validators";
import { ok, readJson, requireUser, route } from "@/lib/api-handler";
import { esc, sendTelegram } from "@/lib/telegram";

export const POST = route(async (req, ctx) => {
  const user = await requireUser(req);
  if (user.role !== "CLIENT") throw new ApiError(403, "FORBIDDEN", "Only clients can submit workouts");

  const { dayId } = ctx.params as { dayId: string };
  const body = SubmitDaySchema.parse(await readJson(req));

  const day = await prisma.assignedDay.findUnique({
    where: { id: dayId },
    include: {
      assignedWeek: { include: { assignedBlock: { include: { client: true } } } },
      assignedSets: { select: { id: true } },
      dayTemplate: {
        include: { blockExercises: { where: { isCardio: true }, select: { exerciseMasterId: true, exerciseOrder: true } } },
      },
    },
  });
  if (!day) throw new ApiError(404, "NOT_FOUND", "Day not found");

  const block = day.assignedWeek.assignedBlock;
  if (block.client.userId !== user.id) throw new ApiError(403, "FORBIDDEN", "Access denied");
  if (day.status === "LOCKED") throw new ApiError(409, "CONFLICT", "This day has been locked by your coach");
  if (block.status !== "ACTIVE") throw new ApiError(409, "CONFLICT", "This program is not active");
  if (day.isRestDay) throw new ApiError(400, "BAD_REQUEST", "Rest days cannot be logged");

  // Every submitted set must belong to this day (prevents writing to someone else's sets).
  const validSets = new Set(day.assignedSets.map((s) => s.id));
  const sets = new Map<string, (typeof body.sets)[number]>();
  for (const s of body.sets) {
    if (!validSets.has(s.assignedSetId)) throw new ApiError(400, "INVALID_SET", "Set does not belong to this day");
    sets.set(s.assignedSetId, s);
  }
  const cardioByOrder = new Map(day.dayTemplate.blockExercises.map((b) => [b.exerciseOrder, b.exerciseMasterId]));
  for (const c of body.cardio) {
    if (!cardioByOrder.has(c.exerciseOrder)) throw new ApiError(400, "INVALID_CARDIO", "Unknown cardio exercise");
  }

  await prisma.$transaction(async (tx) => {
    const now = new Date();

    for (const s of Array.from(sets.values())) {
      const hasData = s.isSkipped || (s.reps !== null && s.reps !== undefined);
      if (!hasData) {
        await tx.loggedSet.deleteMany({ where: { assignedSetId: s.assignedSetId, userId: user.id } });
        continue;
      }
      const data = {
        weight: s.isSkipped ? null : s.weight ?? null,
        reps: s.isSkipped ? null : s.reps ?? null,
        rpe: s.rpe ?? null,
        notes: s.notes ?? null,
        isSkipped: s.isSkipped,
        loggedAt: now,
      };
      await tx.loggedSet.upsert({
        where: { assignedSetId: s.assignedSetId },
        create: { userId: user.id, assignedSetId: s.assignedSetId, ...data },
        update: data,
      });
    }

    await tx.cardioLog.deleteMany({ where: { assignedDayId: dayId, userId: user.id } });
    if (body.cardio.length) {
      await tx.cardioLog.createMany({
        data: body.cardio.map((c) => ({
          userId: user.id,
          assignedDayId: dayId,
          exerciseMasterId: cardioByOrder.get(c.exerciseOrder)!,
          exerciseOrder: c.exerciseOrder,
          duration: c.duration ?? null,
          speed: c.speed ?? null,
          distance: c.distance ?? null,
          notes: c.notes ?? null,
          loggedAt: now,
        })),
      });
    }

    const note = body.dayNotes?.trim();
    if (note) {
      await tx.dayNote.upsert({
        where: { userId_assignedDayId: { userId: user.id, assignedDayId: dayId } },
        create: { userId: user.id, assignedDayId: dayId, note },
        update: { note },
      });
    } else {
      await tx.dayNote.deleteMany({ where: { userId: user.id, assignedDayId: dayId } });
    }

    await tx.assignedDay.update({ where: { id: dayId }, data: { status: "SUBMITTED", submittedAt: now } });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "DAY_SUBMIT",
        tableName: "AssignedDay",
        recordId: dayId,
        newValues: JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue,
      },
    });
  });

  const who = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } });
  const done = Array.from(sets.values()).filter((x) => !x.isSkipped && x.reps != null).length;
  await sendTelegram(
    `✅ <b>${esc(who?.name ?? who?.email ?? "Client")}</b> submitted <b>${esc(day.dayName)}</b>\n${done} sets logged`
  );

  return ok({ dayId, submittedAt: new Date().toISOString() });
});
