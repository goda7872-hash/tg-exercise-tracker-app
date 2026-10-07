import { prisma } from "@/lib/prisma";
import { CreateTemplateSchema } from "@/lib/validators";
import { createTemplate } from "@/lib/services/template.service";
import { ok, readJson, requireCoach, route } from "@/lib/api-handler";

export const GET = route(async (req) => {
  const coach = await requireCoach(req);
  const templates = await prisma.workoutBlockTemplate.findMany({
    where: { coachId: coach.id, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, durationWeeks: true },
  });
  return ok(templates);
});

export const POST = route(async (req) => {
  const coach = await requireCoach(req);
  const input = CreateTemplateSchema.parse(await readJson(req));
  const template = await createTemplate(coach.id, input);
  return ok(template, 201);
});
