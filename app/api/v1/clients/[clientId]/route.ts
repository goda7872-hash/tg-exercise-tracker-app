import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-response";
import { ok, requireCoach, route } from "@/lib/api-handler";

export const GET = route(async (req, ctx) => {
  const coach = await requireCoach(req);
  const { clientId } = ctx.params as { clientId: string };
  const client = await prisma.client.findFirst({
    where: { id: clientId, coachId: coach.id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      assignedBlocks: {
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          status: true,
          startDate: true,
          expectedEndDate: true,
          template: { select: { name: true } },
        },
      },
    },
  });
  if (!client) throw new ApiError(404, "NOT_FOUND", "Client not found");
  return ok(client);
});
