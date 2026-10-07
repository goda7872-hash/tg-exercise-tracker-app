import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-response";
import { AssignBlockSchema } from "@/lib/validators";
import { parseDateOnly } from "@/lib/date-utils";
import { assignBlock } from "@/lib/services/block.service";
import { ok, readJson, requireCoach, requireUser, route } from "@/lib/api-handler";

const select = {
  id: true,
  status: true,
  startDate: true,
  expectedEndDate: true,
  template: { select: { name: true } },
};

// Coach: GET /api/v1/blocks?clientId=...   Client: their own blocks.
export const GET = route(async (req) => {
  const user = await requireUser(req);
  if (user.role === "ADMIN") {
    const clientId = req.nextUrl.searchParams.get("clientId");
    if (!clientId) throw new ApiError(400, "BAD_REQUEST", "clientId is required");
    const client = await prisma.client.findFirst({ where: { id: clientId, coachId: user.id } });
    if (!client) throw new ApiError(404, "NOT_FOUND", "Client not found");
    return ok(await prisma.assignedBlock.findMany({ where: { clientId }, orderBy: { startDate: "desc" }, select }));
  }
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) return ok([]);
  return ok(await prisma.assignedBlock.findMany({ where: { clientId: client.id }, orderBy: { startDate: "desc" }, select }));
});

export const POST = route(async (req) => {
  const coach = await requireCoach(req);
  const input = AssignBlockSchema.parse(await readJson(req));
  const block = await assignBlock({
    coachId: coach.id,
    clientId: input.clientId,
    templateId: input.templateId,
    startDate: parseDateOnly(input.startDate),
  });
  return ok(block, 201);
});
