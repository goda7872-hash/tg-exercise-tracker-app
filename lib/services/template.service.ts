import { prisma } from "../prisma";
import { ApiError } from "../api-response";
import type { CreateTemplate } from "../validators";

/** Expands one weekly pattern into WeekTemplate / DayTemplate / BlockExercise rows for every week. */
export async function createTemplate(coachId: string, input: CreateTemplate) {
  const ids = Array.from(new Set(input.days.flatMap((d) => d.exercises.map((e) => e.exerciseMasterId))));
  const masters = await prisma.exerciseMaster.findMany({
    where: { id: { in: ids }, coachId, isActive: true },
  });
  if (masters.length !== ids.length) {
    throw new ApiError(400, "INVALID_EXERCISE", "One or more exercises were not found in your library");
  }
  const byId = new Map(masters.map((m) => [m.id, m]));

  const dup = await prisma.workoutBlockTemplate.findUnique({
    where: { coachId_name: { coachId, name: input.name } },
  });
  if (dup) throw new ApiError(409, "CONFLICT", "A template with this name already exists");

  return prisma.$transaction(
    async (tx) => {
      const template = await tx.workoutBlockTemplate.create({
        data: {
          coachId,
          name: input.name,
          description: input.description,
          durationWeeks: input.durationWeeks,
        },
      });
      for (let w = 1; w <= input.durationWeeks; w++) {
        const week = await tx.weekTemplate.create({
          data: { blockTemplateId: template.id, weekNumber: w },
        });
        for (let d = 0; d < input.days.length; d++) {
          const day = input.days[d];
          const dayTemplate = await tx.dayTemplate.create({
            data: { weekTemplateId: week.id, dayNumber: d + 1, dayName: day.dayName },
          });
          if (day.exercises.length) {
            await tx.blockExercise.createMany({
              data: day.exercises.map((e, i) => {
                const cardio = byId.get(e.exerciseMasterId)!.category === "CARDIO";
                return {
                  dayTemplateId: dayTemplate.id,
                  exerciseMasterId: e.exerciseMasterId,
                  exerciseOrder: i + 1,
                  isCardio: cardio,
                  targetSets: cardio ? 1 : e.targetSets,
                  targetReps: cardio ? null : e.targetReps || null,
                };
              }),
            });
          }
        }
      }
      return template;
    },
    { timeout: 60000, maxWait: 10000 }
  );
}
