<?php
/* Hotel Jothi Grand: booking requests from the website.
   Emails each request from info@jacknjose.co.in to the hotel, and sends the guest an acknowledgement.
   Settings are in the CONFIG block below. Requests are also saved in bookings/bookings.csv (not public). */

/* ====== CONFIG ====== */
const MAIL_FROM      = 'info@jacknjose.co.in';             // sender address (a mailbox on this cPanel account)
const MAIL_FROM_NAME = 'Hotel Jothi Grand Bookings';
const MAIL_TO        = ['hoteljothigrand666@gmail.com'];    // who receives the booking requests
const MAIL_BCC       = ['info@jacknjose.co.in'];            // a copy for Elsha
const HOTEL_NAME     = 'Hotel Jothi Grand';
const HOTEL_PHONE    = '+91 73040 43384';
const ALLOWED_HOSTS  = ['hoteljothigrand.elsha.co.in', 'www.hoteljothigrand.elsha.co.in', 'hoteljothigrand.jacknjose.co.in', 'www.hoteljothigrand.jacknjose.co.in', 'localhost', '127.0.0.1'];
const LOGO_URL       = 'https://hoteljothigrand.elsha.co.in/img/logo-gold-light-360.png';
const MAX_PER_HOUR   = 6;                                    // requests allowed per visitor per hour
/* ==================== */

date_default_timezone_set('Asia/Kolkata');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out(int $code, array $body): void { http_response_code($code); echo json_encode($body); exit; }
function clean(string $s, int $max): string { $s = trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s)); return mb_substr($s, 0, $max); }
function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['ok' => false, 'error' => 'Use POST']);

$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$host = $origin ? strtolower((string)parse_url($origin, PHP_URL_HOST)) : '';
if (!in_array($host, ALLOWED_HOSTS, true)) out(403, ['ok' => false, 'error' => 'Please send the request from the hotel website.']);

$raw = file_get_contents('php://input', false, null, 0, 8192);
$in = json_decode($raw ?: '', true);
if (!is_array($in)) out(400, ['ok' => false, 'error' => 'Bad request']);
if (!empty($in['website'])) out(200, ['ok' => true, 'ref' => 'JG-0']);   // hidden field that only bots fill in

/* rate limit per visitor */
$dir = __DIR__ . '/bookings';
if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
if (!file_exists("$dir/.htaccess")) @file_put_contents("$dir/.htaccess", "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
$ipKey = hash('sha256', 'jg' . ($_SERVER['REMOTE_ADDR'] ?? ''));
$rlFile = "$dir/rate.json";
$rl = json_decode(@file_get_contents($rlFile) ?: '{}', true) ?: [];
$now = time();
foreach ($rl as $k => $times) { $rl[$k] = array_values(array_filter($times, fn($t) => $t > $now - 3600)); if (!$rl[$k]) unset($rl[$k]); }
if (count($rl[$ipKey] ?? []) >= MAX_PER_HOUR) out(429, ['ok' => false, 'error' => 'Too many requests. Please call us on ' . HOTEL_PHONE . '.']);

/* validate */
$name   = clean((string)($in['name'] ?? ''), 80);
$phone  = clean((string)($in['phone'] ?? ''), 20);
$email  = clean((string)($in['email'] ?? ''), 120);
$room   = clean((string)($in['room'] ?? ''), 60);
$req    = clean((string)($in['req'] ?? ''), 600);
$ci     = (string)($in['ci'] ?? ''); $co = (string)($in['co'] ?? '');
$rooms  = max(1, min(10, (int)($in['rooms'] ?? 1)));
$guests = max(1, min(30, (int)($in['guests'] ?? 1)));
$errors = [];
if (mb_strlen($name) < 2) $errors[] = 'name';
if (strlen(preg_replace('/\D/', '', $phone)) < 10) $errors[] = 'phone';
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
$d1 = DateTime::createFromFormat('!Y-m-d', $ci); $d2 = $co ? DateTime::createFromFormat('!Y-m-d', $co) : null;
if (!$d1 || $d1->format('Y-m-d') !== $ci || $d1 < new DateTime('yesterday')) $errors[] = 'check-in date';
if ($co !== '' && (!$d2 || $d2->format('Y-m-d') !== $co || $d2 <= $d1)) $errors[] = 'check-out date';
if ($room === '') $errors[] = 'room';
if ($errors) out(422, ['ok' => false, 'error' => 'Please check: ' . implode(', ', $errors)]);

$nights = $d2 ? (int)$d1->diff($d2)->days : 0;
$ref = 'JG-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
$fmt = fn(?DateTime $d) => $d ? $d->format('D, j M Y') : '';
$rows = [
  'Reference' => $ref, 'Name' => $name, 'Mobile' => $phone, 'Email' => $email ?: '—',
  'Booking for' => $room, 'Check-in' => $fmt($d1), 'Check-out' => $d2 ? $fmt($d2) . " ($nights night" . ($nights > 1 ? 's' : '') . ')' : '—',
  'Rooms' => (string)$rooms, 'Guests' => (string)$guests, 'Special requests' => $req ?: '—', 'Received' => date('D, j M Y, g:i A'),
];

/* email helpers */
function send(array $to, string $subject, string $text, string $html, array $bcc = [], string $replyTo = ''): bool {
  $b = 'jg' . bin2hex(random_bytes(8));
  $hdr = ['MIME-Version: 1.0', 'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM . '>', "Content-Type: multipart/alternative; boundary=\"$b\""];
  if ($bcc) $hdr[] = 'Bcc: ' . implode(', ', $bcc);
  if ($replyTo) $hdr[] = 'Reply-To: ' . $replyTo;
  $body = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text))
        . "--$b\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "--$b--\r\n";
  $subj = '=?UTF-8?B?' . base64_encode($subject) . '?=';
  if (getenv('JG_MAIL_DRYRUN')) { file_put_contents(getenv('JG_MAIL_DRYRUN'), "TO: " . implode(', ', $to) . "\nSUBJECT: $subject\n" . implode("\n", $hdr) . "\n\n$text\n=====\n", FILE_APPEND); return true; }
  return mail(implode(', ', $to), $subj, $body, implode("\r\n", $hdr), '-f' . MAIL_FROM);
}
function table(array $rows): string {
  $tr = ''; foreach ($rows as $k => $v) $tr .= '<tr><td style="padding:9px 14px;color:#6b7280;border-bottom:1px solid #f0e6ee;white-space:nowrap">' . h($k) . '</td><td style="padding:9px 14px;color:#14306b;font-weight:600;border-bottom:1px solid #f0e6ee">' . nl2br(h($v)) . '</td></tr>';
  return '<table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;font:15px Arial,sans-serif">' . $tr . '</table>';
}
function wrapHtml(string $title, string $inner): string {
  return '<div style="background:#f6f3f8;padding:24px 12px;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eee">'
       . '<div style="background:#0a1234;color:#fff;padding:20px 24px"><table cellspacing="0" cellpadding="0"><tr><td style="padding-right:16px"><img src="' . LOGO_URL . '" width="58" alt="" style="display:block"></td><td><div style="font-size:12px;letter-spacing:3px;color:#e8c46a">HOTEL JOTHI GRAND</div><div style="font-size:22px;font-weight:bold;margin-top:4px">' . h($title) . '</div></td></tr></table></div>'
       . '<div style="padding:20px 24px">' . $inner . '</div></div></div>';
}
$text = ''; foreach ($rows as $k => $v) $text .= str_pad($k . ':', 18) . $v . "\n";
$digits = preg_replace('/\D/', '', $phone); if (strlen($digits) === 10) $digits = '91' . $digits;
$actions = '<p style="margin:18px 0 0"><a href="tel:+' . h($digits) . '" style="background:#14306b;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;margin-right:8px">Call guest</a>'
         . '<a href="https://wa.me/' . h($digits) . '" style="background:#25d366;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">WhatsApp guest</a></p>';

