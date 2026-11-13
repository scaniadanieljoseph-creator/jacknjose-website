# jacknjose.co.in — Jack & Jose Group website

Static website (HTML + CSS + vanilla JS, no build step) for the two ventures:

| Venture | Page (URL hash) | What it does |
|---|---|---|
| Jack & Jose | `#transports` | Road / Air / Sea freight, FTL & PTL, India + international, instant quote with GST, booking, tracking |
| Jack & Jose | `#logistics` | Parcel booking (pickup, loading, unloading add-ons), AWB tracking |
| Jack & Jose | `#logistics-admin` | **Master portal**: parcels, loading/unloading sheets, add/edit/delete branches |
| Jack & Jose | `#fleet` | **Master portal**: live fleet map, vehicles CRUD, trips, maintenance, insurance/fuel/service alerts |
| Jack & Jose | `#travels`, `#bus-results` | redBus-style bus search, filters, seat maps (sleeper/seater), passenger checkout, e-ticket, PNR cancel |
| Jack & Jose | `#travels-admin` | **Master portal**: dashboard, bookings, buses CRUD, agents CRUD with commission |
| Jack & Jose | `#hotels`, `#hotel-results` | Hotel search, filters, room types, GST, booking voucher, cancel |
| Jack & Jose | `#hotels-admin` | **Master portal**: dashboard, bookings (check-in/out/cancel), hotels CRUD |
| Group | `#payments-admin` | **Master portal**: payment dashboard, transactions, refunds (full/partial), T+N settlements, gateway settings |
| Group | `#notify-admin` | **Master portal**: SMS & email log (view, resend), editable templates with DLT IDs and SMS credit counter, provider settings, test sends |
| Elsha | `#media` | Photography / videography / design services, portfolio, packages, shoot booking |
| Elsha | `#eee` | Elsha Energy Efficiency: savings calculator, appliance catalogue, consultation request |
| Group | `#home`, `#jack-jose`, `#elsha`, `#contact`, `#admin` | Landing pages, contact, staff dashboard (shipments, enquiries, messages) |

## Run locally
Open `index.html` in a browser, or serve the folder: `python3 -m http.server 8080`.

## Deploy
Upload the whole folder (index.html + assets/) to any static host (cPanel, Netlify, Vercel, GitHub Pages, S3) and point jacknjose.co.in at it.

## Staff sign-in (`#login`)
All master portals (`#travels-admin`, `#hotels-admin`, `#logistics-admin`, `#fleet`, `#admin`) require sign-in.
Roles decide which portals a person can open:

| Role | Portals |
|---|---|
| Group administrator | All portals + Staff users tab (create, edit, disable, delete staff; reset passwords) |
| Travels manager | Travels portal |
| Hotels manager | Hotels portal |
| Logistics manager | Logistics portal + Fleet portal |
| Fleet manager | Fleet portal |
| Accounts & payments | Payments portal |

(Every role can also open the Staff dashboard for enquiries.) Passwords are stored as salted SHA-256 hashes, sessions last
8 hours, and sign-in locks for 2 minutes after 5 wrong attempts. Demo accounts (`admin` / `Admin@123`, `accounts` / `Accounts@123`, etc.) are listed in
`assets/js/auth.js` and on the login page — **delete them before launch**.

## Before going live
1. **Backend & real authentication.** Data and sign-in currently run in the visitor's browser (`localStorage`), so anyone
   with technical knowledge could bypass the login. Before launch, move both to a server: a database behind an API
   (replace `Store` in `assets/js/core.js`) and server-side sign-in (bcrypt/argon2 password hashes, HTTP-only session
   cookies, HTTPS). Keep `auth.js` as the login UI and point `Auth.login` at your API.
2. **Payments.** See the Payments section below.
3. **Contact details.** Replace the placeholder phone number in `assets/js/site.js` (contact page).
4. **Images.** Portfolio tiles on `#media` are generated illustrations; swap in real photographs.
5. **Rates.** Freight, parcel and EEE formulas are in `transport.js`, `logistics.js` and `elsha.js` — tune them to your tariffs.

`tools/build-preview.js` bundles everything into one HTML file (used for the shareable preview).

## Payments (`assets/js/payments.js`)
Bus and hotel bookings are only saved after payment succeeds. Checkout offers UPI (ID or QR), cards (Luhn check, brand
detection, 3-D Secure OTP), net banking and wallets. Cancelling a booking refunds the payment automatically
(75% for bus tickets, 100% for hotels); staff can also issue full or partial refunds in the Payments portal.

**Test mode** (default) simulates the gateway — test details: UPI `success@upi` / `failure@upi`; card `4111 1111 1111 1111`
(any future expiry, any CVV, OTP `123456`) or `4000 0000 0000 0002` to see a decline.

**Going live with Razorpay:**
1. Complete KYC in the Razorpay dashboard and copy the `rzp_live_…` **Key ID** (never put the key secret in this website).
2. Build a server endpoint that creates an order (`POST /v1/orders`) and pass its `order_id` into `liveCheckout()` in `payments.js`.
3. Verify `razorpay_signature` on the server (HMAC-SHA256 of `order_id|payment_id` with the key secret) before confirming the booking.
4. Add webhooks for `payment.captured`, `payment.failed` and `refund.processed`; issue refunds via the server API.
5. In the Payments portal → Gateway settings, paste the Key ID, choose Live and save.
PayU, Cashfree and CCAvenue are listed in settings but need their own server integration before Live mode works.

