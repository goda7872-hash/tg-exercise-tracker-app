import { prisma } from "./prisma";
import { ApiError } from "./api-response";
import type { AuthUser } from "./api-handler";

export function canAccessClient(user: AuthUser, client: { userId: string; coachId: string }) {
  return user.role === "ADMIN" ? client.coachId === user.id : client.userId === user.id;
}

export async function loadBlockForUser(user: AuthUser, blockId: string) {
  const block = await prisma.assignedBlock.findUnique({
    where: { id: blockId },
    include: { client: true },
  });
  if (!block) throw new ApiError(404, "NOT_FOUND", "Block not found");
  if (!canAccessClient(user, block.client)) throw new ApiError(403, "FORBIDDEN", "Access denied");
  return block;
}
