# Storing everything in a database (cPanel)

The website can save all data in a MySQL database on your own hosting instead of in each visitor's browser.
You need PHP hosting with MySQL — your cPanel account has both. GitHub Pages cannot run a database, so in this
setup the whole site is hosted on cPanel. No DNS change is needed: `elsha.jacknjose.co.in` already points to cPanel.

Package to upload: `dist/elsha-cpanel.zip` (rebuild with `node tools/build-dist.js elsha.jacknjose.co.in --cpanel`).

## Steps (about 10 minutes)

1. **Create the database** — cPanel → *MySQL® Databases*
   - Create a database, e.g. `elsha` (cPanel shows it as `youraccount_elsha`).
   - Create a database user with a strong password (use the password generator and copy it).
   - *Add User To Database* → tick **ALL PRIVILEGES**.
2. **Upload the site** — cPanel → *File Manager* → open the folder of `elsha.jacknjose.co.in`
   (shown under *Domains*; often `public_html/elsha.jacknjose.co.in` or `elsha.jacknjose.co.in`).
   - Delete any old files there (keep `.well-known` and `cgi-bin` if present).
   - Upload `elsha-cpanel.zip`, right-click → *Extract*. `index.html` and the `api` folder must sit directly in that folder.
   - In File Manager *Settings*, tick *Show Hidden Files* and check `.htaccess` is there.
3. **Run the installer** — open `https://elsha.jacknjose.co.in/api/install.php`
   - Enter the database name, user and password from step 1 (host is `localhost`).
   - Choose your administrator username and password. Click *Create tables and finish*.
4. **Sign in** — open `https://elsha.jacknjose.co.in/#login` and sign in with that administrator account.
   - *Staff dashboard* → **Load sample listings** if you want the example buses, hotels, branches and vehicles as a start.
   - *Staff dashboard → Staff users* → add your staff with their roles.
5. **Finish**
   - Delete `api/install.php` in File Manager.
   - cPanel → *SSL/TLS Status* → *Run AutoSSL* so the site opens with https.
   - GitHub → repository *Settings → Pages* → **Remove** the custom domain (the site now lives on cPanel).
   - If the installer says PHP is too old: cPanel → *Select PHP Version* / *MultiPHP Manager* → PHP 8.1 or newer, with `pdo_mysql` ticked.

## What is stored
One table, `jj_records`, holds every record as JSON: buses (with seat layouts and stops), agents, bus and hotel
bookings, hotels, photos and video links, reviews, branches, parcels, manifests, vehicles, trips, maintenance,
freight shipments, media and energy enquiries, contact messages, payments and notification logs, settings, staff users.
`jj_sessions` holds staff sign-ins; `jj_login_fails` throttles wrong passwords. You can browse them in phpMyAdmin.

## Who can see what
- **Customers** see listings, photos and published reviews. They can create bookings, enquiries and reviews, look a
  booking up by its exact ID (PNR, booking ID, airway bill), and cancel their own booking. They can never list
  other people's bookings: seat and room availability is sent without names, phones or PNRs.
- **Staff** sign in on the server (passwords stored with `password_hash`, 8-hour sessions, lock-out after 5 wrong
  attempts). Each role can change only its own area; only the administrator manages staff users.
- New bookings from the website arrive as **Requested**; staff **Confirm** or **Decline** them in the portal.
  Confirmed seats and rooms then show as booked to every visitor.
- Reviews are accepted only for a real confirmed booking, one per booking.

## Backups
*Staff dashboard → Download backup* saves everything as one JSON file. Also use cPanel → *Backup* for the database.

## Updating the site later
Rebuild the zip, upload and extract it over the old files. `api/config.php` is not in the zip, so your database
connection and data stay as they are.

## Hosting the site elsewhere (optional)
If the site stays on GitHub Pages, upload only the `api` folder to cPanel (e.g. `jacknjose.co.in/api`), set
`api: 'https://jacknjose.co.in/api/'` in `assets/js/config.js`, and enter `https://elsha.jacknjose.co.in` under
*Other website addresses* in the installer.