## Notifications (`assets/js/notify.js`)
Customers get an SMS and/or email automatically for: bus ticket booked/cancelled, hotel booked/cancelled/check-in/check-out,
parcel booked (sender + receiver) and status changes, freight shipment booked/updated, refunds issued by staff, media shoot
requests, EEE audit requests and contact messages. New enquiries also email the operations team.
Tickets, vouchers and airway bills show where the confirmation was sent.

**Test mode** (default) shows every message in the Notifications portal as Queued → Sent → Delivered without sending anything.

**Going live:**
1. SMS in India: register on a DLT portal (principal entity, sender ID header such as `JKNJSE`, and every SMS template
   word for word), then paste each DLT template ID into Templates. Keep SMS text in plain English letters ("Rs." not "₹")
   — one Unicode character cuts an SMS credit from 160 to 70 characters.
2. Sign up with an SMS provider (MSG91, Fast2SMS, Gupshup, Twilio, Exotel) and an email provider (Amazon SES, SendGrid,
   Zoho ZeptoMail, Brevo or SMTP). Verify the `jacknjose.co.in` domain (SPF, DKIM, DMARC) for email.
3. Build a server endpoint (e.g. `POST https://api.jacknjose.co.in/notify`) that receives
   `{ channel, to, subject, body, dltTemplateId, senderId, from, replyTo, event, ref }` and calls the provider APIs with
   keys kept on the server. Ideally the server sends these itself when a booking is saved, rather than trusting the browser.
4. In Notifications portal → Providers & settings, enter the endpoint, choose Live and save.

## Launching for real (`assets/js/config.js`)
The site can go live today **without a server** in *request mode*: every bus, hotel, parcel, freight, shoot, energy-audit and
contact form ends by sending the full details to your WhatsApp number and/or email, and you confirm and collect payment yourself.
1. Open `assets/js/config.js` and fill in `phone`, `whatsapp` (digits with country code, e.g. `919876543210`), `email`, `gstin`.
2. Set `bookingMode: 'request'` and, if you like, `showStaffMenu: false`.
3. Run `node tools/build-dist.js elsha.jacknjose.co.in` and publish `dist/elsha.jacknjose.co.in` (the `gh-pages` branch).
In request mode there is no simulated payment screen, no simulated SMS/email, no preview banner, and a WhatsApp chat button appears.
`bookingMode: 'demo'` keeps the full simulated flow (payment gateway, notifications, portals) for demonstrations.

**Policies:** `#terms`, `#privacy` and `#refunds` are linked in the footer (payment gateways require them). Have them reviewed
before launch, and keep the refund rules in line with what the site does.

**Your photos:** put files in `assets/img/` and list them under `photos` in `config.js`
(slots: travels, hotels, transports, road, air, sea, logistics, fleet, media, eee, contact, jj, elsha). Each replaces the
built-in illustration everywhere that slot is used. Illustrations and the animated background are in `assets/js/art.js`.

## Portal tools added (`assets/js/extras.js`)
**Travels portal → Buses & vehicles** (per bus): *Photos* (up to 8, resized in the browser, first one is the cover),
*Seat layout* (presets, 1–2 decks, seats or sleeper berths, rows and columns, click a seat to remove it for a door or stairs),
*Stops* (boarding and dropping points with times). Customers see the photos, the custom seat map and the stops when booking.

**Ratings & reviews** (Travels portal and Hotels portal): customers rate 1–5 stars with a comment from *Manage booking*
after the journey date / check-in. Staff can *Reply* publicly or *Challenge* a rating with a reason and evidence; the review
stays visible marked "under review" until the group administrator *upholds* or *removes* it. Removed reviews stop counting.

**Hotels portal → Hotels & media**: photos (as above) and video links (YouTube / Vimeo / .mp4). Guests see the gallery,
videos and reviews when choosing a room.

**Logistics portal → Transhipment hub**: choose the hub or branch you are working at, then (1) receive inbound manifests,
(2) sort parcels and dispatch them on a new manifest to the suggested next stop (branch → its hub → destination hub →
destination branch), (3) send local parcels out for delivery. Every scan is added to the parcel's movement log.

**Print copies with QR**: each parcel prints a *Booking copy* and a *Delivery copy (POD)* on one A4 sheet (Parcels → Print,
or straight after booking). The QR opens `https://<siteHost>/?awb=<AWB>#logistics`, which tracks that parcel. Manifests print
with their own QR. The QR library loads from cdnjs.

All of this is stored in the browser like the rest of the demo data: photos, reviews and manifests are only visible on the
device that created them until the site is connected to a server database.

**Mixed decks (sleeper + seats):** in the seat-layout editor a deck's *Type* can be "Sleeper berths (left) + seats (right)" or the
reverse; one berth is as long as two rows of seats. Berths and seats are numbered separately (e.g. L1… and S1…). When a bus has
both, set "Seat fare as % of the berth fare"; the bus fare is the berth fare and customers see each price when choosing.

## Database
See `DATABASE.md`. With `api: 'api/'` in `assets/js/config.js` (set automatically by `--cpanel` builds) all data is loaded
from and saved to MySQL through `api/index.php`; staff sign-in runs on the server. With `api: ''` the site keeps data in the
visitor's browser (demo / GitHub Pages). Code: `assets/js/remote.js`, `api/`.

**Seat fares (Travels portal → Buses & vehicles → Seat fares):** set a separate price for any seat or berth. Select seats on the
map or by group (All, a deck, berths, seats, window side, front/last rows), type the fare, Apply, Save. Seats without their own
fare use the bus fare. Customers see each price on the seat map and pay the exact total.

**Only real buses are listed:** bus search shows the buses added in the Travels portal; no partner buses or booked seats are
invented. Sample occupancy appears only in the browser-only demo (`bookingMode: 'demo'` with no `api`).
