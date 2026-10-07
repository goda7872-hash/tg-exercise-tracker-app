import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-response";
import { CreateExerciseSchema } from "@/lib/validators";
import { ok, readJson, requireCoach, route } from "@/lib/api-handler";

export const GET = route(async (req) => {
  const coach = await requireCoach(req);
  const exercises = await prisma.exerciseMaster.findMany({
    where: { coachId: coach.id, isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return ok(exercises);
});

export const POST = route(async (req) => {
  const coach = await requireCoach(req);
  const input = CreateExerciseSchema.parse(await readJson(req));
  const dup = await prisma.exerciseMaster.findUnique({
    where: { coachId_name: { coachId: coach.id, name: input.name } },
  });
  if (dup) throw new ApiError(409, "CONFLICT", "Exercise already exists");
  const exercise = await prisma.exerciseMaster.create({ data: { ...input, coachId: coach.id } });
  return ok(exercise, 201);
});
