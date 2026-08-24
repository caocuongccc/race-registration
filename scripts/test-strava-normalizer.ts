import assert from "node:assert/strict";
import { normalizeStravaActivity } from "../lib/strava/activity-normalizer";
import {
  buildStravaWebhookEventKey,
  parseStravaWebhookEvent,
  verifyStravaWebhookChallenge,
} from "../lib/strava/webhook";

const normalized = normalizeStravaActivity({
  id: 123456789,
  name: "Morning Run",
  sport_type: "Run",
  start_date: "2026-09-20T00:30:00Z",
  start_date_local: "2026-09-20T07:30:00Z",
  timezone: "(GMT+07:00) Asia/Ho_Chi_Minh",
  distance: 2450.4,
  moving_time: 900,
  elapsed_time: 960,
  manual: false,
  trainer: false,
  start_latlng: [16.05, 108.2],
  end_latlng: [16.06, 108.21],
  map: { summary_polyline: "encoded-map" },
  has_heartrate: true,
  average_heartrate: 145.5,
  max_heartrate: 172,
  splits_metric: [
    { split: 1, distance: 1000, moving_time: 360, elapsed_time: 370 },
    { split: 2, distance: 1000, moving_time: 370, elapsed_time: 380 },
    { split: 3, distance: 450.4, moving_time: 170, elapsed_time: 210 },
  ],
}, {
  latlng: { data: [[16.05, 108.2], [16.06, 108.21]] },
  heartrate: { data: [140, 150] },
});

assert.equal(normalized.stravaActivityId, "123456789");
assert.equal(normalized.distanceMeters, 2450);
assert.equal(normalized.ruleInput.localStartMinute, 7 * 60 + 30);
assert.equal(normalized.ruleInput.localEndMinute, 7 * 60 + 46);
assert.equal(normalized.hasGpsStream, true);
assert.equal(normalized.hasHeartRateStream, true);
assert.equal(normalized.splits[0].isCompleteKm, true);
assert.equal(normalized.splits[2].isCompleteKm, false);

const event = parseStravaWebhookEvent({
  object_type: "activity",
  object_id: 123456789,
  aspect_type: "update",
  owner_id: 987654,
  subscription_id: 111,
  event_time: 1789862400,
  updates: { title: "Evening Run" },
});
assert.equal(buildStravaWebhookEventKey(event), buildStravaWebhookEventKey(event));
assert.equal(verifyStravaWebhookChallenge({
  mode: "subscribe",
  receivedToken: "verify-token-long-enough",
  expectedToken: "verify-token-long-enough",
  challenge: "challenge-value",
}), "challenge-value");
assert.throws(() => verifyStravaWebhookChallenge({
  mode: "subscribe",
  receivedToken: "wrong-token",
  expectedToken: "verify-token-long-enough",
  challenge: "challenge-value",
}));

console.log("Strava normalizer and webhook parser: all tests passed");

