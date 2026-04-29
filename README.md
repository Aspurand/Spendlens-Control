# SpendLens Control

Desktop companion to the [SpendLens](https://github.com/Aspurand/Spendlens) phone PWA. Shares the same Supabase project (`pqkdsznxffwrbibkiape`) as the single source of truth — reads/writes the same `cards`, `transactions`, `subscriptions`, `card_payments`, `card_balances`, `budgets`, `income_entries`, `savings_goals`, `merchant_rules`, `processed_emails`, `sync_history`, and `user_preferences` tables.

## Stack

- Vite 5 + React 18 + TypeScript
- `@supabase/supabase-js@2` (REST + Realtime)
- React Router 6
- No UI framework yet — placeholder shell pending the SpendLens design system

## Run locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The Supabase URL and anon key live in `src/lib/supabase.ts` (same values the phone app uses).

## Versioning

Follows the same convention as the phone app: every commit bumps the app version by 0.1. Desktop track starts at **0.1**, independent of the phone app's track.

## Folder layout

```
Spendlens-Control/
├── src/
│   ├── lib/         ← supabase client, version
│   ├── styles/      ← tokens + globals (placeholder palette)
│   ├── components/  ← Sidebar
│   └── screens/     ← Dashboard, Finance, CashFlow, Goals, Debt, Payments, Budget, Optimizer, Settings
├── public/404.html  ← SPA fallback for GitHub Pages
├── index.html
└── vite.config.ts
```

Screens map 1:1 to the SpendLens phone app's side panel (Main / Planning / Spending / System) so the navigation muscle memory carries over.

## Deployed URL

Auto-deployed to GitHub Pages on every push to `main`:
<https://aspurand.github.io/Spendlens-Control/>

(First push triggers the workflow; check the Actions tab for progress. Once the workflow is green, Pages takes ~30 s to propagate.)

## Roadmap

- **v0.1** — scaffold, Supabase wired, routing, placeholder screens for every phone-app page
- **v0.2** — SpendLens design system applied (tokens + atoms)
- **v0.3** — Dashboard live from `transactions` + `cards`
- **v0.4** — Cash Flow Calendar + Budget & Subscriptions ports
- **v0.5+** — Goals, Debt Payoff, Card Payments, Optimizer, Settings, Sage logs
