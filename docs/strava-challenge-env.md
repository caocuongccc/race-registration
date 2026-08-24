# Biến môi trường Strava Challenge

Không commit giá trị thật của các biến dưới đây:

```dotenv
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=https://your-domain.example/api/strava/oauth/callback
STRAVA_WEBHOOK_VERIFY_TOKEN=
STRAVA_TOKEN_ENCRYPTION_KEY=
STRAVA_OAUTH_STATE_SECRET=
```

- `STRAVA_TOKEN_ENCRYPTION_KEY`: khóa hex 64 ký tự, tách biệt với `BANK_ENCRYPTION_KEY`.
- `STRAVA_OAUTH_STATE_SECRET`: tối thiểu 32 ký tự. Nếu bỏ trống, hệ thống dùng `NEXTAUTH_SECRET`.
- `STRAVA_REDIRECT_URI`: phải khớp callback URL đã khai báo trong ứng dụng Strava.
- `STRAVA_WEBHOOK_VERIFY_TOKEN`: chuỗi ngẫu nhiên tối thiểu 24 ký tự, dùng khi tạo subscription.

Sinh hai secret bằng Node.js trên máy tin cậy:

```bash
node -e "const c=require('crypto'); console.log('TOKEN_KEY='+c.randomBytes(32).toString('hex')); console.log('STATE_SECRET='+c.randomBytes(32).toString('hex')); console.log('WEBHOOK_TOKEN='+c.randomBytes(24).toString('hex'))"
```
## Cấu hình production hiện tại

```text
Domain: https://dangkygiaichay.vercel.app
Website Strava: https://dangkygiaichay.vercel.app
Authorization Callback Domain: dangkygiaichay.vercel.app
OAuth callback: https://dangkygiaichay.vercel.app/api/strava/oauth/callback
Webhook callback: https://dangkygiaichay.vercel.app/api/webhooks/strava
```

Vercel Environment Variables phải dùng:

```dotenv
STRAVA_REDIRECT_URI=https://dangkygiaichay.vercel.app/api/strava/oauth/callback
```

Project đang dùng Vercel Hobby nên `vercel.json` chưa khai báo cron mỗi phút. Cần scheduler ngoài gọi:

```text
GET https://dangkygiaichay.vercel.app/api/cron/challenge-jobs?limit=5
Authorization: Bearer <CRON_SECRET>
```

Khuyến nghị dùng Upstash QStash Schedule mỗi phút. Không đưa `CRON_SECRET` vào URL query string.
