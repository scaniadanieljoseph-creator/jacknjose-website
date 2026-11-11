# Putting the site live at https://elsha.jacknjose.co.in

The upload-ready package is `dist/elsha.jacknjose.co.in.zip` (rebuild with `node tools/build-dist.js elsha.jacknjose.co.in`).
It contains index.html, 404.html, assets/, plus config for the common hosts (.htaccess, _headers, _redirects, CNAME, robots.txt, sitemap.xml).

## Option A — your existing web hosting (cPanel / Hostinger / GoDaddy / BigRock / Plesk)
1. In the hosting panel, open **Domains → Subdomains** and create `elsha` for `jacknjose.co.in`
   (document root e.g. `public_html/elsha`). The panel normally adds the DNS record for you.
2. Open **File Manager**, go into that folder, **Upload** `elsha.jacknjose.co.in.zip`, then **Extract** it there.
   Make sure `index.html` sits directly in the folder (not inside a sub-folder). Show hidden files to confirm `.htaccess` is there.
3. **SSL/TLS Status → Run AutoSSL** (or "Let's Encrypt") for `elsha.jacknjose.co.in`.
4. Open https://elsha.jacknjose.co.in

## Option B — Netlify (free)
1. Sign in at app.netlify.com → **Add new site → Deploy manually** → drag the *extracted* folder in.
2. **Domain management → Add a domain** → `elsha.jacknjose.co.in`.
3. At your DNS provider add: `CNAME  elsha  →  <your-site>.netlify.app`. HTTPS is issued automatically.

## Option C — GitHub Pages (free)
1. Create a repository, upload the extracted files to the root of the `main` branch.
2. **Settings → Pages** → Deploy from branch `main` / root. The `CNAME` file already holds the domain.
3. At your DNS provider add: `CNAME  elsha  →  <your-github-username>.github.io`, then tick **Enforce HTTPS**.

DNS changes usually take 5–30 minutes (up to 24 hours).

## The "Preview site" banner
The live build shows a banner saying online booking and payments are in test mode, because right now:
- bookings, payments, notifications and staff sign-in are saved only in each visitor's own browser, so staff
  never see customers' bookings and nothing is charged or sent;
- the portal sign-in runs in the browser, so it is not real protection.

Once the server work in README.md (database API, server sign-in, Razorpay orders + signature check, SMS/email endpoint)
is done, rebuild without the banner: `node tools/build-dist.js elsha.jacknjose.co.in --no-banner`.

Demo staff passwords are hidden on the live sign-in page but still work (`admin` / `Admin@123`, …). Replace the
accounts in `assets/js/auth.js` before giving anyone the portal address.
