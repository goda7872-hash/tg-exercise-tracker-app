import { ApiError } from "@/lib/api-response";
import { loadBlockForUser } from "@/lib/access";
import { generateCycleReport } from "@/lib/services/analytics.service";
import { ok, requireUser, route } from "@/lib/api-handler";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const blockId = req.nextUrl.searchParams.get("blockId");
  if (!blockId) throw new ApiError(400, "BAD_REQUEST", "blockId is required");
  await loadBlockForUser(user, blockId);
  return ok(await generateCycleReport(blockId));
});
