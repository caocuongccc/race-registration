import assert from "node:assert/strict";
import { formatChallengeRuleFailureVi } from "../lib/challenge-rules/messages";
import { createStravaOAuthState, verifyStravaOAuthState } from "../lib/strava/oauth-state";
import { decryptStravaToken, encryptStravaToken } from "../lib/strava/token-crypto";

const encryptionKey = "ab".repeat(32);
const token = "strava-access-token-test";
const encrypted = encryptStravaToken(token, encryptionKey);
assert.notEqual(encrypted, token);
assert.equal(decryptStravaToken(encrypted, encryptionKey), token);
const tamperedParts = encrypted.split(":");
tamperedParts[3] = `${tamperedParts[3][0] === "A" ? "B" : "A"}${tamperedParts[3].slice(1)}`;
assert.throws(() => decryptStravaToken(tamperedParts.join(":"), encryptionKey));

const secret = "oauth-state-secret-with-more-than-32-characters";
const issuedAt = Date.now();
const created = createStravaOAuthState(secret, "/challenges/summer-run");
const verified = verifyStravaOAuthState(created.state, created.nonce, secret, issuedAt);
assert.equal(verified.returnTo, "/challenges/summer-run");
assert.throws(() => verifyStravaOAuthState(created.state, "wrong-nonce", secret, issuedAt));
assert.throws(() => verifyStravaOAuthState(created.state, created.nonce, secret, issuedAt + 11 * 60 * 1000));

const unsafe = createStravaOAuthState(secret, "https://evil.example");
assert.equal(verifyStravaOAuthState(unsafe.state, unsafe.nonce, secret).returnTo, "/challenges");

assert.equal(
  formatChallengeRuleFailureVi({
    code: "PACE_SPLIT_TOO_SLOW",
    details: { split: 4, actualSecondsPerKm: 754 },
  }),
  "Km thứ 4 có pace 12:34/km, chậm hơn giới hạn.",
);

console.log("Strava security and messages: all tests passed");

