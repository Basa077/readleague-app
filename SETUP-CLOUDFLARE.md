# Enabling feed videos (Cloudflare Stream)

The feed supports **text + images today**. Video is wired to use **Cloudflare
Stream** (upload, transcode, adaptive playback, global CDN) — it just needs an
account + two secrets. Until those are set, the composer shows a disabled
"🎥 Video (setup)" button; everything else works.

## 1. Create a Cloudflare Stream account
1. Sign in at https://dash.cloudflare.com → **Stream**.
2. Subscribe to Stream (billed per minutes stored + delivered).
3. Note your **Account ID** (right sidebar of any Cloudflare dashboard page).

## 2. Create an API token
1. https://dash.cloudflare.com/profile/api-tokens → **Create Token** →
   *Custom token*.
2. Permission: **Account › Stream › Edit**.
3. Create, then copy the token value.

## 3. Add the secrets
Local (`.env.local`) and Vercel (Project → Settings → Environment Variables):

```
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_STREAM_TOKEN=your_api_token
```

Restart `npm run dev` locally; redeploy (`vercel --prod`) for production. Once
both are present, `CLOUDFLARE_STREAM_ENABLED` flips on (see `src/lib/config.ts`)
and the composer offers real video upload.

## 4. What's left to wire (the code side)
The data model is already in place (`posts.videoUid`, `posts.videoThumb`). The
remaining work, to do once the account exists:
- An API route that requests a **direct-creator-upload** URL from Stream
  (`POST https://api.cloudflare.com/client/v4/accounts/{id}/stream/direct_upload`)
  so the browser uploads straight to Cloudflare (keeps big files off our
  functions, same idea as the Blob image path).
- Composer: when `videoEnabled`, swap the disabled button for the upload flow,
  store the returned `uid` on the post.
- `PostCard`: render `<stream src={videoUid}>` (the Cloudflare player embed)
  when a post has a `videoUid`.

> Moderation note: a public, worldwide video feed needs review tooling. We
> already auto-hide posts after 3 reports (`reportPostAction`) and let
> coordinators delete anything. Before opening video widely, add a coordinator
> review queue for reported posts.
