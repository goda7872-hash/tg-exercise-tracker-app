import { prisma } from "@/lib/prisma";
import { UpdateBlockSchema } from "@/lib/validators";
import { loadBlockForUser } from "@/lib/access";
import { todayUTC } from "@/lib/date-utils";
import { ApiError } from "@/lib/api-response";
import { ok, readJson, requireCoach, requireUser, route } from "@/lib/api-handler";

export const GET = route(async (req, ctx) => {
  const user = await requireUser(req);
  const { blockId } = ctx.params as { blockId: string };
  await loadBlockForUser(user, blockId);

  const block = await prisma.assignedBlock.findUnique({
    where: { id: blockId },
    include: {
      template: { select: { name: true, durationWeeks: true } },
      client: { include: { user: { select: { id: true, email: true, name: true } } } },
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          days: {
            orderBy: { dayNumber: "asc" },
            select: { id: true, dayNumber: true, dayName: true, scheduledDate: true, status: true, isRestDay: true },
          },
        },
      },
    },
  });
  return ok(block);
});

export const PATCH = route(async (req, ctx) => {
  const coach = await requireCoach(req);
  const { blockId } = ctx.params as { blockId: string };
  const { status } = UpdateBlockSchema.parse(await readJson(req));
  const block = await loadBlockForUser(coach, blockId);

  if (status === "ACTIVE" || status === "PAUSED") {
    const other = await prisma.assignedBlock.findFirst({
      where: { clientId: block.clientId, status: { in: ["ACTIVE", "PAUSED"] }, id: { not: blockId } },
    });
    if (other) throw new ApiError(409, "CONFLICT", "Client already has another open block");
  }

  const updated = await prisma.assignedBlock.update({
    where: { id: blockId },
    data: {
      status,
      actualEndDate: status === "COMPLETED" || status === "CANCELLED" ? todayUTC() : null,
    },
  });
  return ok(updated);
});
