# Strava Challenge — đặc tả kỹ thuật nền tảng

## 1. Phạm vi và ranh giới

Đây là module mới, dùng chung repository, PostgreSQL, Prisma Client và hạ tầng triển khai hiện tại nhưng không dùng chung bảng nghiệp vụ với Event, Kid Run hoặc Merch.

- Model Prisma dùng tiền tố `Challenge`.
- Bảng PostgreSQL dùng tiền tố `challenge_`.
- Tài khoản vận động viên không liên kết với bảng `users` hiện tại.
- Admin hiện tại có thể được cấp quyền vận hành module qua một bảng phân quyền riêng ở giai đoạn triển khai.
- Mọi quãng đường lưu bằng mét, thời gian lưu UTC; việc xét luật dùng timezone của sự kiện.

Thư mục dự kiến:

```text
app/challenges/
app/admin/dashboard/challenges/
app/api/challenges/
app/api/strava/
app/api/webhooks/strava/
lib/strava/
lib/challenge-rules/
lib/challenge-scoring/
lib/challenge-leaderboard/
```

## 2. Quy tắc nghiệp vụ đã chốt

### Thành viên và đội

- Một sự kiện có người chơi cá nhân và các đội có giới hạn thành viên.
- Số chỗ của đội chỉ đếm membership đang `ACTIVE`.
- Khi admin xóa một thành viên, người đó biến mất khỏi danh sách đội hiện tại, được giải phóng suất và cũng rời khỏi sự kiện.
- Activity bắt đầu sau `leftAt` không tính cho cá nhân lẫn đội.
- Activity hợp lệ bắt đầu trước `leftAt` vẫn giữ thành tích lịch sử và phần đóng góp cho đội.
- Người thay thế chỉ được ghi nhận từ `activeFrom`/`joinedAt` của họ.
- Sau khi sự kiện bắt đầu không cho chuyển đội trực tiếp. Thao tác hợp lệ là xóa khỏi sự kiện rồi thêm enrollment mới theo quyết định của admin.
- Membership và enrollment không xóa vật lý nhằm giữ audit; UI mặc định chỉ hiện bản ghi đang hoạt động.
- Activity giao thời điểm rời đội được xét bằng `startDate`, không chia nhỏ tracklog.

### Rule và đánh giá lại

- Rule đều là tùy chọn. Activity phải pass toàn bộ validation rule đang bật mới được ghi nhận.
- Rule có thể thay đổi sau khi sự kiện bắt đầu.
- Mỗi thay đổi tạo ruleset version mới; không ghi đè lịch sử.
- Admin chọn phạm vi: `FROM_NOW`, `FROM_SELECTED_DATETIME` hoặc `RECALCULATE_WHOLE_EVENT`.
- Bật rule hồi tố, ví dụ bắt buộc nhịp tim, sẽ đưa các activity trong phạm vi vào queue để tải bổ sung dữ liệu, đảo ledger cũ, đánh giá lại và cập nhật bảng xếp hạng.
- Activity bị loại vẫn tồn tại và hiển thị lý do rõ ràng.

### Activity Strava thay đổi

- `create`: tải detail/stream cần thiết và đánh giá.
- `update` hoặc người dùng crop: lưu snapshot cũ thành revision, đảo ledger cũ, tải lại cùng Strava Activity ID rồi đánh giá lại.
- `delete`: đánh dấu `DELETED`, đảo đóng góp nhưng không xóa audit.
- Người dùng có nút “Đồng bộ lại từ Strava”, có rate limit.

### Cap, quãng đường và điểm

- Giới hạn km cá nhân mỗi ngày là tùy chọn và cắt phần vượt, không loại toàn bộ activity.
- Cap cá nhân không làm giảm đóng góp đội. Ví dụ chạy hợp lệ 43 km, cap cá nhân 42 km: cá nhân 42 km, đội 43 km.
- Team cap, nếu bật, được tính độc lập với individual cap.
- `enablePoints = false`: xếp hạng và giao diện dùng km; không hiển thị cấu hình hay số điểm.
- `enablePoints = true`: hiển thị điểm làm chỉ số chính, km làm dữ liệu đối chiếu; mặc định 1 km = 1 điểm.
- Top chung có bộ lọc `OVERALL`, `MALE`, `FEMALE`, `TEAM`. Số lượng top mặc định là 3 nếu admin không cấu hình.

