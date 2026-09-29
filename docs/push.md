# Push notifications — setup

Push is built and switched off until the server has its keys. Nothing breaks without them: Settings says "not set up yet" and nothing is sent.

## 1. Make the keys (once, on any computer with Node)

```
npx web-push generate-vapid-keys
```

and make a cron secret (any 32+ random characters), e.g. `openssl rand -hex 32`.

## 2. Add them to the Vercel project (Settings → Environment Variables, Production)

| Name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | the public key from step 1 |
| `VAPID_PRIVATE_KEY` | the private key from step 1 (mark Sensitive) |
| `VAPID_SUBJECT` | `mailto:` and your email address |
| `CRON_SECRET` | the random secret (mark Sensitive) |

Redeploy so the function picks them up. The two tables it needs are created on first use.

## 3. Something to call the tick every 5 minutes

Leave-by times, booking windows and the morning briefing are sent by `/api/push-tick`. Plan changes do not need it — they are sent the moment they are saved.

- **Vercel Pro:** add to `vercel.json`: `"crons":[{"path":"/api/push-tick","schedule":"*/5 * * * *"}]`. Vercel sends `CRON_SECRET` as the bearer token by itself.
- **Vercel Hobby:** do **not** add a cron more often than daily — the deployment is refused. Use a free external scheduler (e.g. cron-job.org) to call `https://<your domain>/api/push-tick?key=<CRON_SECRET>` every 5 minutes.

A missed tick is caught up by the next one; anything more than an hour late is dropped rather than sent, and nothing is ever sent twice.

## 4. On each phone

iPhone: open the app from the Home Screen icon (iOS 16.4 or later), then Settings → Notifications → Turn on notifications, and allow. Each person chooses which kinds they want.
