// Builds the upload-ready site for a domain: node tools/build-dist.js elsha.jacknjose.co.in
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), domain = process.argv[2] || 'elsha.jacknjose.co.in';
const cfg = fs.readFileSync(path.join(root, 'assets/js/config.js'), 'utf8');
// Launch mode = bookingMode 'request' with a WhatsApp number or email filled in. Otherwise the live site carries a preview banner.
const launch = /bookingMode:\s*'request'/.test(cfg) && (/whatsapp:\s*'\+?\d/.test(cfg) || /email:\s*'[^']+@/.test(cfg));
const banner = !launch && !process.argv.includes('--no-banner');
const out = path.join(root, 'dist', domain);
fs.rmSync(out, { recursive: true, force: true });
const copy = (rel, transform) => { const src = path.join(root, rel), dst = path.join(out, rel); fs.mkdirSync(path.dirname(dst), { recursive: true }); let c = fs.readFileSync(src, 'utf8'); if (transform) c = transform(c); fs.writeFileSync(dst, c); };
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = ['assets/css/style.css', ...[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(u => !/^https?:/.test(u))];
const ver = Date.now().toString(36);
const page = html.replace(/"(assets\/[^"]+\.(?:js|css))"/g, `"/$1?v=${ver}"`)
  .replace('<meta name="theme-color"', `<link rel="canonical" href="https://${domain}/">\n<meta property="og:title" content="Jack &amp; Jose · Elsha">\n<meta property="og:url" content="https://${domain}/">\n<meta name="theme-color"`)
  .replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
  .replace('<header class="site-header"', (banner ? '<div class="demo-strip" role="note"><b>Preview site.</b> Online booking and payments are in test mode: no seats, rooms or parcels are actually reserved and no money is charged. To book, contact us.</div>\n' : '') + '<header class="site-header"');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), page);
fs.writeFileSync(path.join(out, '404.html'), page);
files.forEach(f => copy(f, f.endsWith('auth.js') ? c => c.replace('const SHOW_DEMO_LOGINS = true;', 'const SHOW_DEMO_LOGINS = false;') : null));
if (fs.existsSync(path.join(root, 'assets/img'))) fs.cpSync(path.join(root, 'assets/img'), path.join(out, 'assets/img'), { recursive: true }); // your own photos
fs.writeFileSync(path.join(out, 'CNAME'), domain + '\n');                     // GitHub Pages
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: https://${domain}/sitemap.xml\n`);
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${domain}/</loc></url></urlset>\n`);
fs.writeFileSync(path.join(out, '.htaccess'), `# Apache / cPanel / Hostinger\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\nErrorDocument 404 /index.html\n<IfModule mod_headers.c>\n  Header set X-Content-Type-Options "nosniff"\n  Header set Referrer-Policy "strict-origin-when-cross-origin"\n  Header set X-Frame-Options "SAMEORIGIN"\n  <FilesMatch "\\.(js|css)$">\n    Header set Cache-Control "public, max-age=31536000, immutable"\n  </FilesMatch>\n  <FilesMatch "\\.html$">\n    Header set Cache-Control "no-cache"\n  </FilesMatch>\n</IfModule>\n`);
fs.writeFileSync(path.join(out, '_headers'), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`); // Netlify / Cloudflare Pages
fs.writeFileSync(path.join(out, '_redirects'), `/*  /index.html  200\n`);
console.log('built', out, launch ? '(LAUNCH mode: requests go to WhatsApp/email)' : banner ? '(preview banner ON: fill in config.js to launch)' : '(no banner)');
