This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Online Multiplayer

`npm run dev` starts the UI **and** the WebSocket broker on one port (3000).
Two players anywhere can play the same game:

1. Player A opens `/game` → **Create Room** → shares the 4-letter code (or the Copy invite link).
2. Player B opens `/game` → **Join Room** with the code (or opens `/game?room=CODE`).
3. The server validates every move (chess.js) and enforces turns; the physical
   board (ESP32 on `/device`, optionally `/device?room=CODE`) replays confirmed moves.

### Deploy: Vercel (UI) + Render (WS broker)

Vercel cannot run websockets, so the broker runs as a tiny separate service:

1. **Render** ([render.com](https://render.com), sign in with GitHub, free tier):
   New Web Service → connect this repo →
   Build Command: `npm install` · Start Command: `BROKER_ONLY=true node server.mjs`
2. **Vercel** → Project Settings → Environment Variables:
   `NEXT_PUBLIC_WS_URL` = `wss://<your-app>.onrender.com/ws`
   (remove `NEXT_PUBLIC_DISABLE_BOARD_SYNC` if set — it blocks the socket entirely)
   → Redeploy.
3. Point the ESP32 at `wss://<your-app>.onrender.com/device`.

Note: Render's free tier sleeps after 15 min idle — the first connection after a
break takes ~30 s to wake up ("Connecting to server…" in the lobby).

### Deploy everything on one host (Railway/Render, no Vercel)

Start command `npm start` runs the UI and broker together on `$PORT`; browsers
reach the broker at the same origin, no env vars needed.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
