import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";
import { evaluateChallengeActivity } from "@/lib/challenge-rules/engine";
import { parseChallengeRuleConfig } from "@/lib/challenge-rules/schema";
import { formatChallengeRuleFailuresVi } from "@/lib/challenge-rules/messages";

const schema = z.object({ distanceKm: z.number().positive(), paceSecondsPerKm: z.number().positive(), hasGps: z.boolean(), hasGpsStream: z.boolean(), hasHeartRate: z.boolean(), hasHeartRateStream: z.boolean(), startDate: z.coerce.date() });
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getUserSession(); if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await context.params; const input = schema.parse(await request.json());
    const event = await prisma.challengeEvent.findUnique({ where: { id }, include: { currentRuleset: { include: { timeWindows: true } } } });
    if (!event?.currentRuleset) return NextResponse.json({ error: "Sự kiện chưa có ruleset" }, { status: 404 });
    const base = parseChallengeRuleConfig(event.currentRuleset.configJson); const distanceMeters = Math.round(input.distanceKm * 1000); const seconds = Math.round(input.distanceKm * input.paceSecondsPerKm); const local = input.startDate;
    const config = { ...base, timeWindows: { ...base.timeWindows, windows: event.currentRuleset.timeWindows.map((w) => ({ weekday: w.weekday, startMinute: w.startMinute, endMinute: w.endMinute })) }, scoring: { ...base.scoring, enabled: event.enablePoints, pointsPerKm: Number(event.pointsPerKm) } };
    const full = Math.floor(input.distanceKm); const remainder = distanceMeters - full * 1000;
    const splits = Array.from({ length: full }, (_, index) => ({ splitNumber: index + 1, distanceMeters: 1000, movingTimeSeconds: input.paceSecondsPerKm, elapsedTimeSeconds: input.paceSecondsPerKm, isCompleteKm: true }));
    if (remainder > 0) splits.push({ splitNumber: full + 1, distanceMeters: remainder, movingTimeSeconds: Math.round(input.paceSecondsPerKm * remainder / 1000), elapsedTimeSeconds: Math.round(input.paceSecondsPerKm * remainder / 1000), isCompleteKm: false });
    const result = evaluateChallengeActivity(config, { sportType: "Run", startDate: local, endDate: new Date(local.getTime() + seconds * 1000), localStartWeekday: local.getDay(), localStartMinute: local.getHours() * 60 + local.getMinutes(), localEndWeekday: new Date(local.getTime() + seconds * 1000).getDay(), localEndMinute: new Date(local.getTime() + seconds * 1000).getHours() * 60 + new Date(local.getTime() + seconds * 1000).getMinutes(), distanceMeters, movingTimeSeconds: seconds, elapsedTimeSeconds: seconds, isManual: false, isTrainer: false, hasGps: input.hasGps, hasGpsStream: input.hasGpsStream, hasHeartRate: input.hasHeartRate, averageHeartRate: input.hasHeartRate ? 145 : null, hasHeartRateStream: input.hasHeartRateStream, splits }, { eventStartsAt: event.startsAt, eventEndsAt: event.endsAt, enrollment: { activeFrom: event.startsAt, activeUntil: null }, teamMembership: { teamId: "simulation-team", joinedAt: event.startsAt, leftAt: null }, individualDistanceBeforeTodayMeters: 0, teamDistanceBeforeTodayMeters: 0 });
    return NextResponse.json({ result: { ...result, messages: formatChallengeRuleFailuresVi(result.failures) } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể mô phỏng" }, { status: error instanceof Error && error.name === "ZodError" ? 400 : 500 }); }
}

