/* ====== Business details — edit this file before launch ======
   Everything the public site shows about how to reach you comes from here. */
'use strict';
const SITE_CONFIG = {
  name: 'Jack & Jose',
  domain: 'jacknjose.co.in',
  siteHost: 'elsha.jacknjose.co.in', // where the site is published: used in parcel QR codes
  allowPrint: true,
  phone: '+91 97910 66604',                 // e.g. '+91 98765 43210' — shown on Contact page and footer
  whatsapp: '917845666015',              // digits only with country code, e.g. '919876543210' — booking requests are sent here
  email: 'info@jacknjose.co.in',                 // e.g. 'bookings@jacknjose.co.in' — booking requests can also be emailed here
  supportEmail: 'customercare@jacknjose.co.in', // customer-care address: shown on the site and copied on emailed requests
  address: '2A Senthil Nagar, Pillayar Kovil Street, Somanur – 641668, Coimbatore District, Tamil Nadu, India',
  city: 'Coimbatore',        // home city: default "From" city in searches
  jurisdiction: 'Coimbatore, Tamil Nadu',
  hours: 'Mon–Sat, 9:00 AM – 7:00 PM. Bus helpline 24×7.',
  gstin: '33BBQPJ1260D1Z0',                 // shown in the footer when filled
  legalName: 'Jack & Jose',  // company name used in Terms, Privacy and Refund pages

  /* 'demo'    — bookings and payments are simulated in the visitor's browser (a preview banner is shown on the live site).
     'request' — LAUNCH MODE: every booking is sent to you as a request on WhatsApp / email; you confirm and collect
                 payment yourself. No fake payment screen, no preview banner. Needs `whatsapp` or `email` above. */
  bookingMode: 'request',

  showStaffMenu: false,       // show the "Staff" menu in the top navigation (staff can always use the footer link)

  /* Your own photographs. Put image files in assets/img/ and name them here to replace the built-in illustrations.
     Slots: travels, hotels, transports, road, air, sea, logistics, fleet, media, eee, contact, jj, elsha */
  photos: {
    // travels: 'assets/img/our-sleeper-bus.jpg',
  },
};
SITE_CONFIG.canRequest = () => SITE_CONFIG.bookingMode === 'request' && !!(SITE_CONFIG.whatsapp || SITE_CONFIG.email);
