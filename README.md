# Expense Tracker

A simple Android expense tracker built with React Native and Expo. All data stays on your phone.

## Features

- **Expenses**: add, edit and delete expenses with a category, date and note; monthly total and
  category breakdown.
- **Tracker**: spending by week, month, quarter or year, compared with the previous period, with a
  bar chart and "where it went" breakdown.
- **Spending calendar**: a GitHub-style heatmap of the last 12 months. Tap a day to see what you
  spent. Choose green, blue, purple or orange.
- **Auto-add from SMS**: when your bank sends a "debited" SMS, the payment is added automatically
  with a guessed category, and you get a notification. Messages are read on the phone only.
- **Daily reminder**: a notification at 7 PM (or a time you choose) to log the day's spending.
- **Home-screen widget**: today, this week and this month at a glance, with an "+ Add" button.

## Install

Download the latest `.apk` from
[Releases](https://github.com/Sujithrathod/Expense-Tracker-App/releases/latest) on your Android
phone and open it. See [RELEASING.md](RELEASING.md) for how releases are built.

### Turning on SMS auto-add

⚙️ Settings → **Auto-add from SMS**. Android may block SMS access for apps installed outside the
Play Store. If it does:

1. Tap **Open app settings** in the app.
2. Tap ⋮ (top-right) → **Allow restricted settings**.
3. Go to **Permissions → SMS → Allow**, then turn the switch on again.

Only messages received after you turn it on are used. OTPs, credits, refunds, failed payments,
card statements and UPI collect requests are ignored.

## Development

```bash
npm install
npx expo start   # web preview + Expo Go (SMS, reminders and the widget need the APK)
npm test         # message-reader tests
npx tsc --noEmit # type check
```

| Path | What's there |
| --- | --- |
| `App.tsx`, `src/screens/` | the two tabs and app shell |
| `src/stats.ts` | week/month/quarter/year totals and heatmap levels |
| `src/sms/parser.ts` | turns a bank SMS into an amount, merchant and category |
| `src/sms/index.ts` | SMS permission, auto-add and inbox catch-up |
| `modules/sms-listener/` | native Android code that receives SMS in the background |
| `src/widget/` | home-screen widget |
| `.github/workflows/release-apk.yml` | builds the APK and publishes a Release on `v*` tags |
