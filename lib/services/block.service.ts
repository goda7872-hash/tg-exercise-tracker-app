import { prisma } from "../prisma";
import { ApiError } from "../api-response";
import { addDaysUTC } from "../date-utils";

/** Deep-copies a template into a client's schedule (weeks, days, and one row per set). */
export async function assignBlock(input: {
  coachId: string;
  clientId: string;
  templateId: string;
  startDate: Date;
}) {
  const { coachId, clientId, templateId, startDate } = input;

  const template = await prisma.workoutBlockTemplate.findFirst({
    where: { id: templateId, coachId, isActive: true },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          days: {
            orderBy: { dayNumber: "asc" },
            include: { blockExercises: { orderBy: { exerciseOrder: "asc" } } },
          },
        },
      },
    },
  });
  if (!template) throw new ApiError(404, "NOT_FOUND", "Template not found");

  const client = await prisma.client.findFirst({ where: { id: clientId, coachId, isActive: true } });
  if (!client) throw new ApiError(404, "NOT_FOUND", "Client not found");

  const open = await prisma.assignedBlock.findFirst({
    where: { clientId, status: { in: ["ACTIVE", "PAUSED"] } },
  });
  if (open) {
    throw new ApiError(409, "CONFLICT", "Client already has an active block. Complete or cancel it first.");
  }

  return prisma.$transaction(
    async (tx) => {
      const block = await tx.assignedBlock.create({
        data: {
          clientId,
          templateId,
          startDate,
          expectedEndDate: addDaysUTC(startDate, template.durationWeeks * 7 - 1),
          status: "ACTIVE",
        },
      });

      for (const wt of template.weeks) {
        const weekStart = addDaysUTC(startDate, (wt.weekNumber - 1) * 7);
        const week = await tx.assignedWeek.create({
          data: {
            assignedBlockId: block.id,
            weekTemplateId: wt.id,
            weekNumber: wt.weekNumber,
            scheduledStartDate: weekStart,
            scheduledEndDate: addDaysUTC(weekStart, 6),
          },
        });

        for (const dt of wt.days) {
          const day = await tx.assignedDay.create({
            data: {
              assignedWeekId: week.id,
              dayTemplateId: dt.id,
              dayNumber: dt.dayNumber,
              dayName: dt.dayName,
              scheduledDate: addDaysUTC(weekStart, dt.dayNumber - 1),
              isRestDay: dt.blockExercises.length === 0,
              status: "PENDING",
            },
          });

          const sets = dt.blockExercises
            .filter((b) => !b.isCardio)
            .flatMap((b) =>
              Array.from({ length: b.targetSets }, (_, i) => ({
                assignedDayId: day.id,
                blockExerciseId: b.id,
                setNumber: i + 1,
                orderInDay: b.exerciseOrder,
              }))
            );
          if (sets.length) await tx.assignedSet.createMany({ data: sets });
        }
      }
      return block;
    },
    { timeout: 60000, maxWait: 10000 }
  );
}
