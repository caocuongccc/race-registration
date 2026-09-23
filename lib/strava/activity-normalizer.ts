import type { ChallengeActivityInput, ChallengePaceSplit } from "@/lib/challenge-rules/engine";

export interface StravaSplitMetric {
  distance: number;
  elapsed_time: number;
  moving_time: number;
  split: number;
}

export interface StravaDetailedActivity {
  id: number;
  name?: string;
  type?: string;
  sport_type?: string;
  start_date: string;
  start_date_local: string;
  timezone?: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  manual?: boolean;
  trainer?: boolean;
  start_latlng?: [number, number] | [];
  end_latlng?: [number, number] | [];
  map?: {
    id?: string;
    summary_polyline?: string | null;
    polyline?: string | null;
  };
  has_heartrate?: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  splits_metric?: StravaSplitMetric[];
}

export interface StravaStream<T> {
  data: T[];
  series_type?: string;
  original_size?: number;
  resolution?: string;
}

export interface StravaActivityStreams {
  latlng?: StravaStream<[number, number]>;
  heartrate?: StravaStream<number>;
  time?: StravaStream<number>;
  distance?: StravaStream<number>;
}

export interface NormalizedStravaActivity {
  stravaActivityId: string;
  name: string | null;
  sportType: string;
  startDate: Date;
  startDateLocal: Date;
  activityTimezone: string | null;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  isManual: boolean;
  isTrainer: boolean;
  hasGps: boolean;
  hasGpsStream: boolean;
  mapPolyline: string | null;
  hasHeartRate: boolean;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  hasHeartRateStream: boolean;
  splits: ChallengePaceSplit[];
  ruleInput: ChallengeActivityInput;
}

function nonnegativeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function parseLocalParts(value: string): { date: Date; weekday: number; minute: number } {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!match) throw new Error("start_date_local của Strava không hợp l�?");
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ));
  return {
    date,
    weekday: date.getUTCDay(),
    minute: date.getUTCHours() * 60 + date.getUTCMinutes(),
  };
}

function buildStreamSplits(streams: StravaActivityStreams): ChallengePaceSplit[] {
  const distances = streams.distance?.data ?? [];
  const times = streams.time?.data ?? [];
  if (distances.length < 2 || distances.length !== times.length) return [];
  const totalDistance = distances.at(-1) ?? 0;
  const boundaries: number[] = [];
  for (let distance = 1000; distance < totalDistance; distance += 1000) boundaries.push(distance);
  boundaries.push(totalDistance);
  let previousDistance = 0;
  let previousTime = times[0] ?? 0;
  return boundaries.map((boundary, index) => {
    let cursor = distances.findIndex((distance) => distance >= boundary);
    if (cursor < 0) cursor = distances.length - 1;
    const currentDistance = distances[cursor] ?? boundary;
    const currentTime = times[cursor] ?? previousTime;
    const splitDistance = Math.max(0, currentDistance - previousDistance);
    const splitTime = Math.max(0, currentTime - previousTime);
    previousDistance = currentDistance;
    previousTime = currentTime;
    return {
      splitNumber: index + 1,
      distanceMeters: nonnegativeInteger(splitDistance),
      // Strava time streams contain elapsed seconds. Use the same value for
      // moving pace only when detailed metric splits are unavailable.
      movingTimeSeconds: nonnegativeInteger(splitTime),
      elapsedTimeSeconds: nonnegativeInteger(splitTime),
      isCompleteKm: splitDistance >= 999,
    };
  });
}

function buildSplits(activity: StravaDetailedActivity, streams: StravaActivityStreams): ChallengePaceSplit[] {
  const metricSplits = (activity.splits_metric ?? []).map((split, index) => ({
    splitNumber: Number.isFinite(split.split) ? split.split : index + 1,
    distanceMeters: nonnegativeInteger(split.distance),
    movingTimeSeconds: nonnegativeInteger(split.moving_time),
    elapsedTimeSeconds: nonnegativeInteger(split.elapsed_time),
    // Strava can report a tiny floating-point difference around exactly 1 km.
    isCompleteKm: split.distance >= 999,
  }));
  return metricSplits.length > 0 ? metricSplits : buildStreamSplits(streams);
}

export function normalizeStravaActivity(
  activity: StravaDetailedActivity,
  streams: StravaActivityStreams = {},
): NormalizedStravaActivity {
  const startDate = new Date(activity.start_date);
  if (Number.isNaN(startDate.getTime())) throw new Error("start_date của Strava không hợp l�?");
  const localStart = parseLocalParts(activity.start_date_local);
  const elapsedTimeSeconds = nonnegativeInteger(activity.elapsed_time);
  const localEndDate = new Date(localStart.date.getTime() + elapsedTimeSeconds * 1000);
  const mapPolyline = activity.map?.polyline ?? activity.map?.summary_polyline ?? null;
  const hasLocationPair = (activity.start_latlng?.length ?? 0) === 2
    && (activity.end_latlng?.length ?? 0) === 2;
  const hasGps = Boolean(mapPolyline || hasLocationPair);
  const hasGpsStream = (streams.latlng?.data.length ?? 0) >= 2;
  const hasHeartRate = Boolean(activity.has_heartrate && (activity.average_heartrate ?? 0) > 0);
  const hasHeartRateStream = (streams.heartrate?.data.length ?? 0) >= 2;
  const splits = buildSplits(activity, streams);
  const distanceMeters = nonnegativeInteger(activity.distance);
  const movingTimeSeconds = nonnegativeInteger(activity.moving_time);
  const sportType = activity.sport_type || activity.type || "Unknown";

  const ruleInput: ChallengeActivityInput = {
    sportType,
    startDate,
    endDate: new Date(startDate.getTime() + elapsedTimeSeconds * 1000),
    localStartWeekday: localStart.weekday,
    localStartMinute: localStart.minute,
    localEndWeekday: localEndDate.getUTCDay(),
    localEndMinute: localEndDate.getUTCHours() * 60 + localEndDate.getUTCMinutes(),
    distanceMeters,
    movingTimeSeconds,
    elapsedTimeSeconds,
    isManual: Boolean(activity.manual),
    isTrainer: Boolean(activity.trainer),
    hasGps,
    hasGpsStream,
    hasHeartRate,
    averageHeartRate: hasHeartRate ? activity.average_heartrate ?? null : null,
    hasHeartRateStream,
    splits,
  };

  return {
    stravaActivityId: String(activity.id),
    name: activity.name?.trim() || null,
    sportType,
    startDate,
    startDateLocal: localStart.date,
    activityTimezone: activity.timezone ?? null,
    distanceMeters,
    movingTimeSeconds,
    elapsedTimeSeconds,
    isManual: Boolean(activity.manual),
    isTrainer: Boolean(activity.trainer),
    hasGps,
    hasGpsStream,
    mapPolyline,
    hasHeartRate,
    averageHeartRate: ruleInput.averageHeartRate,
    maxHeartRate: activity.max_heartrate ?? null,
    hasHeartRateStream,
    splits,
    ruleInput,
  };
}
