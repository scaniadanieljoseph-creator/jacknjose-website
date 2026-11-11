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
