# VietCap Briefing — Setup Guide

## Cấu trúc project
```
vietcap-briefing/
├── api/
│   ├── morning.js   # 8:30 AM GMT+7
│   ├── midday.js    # 1:00 PM GMT+7
│   └── eod.js       # 3:00 PM GMT+7
├── lib/
│   └── briefing.js  # Core engine
├── vercel.json      # Cron config
└── package.json
```

## Bước 1 — Lấy Brave Search API key (free)
1. Vào https://api.search.brave.com
2. Sign up → **API Keys** → Create key
3. Copy key (dạng `BSA...`)

## Bước 2 — Tạo Gmail App Password
1. Vào Gmail → Settings → Security
2. Bật **2-Step Verification** (nếu chưa bật)
3. Tìm **App Passwords** → Tạo password mới
4. Chọn app: Mail, device: Other → đặt tên "VietCap"
5. Copy 16-ký-tự password (dạng `xxxx xxxx xxxx xxxx`)

## Bước 3 — Deploy lên Vercel
1. Vào https://github.com → tạo repo mới tên `vietcap-briefing`
2. Upload toàn bộ files vào repo
3. Vào https://vercel.com → New Project → Import repo vừa tạo
4. Vào **Settings → Environment Variables** → thêm các biến sau:

| Tên biến | Giá trị |
|----------|---------|
| `GROQ_API_KEY` | `gsk_...` (từ console.groq.com) |
| `BRAVE_API_KEY` | `BSA...` (từ bước 1) |
| `GMAIL_USER` | `khoiphambusiness@gmail.com` |
| `GMAIL_APP_PASSWORD` | 16-ký-tự password (bước 2) |
| `RECIPIENT_EMAIL` | `khoiphambusiness@gmail.com` |
| `WATCHLIST` | `VCB,TCB,VNM,HPG` |
| `CRON_SECRET` | Tự tạo 1 chuỗi random, VD: `vietcap2026secret` |

5. Nhấn **Deploy**

## Bước 4 — Verify cron jobs
Vào Vercel Dashboard → **Cron Jobs** → thấy 3 jobs:
- `/api/morning` — 8:30 AM GMT+7 (T2-T6)
- `/api/midday` — 1:00 PM GMT+7 (T2-T6)
- `/api/eod` — 3:00 PM GMT+7 (T2-T6)

## Test thủ công
Sau khi deploy, test bằng cách gọi URL:
```
https://your-app.vercel.app/api/morning
```
Với header: `Authorization: Bearer vietcap2026secret`

Dùng Postman hoặc curl:
```bash
curl -H "Authorization: Bearer vietcap2026secret" \
  https://your-app.vercel.app/api/morning
```

## Chi phí
- Vercel: FREE (Hobby plan)
- Groq API: FREE (14.400 req/ngày)
- Brave Search: FREE (2.000 req/tháng)
- Gmail SMTP: FREE
- **Tổng: $0/tháng**
