// Type-check-only stub for the isolated Strava module. Runtime routes continue
// to resolve the real lib/event-permissions implementation through Next.js.
export async function getUserSession(): Promise<{
  id: string;
  role: "ADMIN" | "ORGANIZER" | "MEMBER";
}> {
  throw new Error("type stub only");
}

