import { json, apiError } from "@/lib/api-helpers";
import { listAgents } from "@/lib/social";

export async function GET() {
  try {
    const agents = await listAgents();
    return json(agents);
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}