## 3. Mô hình dữ liệu

ERD rút gọn:

```text
ChallengeUser 1──1 ChallengeStravaAccount
      │
      ├──* ChallengeEnrollment *──1 ChallengeEvent 1──* ChallengeRuleset
      │             │                    │                  ├──* TimeWindow
      │             │                    │                  └──* SpecialDay
      │             └──* TeamMembership *──1 ChallengeTeam
      │
      └──* ChallengeActivity 1──* ActivityRevision
                    │          ├──* ActivityEvaluation *──1 Ruleset
                    │          └──* PointLedger
                    └────────────── daily/event aggregate tables
```

### Bảng nguồn sự thật

#### `challenge_users`

Hồ sơ riêng của người chơi: Strava athlete ID, tên hiển thị, giới tính có thể sửa, avatar, timezone, trạng thái. Thay đổi giới tính được ghi audit và chỉ ảnh hưởng bộ lọc leaderboard.

#### `challenge_strava_accounts`

OAuth token đã mã hóa, refresh token đã mã hóa, expiry, scope, thời điểm sync và trạng thái kết nối. Không trả token ra client.

#### `challenge_events`

Tên, slug, timezone, thời gian bắt đầu/kết thúc, trạng thái, chế độ solo/team, giới hạn đội, `enablePoints`, điểm/km, chỉ số xếp hạng chính, số top và cấu hình hiển thị.

#### `challenge_enrollments`

Quan hệ người chơi–sự kiện với `activeFrom`, `activeUntil`, `status`. Đây là điều kiện bắt buộc để activity được xét. Unique theo event/user cho một enrollment đang hoạt động phải được bảo vệ bằng transaction hoặc partial unique index SQL.

#### `challenge_teams` và `challenge_team_memberships`

Team chứa giới hạn thành viên. Membership chứa `joinedAt`, `leftAt`, `status`. Lịch sử không xóa vật lý. Việc rời đội và đóng enrollment phải chạy trong cùng transaction.

#### `challenge_rulesets`

Mỗi hàng là một version bất biến gồm `eventId`, `version`, `effectiveFrom`, `scope`, `configJson`, người tạo và lý do thay đổi. Event trỏ tới version hiện hành.

#### `challenge_activities`

Snapshot hiện hành của activity: Strava ID, người dùng, loại hoạt động, start UTC/local, timezone, distance, moving/elapsed time, GPS/polyline, heart-rate summary, trạng thái xử lý và version revision hiện hành.

Không gắn cứng một activity với đúng một event vì một người có thể tham gia nhiều event trùng thời gian. Quan hệ activity–event nằm ở evaluation.

#### `challenge_activity_revisions`

Snapshot JSON bất biến trước mỗi update/crop/delete, dùng cho audit.

#### `challenge_activity_evaluations`

Kết quả theo `activityId + eventId + rulesetId`: trạng thái, danh sách lỗi có cấu trúc, valid distance, credited individual/team distance, individual/team points, evaluation version và thời gian xử lý.

#### `challenge_point_ledger`

Ledger append-only. Mỗi evaluation tạo các bút toán `CREDIT` hoặc `REVERSAL` riêng cho `INDIVIDUAL` và `TEAM`. Aggregate chỉ được xây từ ledger hợp lệ, giúp cập nhật/crop/recalculate an toàn và có thể audit.

#### Aggregate

```text
challenge_athlete_daily_totals
challenge_team_daily_totals
challenge_athlete_event_totals
challenge_team_event_totals
```

Mỗi bảng lưu cả mét và điểm. Dashboard đọc aggregate thay vì cộng activity trực tiếp.

#### Hạ tầng và audit

```text
challenge_webhook_events
challenge_jobs
challenge_audit_logs
```

Webhook inbox có unique key theo Strava event identity để chống xử lý lặp. Job có retry count, next run, lỗi cuối và dead-letter status.

## 4. Rule DSL phiên bản 1