$sent = send(MAIL_TO, "New booking request $ref · $name · " . $fmt($d1), "New booking request from the website\n\n$text\nPlease call or WhatsApp the guest to confirm.\n",
  wrapHtml('New booking request', '<p style="margin:0 0 14px;color:#374151">A guest has asked to book through the website. Please contact them to confirm availability and rate.</p>' . table($rows) . $actions),
  MAIL_BCC, $email ? '"' . str_replace(['"', '\\'], '', $name) . "\" <$email>" : '');
if (!$sent) out(502, ['ok' => false, 'error' => 'We could not send your request just now. Please call us on ' . HOTEL_PHONE . ' or use WhatsApp.']);

if ($email) {
  $g = $rows; unset($g['Received'], $g['Email']);
  send([$email], "We received your booking request · $ref", "Dear $name,\n\nThank you for choosing " . HOTEL_NAME . ". We have received your request and will call you shortly to confirm.\n\n" . preg_replace('/^(Received|Email):.*\n/m', '', $text) . "\nFor anything urgent, call " . HOTEL_PHONE . ".\n\n" . HOTEL_NAME . "\n",
    wrapHtml('Thank you, ' . $name, '<p style="margin:0 0 14px;color:#374151">We have received your booking request and will call you shortly to confirm your room and rate. Your details:</p>' . table($g) . '<p style="color:#374151;margin-top:16px">For anything urgent, call <b>' . h(HOTEL_PHONE) . '</b>.</p>'));
}

/* put the request into the hotel management system (Website enquiries) */
try {
  if (is_file(__DIR__ . '/manage/db.php')) { require_once __DIR__ . '/manage/db.php';
    jg_put('enquiries', ['id' => $ref, 'name' => $name, 'phone' => $phone, 'email' => $email, 'room' => $room, 'ci' => $ci, 'co' => $co, 'rooms' => $rooms, 'guests' => $guests, 'req' => $req, 'status' => 'New', 'source' => 'Website', 'createdAt' => date('Y-m-d H:i:s')]); }
} catch (Throwable $e) { /* the email has already gone, so the guest is not affected */ }

/* save a copy and count the request */
$rl[$ipKey][] = $now; @file_put_contents($rlFile, json_encode($rl), LOCK_EX);
$csv = "$dir/bookings.csv"; $new = !file_exists($csv);
if ($fh = @fopen($csv, 'a')) { if ($new) fputcsv($fh, array_keys($rows)); fputcsv($fh, array_map(fn($v) => preg_match('/^[=+\-@]/', $v) ? "'$v" : $v, array_values($rows))); fclose($fh); }

out(200, ['ok' => true, 'ref' => $ref, 'emailed' => (bool)$email]);
