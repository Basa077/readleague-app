# Turn on "Sign in with Google" (≈5 minutes)

Everything in the code is **already built and waiting**. The only thing left is
creating a Google credential — which only you can do, because it's tied to your
Google account. Follow these steps and the **"Continue with Google" button turns
on automatically**.

---

## 1. Open the Google Cloud Console
Go to **https://console.cloud.google.com/** and sign in with your Google account
(mbarcaking@gmail.com). If asked, create a free project — call it `ReadLeague`.

## 2. Configure the consent screen (one-time)
1. In the search bar type **"OAuth consent screen"** and open it.
2. Choose **External** → Create.
3. Fill in:
   - **App name:** `ReadLeague`
   - **User support email:** your email
   - **Developer contact email:** your email
4. Click **Save and Continue** through the Scopes and Test users pages.
   - On **Test users**, click **Add users** and add your own email so you can log in
     while the app is in "testing" mode.
5. Save.

## 3. Create the OAuth Client ID
1. Search **"Credentials"** → open it.
2. Click **+ Create Credentials** → **OAuth client ID**.
3. **Application type:** `Web application`. Name it `ReadLeague Web`.
4. Under **Authorized JavaScript origins**, click **+ Add URI** for each:
   ```
   http://localhost:3000
   https://readleague-app.vercel.app
   ```
5. Under **Authorized redirect URIs**, click **+ Add URI** for each (copy EXACTLY):
   ```
   http://localhost:3000/api/auth/google/callback
   https://readleague-app.vercel.app/api/auth/google/callback
   ```
6. Click **Create**. A popup shows your **Client ID** and **Client Secret** — keep it open.

## 4. Paste the two values
Open `C:\Users\gaisi\readleague-app\.env.local` and fill in the two lines at the
bottom (already added for you):
```
GOOGLE_CLIENT_ID=<paste the Client ID here>
GOOGLE_CLIENT_SECRET=<paste the Client Secret here>
```
Save the file.

## 5. Restart the dev server
In the terminal, stop `npm run dev` (Ctrl+C) and run it again:
```powershell
npm run dev
```
Open **http://localhost:3000/login** — the **Continue with Google** button is now there.
Click it, pick your Google account, and you'll land in the app, signed in. 🎉

---

## To make it work on the LIVE site too (optional, do later)
The live site (`readleague-app.vercel.app`) needs the same two values:
1. Go to **https://vercel.com/** → your `readleague-app` project → **Settings → Environment Variables**.
2. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (same values) for **Production**.
3. Redeploy (Deployments → ⋯ → Redeploy), or just push to git.

That's it. If anything goes wrong, the login page shows a friendly message and you
can always use email + password (e.g. `coord@readleague.app` / `readmore123`).