Ruleset lưu JSON có version rõ ràng:

```json
{
  "schemaVersion": 1,
  "activity": {
    "allowedTypes": ["Run", "Walk"],
    "rejectManual": true,
    "outdoorOnly": true
  },
  "gps": {
    "enabled": true,
    "mode": "STRICT"
  },
  "heartRate": {
    "enabled": false,
    "requireStream": false
  },
  "distance": {
    "minimumMeters": 1000
  },
  "pace": {
    "enabled": true,
    "mode": "EVERY_KM",
    "timeBasis": "MOVING_TIME",
    "minimumSecondsPerKm": 180,
    "maximumSecondsPerKm": 720,
    "validateFinalPartial": false,
    "minimumFinalPartialMeters": 500
  },
  "timeWindows": {
    "enabled": false,
    "policy": "START_TIME_ONLY"
  },
  "caps": {
    "individualDailyMeters": 42000,
    "teamDailyMeters": null
  },
  "scoring": {
    "enabled": false,
    "pointsPerKm": 1,
    "overlapPolicy": "HIGHEST_ONLY"
  }
}
```

Các time window và special day nên là bảng con để admin chỉnh dễ và query được; `configJson` giữ snapshot đầy đủ của version nhằm tái lập chính xác kết quả cũ.

### Thứ tự đánh giá xác định

```text
1. Event và enrollment có hiệu lực tại startDate
2. Activity type, manual và outdoor
3. Khoảng thời gian sự kiện
4. Time window theo timezone sự kiện
5. GPS
6. Heart rate
7. Khoảng cách tối thiểu
8. Pace theo từng km hoàn chỉnh
9. Tính valid distance
10. Áp individual cap và team cap độc lập
11. Áp điểm/hệ số nếu enablePoints
12. Ledger và aggregate
```

Validation chạy hết để trả về mọi lỗi hữu ích, không dừng ở lỗi đầu tiên. Các lỗi lưu dạng mã máy + dữ liệu + câu tiếng Việt được dựng ở presentation layer, ví dụ:

```json
{
  "code": "PACE_SPLIT_TOO_SLOW",
  "split": 4,
  "actualSecondsPerKm": 754,
  "limitSecondsPerKm": 600
}
```

## 5. State machine

Activity:

```text
PENDING → PROCESSING → ACCEPTED
                     → ACCEPTED_WITH_CAP
                     → REJECTED
                     → NEEDS_REVIEW
                     → SYNC_FAILED → PROCESSING (retry)
Any current state → PROCESSING (Strava update/recalculate)
Any current state → DELETED (Strava delete)
```

Recalculation job:

```text
QUEUED → RUNNING → COMPLETED
                 → PARTIALLY_FAILED → RUNNING (retry failures)
                 → FAILED
```

## 6. Webhook và đồng bộ

Webhook request không fetch Strava detail và không tính leaderboard trực tiếp:

```text
Strava → verify subscription/request
       → insert idempotent webhook inbox
       → enqueue job
       → HTTP 200 mục tiêu dưới 500 ms
```

Worker:

```text
refresh token khi cần
→ fetch activity detail
→ fetch streams/splits theo rule hiện hành
→ normalize snapshot
→ tìm tất cả event enrollment có hiệu lực
→ evaluate từng event
→ transaction: revision + reversal + evaluation + credit
→ cập nhật aggregate bị ảnh hưởng
```

Vercel cần một queue bền vững như Inngest, Upstash QStash hoặc Trigger.dev. Không dùng fire-and-forget thuần túy vì có thể mất job khi function kết thúc.

## 7. API contract sơ bộ

Public/user:

```text
GET  /api/strava/oauth/start
GET  /api/strava/oauth/callback
POST /api/webhooks/strava
GET  /api/challenges
GET  /api/challenges/:slug/me
GET  /api/challenges/:slug/leaderboard?type=overall|male|female|team
GET  /api/challenges/:slug/activities
POST /api/challenges/activities/:id/resync
GET  /api/challenges/:slug/teams/:teamId
```

Admin:

```text
POST  /api/admin/challenges
PATCH /api/admin/challenges/:id
POST  /api/admin/challenges/:id/rulesets
POST  /api/admin/challenges/:id/rulesets/:rulesetId/simulate
POST  /api/admin/challenges/:id/recalculate
GET   /api/admin/challenges/:id/recalculate/:jobId
POST  /api/admin/challenges/:id/teams
POST  /api/admin/challenges/:id/teams/:teamId/members
DELETE /api/admin/challenges/:id/teams/:teamId/members/:userId
GET   /api/admin/challenges/:id/activities
POST  /api/admin/challenges/:id/activities/:activityId/review
```

Mọi mutation admin ghi audit log. Thêm/xóa người phải khóa team row hoặc dùng transaction serializable để không vượt giới hạn khi có thao tác đồng thời.

## 8. UX chính

Sau đăng nhập Strava, màn hình đầu tiên phải trả lời ngay:

- Tôi đã chạy bao nhiêu km/điểm?
- Tôi đang xếp hạng bao nhiêu?
- Activity mới nhất đã được ghi nhận chưa, nếu chưa thì vì sao?

Khi không bật điểm, toàn bộ UI chỉ dùng km. Khi bật điểm, điểm là số chính và km là số phụ.

Admin tạo sự kiện theo wizard:

```text
1. Thông tin và thời gian
2. Cá nhân/đội
3. Loại activity và GPS
4. Heart rate và pace
5. Khung giờ
6. Cap
7. Điểm và ngày hệ số
8. Leaderboard
9. Rule simulator
10. Publish
```

Màn hình thay đổi rule phải hiện phạm vi quét, số activity ước tính và cảnh báo khả năng thay đổi thứ hạng. Tiến độ chạy nền hiển thị accepted/rejected/failed và cho retry phần lỗi.

## 9. An toàn và hiệu năng

- OAuth `state` chống CSRF; token mã hóa ở application layer bằng secret tách khỏi database.
- Webhook idempotent; ledger reversal chống trừ/cộng lặp bằng unique operation key.
- Chỉ lưu dữ liệu sức khỏe cần thiết; nêu rõ consent và hỗ trợ ngắt kết nối/xóa dữ liệu theo chính sách.
- Cache leaderboard ngắn 10–30 giây; invalidate sau khi aggregate đổi.
- Dashboard chỉ query aggregate có index theo event/rank metric/gender/team.
- Mục tiêu xử lý activity thông thường 5–30 giây sau webhook; API dashboard dưới 500 ms.

## 10. Lộ trình triển khai

### Giai đoạn 1 — foundation

1. Chốt Prisma schema và tạo migration SQL chỉ cho bảng `challenge_*`.
2. Dựng module config/env Strava, mã hóa token và OAuth SSO.
3. Dựng event, enrollment, team và membership admin tối thiểu.

### Giai đoạn 2 — ingestion và rule engine

1. Webhook inbox idempotent và queue.
2. Fetch/normalize activity, revision và resync.
3. Rule engine thuần hàm có fixture test cho timezone, pace split, HR và GPS.
4. Ledger, cap độc lập cá nhân/đội và aggregate.

### Giai đoạn 3 — sản phẩm

1. Dashboard người chơi và leaderboard mobile-first.
2. Team detail, activity detail và lý do bị loại.
3. Admin wizard, simulator, đổi rule và tiến độ recalculation.
4. Monitoring, retry/dead-letter, rate-limit và audit UI.

## 11. Tiêu chí nghiệm thu nền tảng

- Dữ liệu Challenge không phụ thuộc bảng nghiệp vụ hiện tại.
- Webhook lặp không làm tăng thành tích hai lần.
- Crop/update/delete đảo chính xác kết quả cũ.
- Người rời đội biến mất khỏi roster, giải phóng suất, không có activity mới được tính; đóng góp đội trước đó vẫn nguyên.
- Bật HR hồi tố có thể quét lại, giải thích activity bị loại và cập nhật bảng xếp hạng.
- Cap 42 km cho cá nhân không làm giảm 43 km hợp lệ của đội.
- Tắt điểm khiến UI và leaderboard chỉ dùng km; bật điểm vẫn giữ km đối chiếu.
- Mọi thay đổi rule, thành viên và can thiệp activity đều audit được.

