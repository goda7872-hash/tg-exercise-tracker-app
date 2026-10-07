import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-response";
import { ClientInviteSchema } from "@/lib/validators";
import { ok, readJson, requireCoach, requireUser, route } from "@/lib/api-handler";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const activeBlocks = {
    where: { status: { in: ["ACTIVE", "PAUSED"] as ("ACTIVE" | "PAUSED")[] } },
    select: { id: true, status: true, template: { select: { name: true } } },
  };

  if (user.role === "ADMIN") {
    const clients = await prisma.client.findMany({
      where: { coachId: user.id, isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        assignedBlocks: activeBlocks,
      },
    });
    return ok(clients);
  }

  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    include: { user: { select: { id: true, email: true, name: true } }, assignedBlocks: activeBlocks },
  });
  return ok(client);
});

export const POST = route(async (req) => {
  const coach = await requireCoach(req);
  const { email } = ClientInviteSchema.parse(await readJson(req));

  const target = await prisma.user.findUnique({
    where: { email },
    include: { clientProfile: true },
  });
  if (target?.role === "ADMIN") throw new ApiError(400, "INVALID", "That email belongs to a coach account");
  if (target?.clientProfile) {
    const same = target.clientProfile.coachId === coach.id;
    throw new ApiError(409, "CONFLICT", same ? "Client already exists" : "That user already has a coach");
  }

  const userId = target
    ? target.id
    : (await prisma.user.create({ data: { email, role: "CLIENT" } })).id;

  const client = await prisma.client.create({
    data: { coachId: coach.id, userId, startDate: new Date() },
    include: { user: { select: { id: true, email: true, name: true } }, assignedBlocks: true },
  });
  return ok(client, 201);
});
