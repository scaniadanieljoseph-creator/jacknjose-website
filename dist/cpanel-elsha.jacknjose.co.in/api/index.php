<?php
/* Elsha by Jack & Jose — data API (PHP 7.4+ / 8.x, MySQL or SQLite through PDO).
   Every record is a JSON document in one table, keyed by (collection, id).
   Rules: the public can read listings, create bookings/enquiries/reviews and look one record up by its exact ID;
   staff sign in to read and manage everything their role allows. Passwords are stored with password_hash(). */
declare(strict_types=1);

const OBJECT_KEYS   = ['gatewaySettings', 'notifySettings'];
/* which staff roles may change each collection ('*' = any signed-in staff; admin can always) */
const STAFF_WRITE = [
  'buses' => ['travels'], 'agents' => ['travels'], 'busBookings' => ['travels'],
  'hotels' => ['hotels'], 'hotelBookings' => ['hotels'],
  'branches' => ['logistics'], 'parcels' => ['logistics'], 'manifests' => ['logistics'],
  'vehicles' => ['fleet', 'logistics'], 'trips' => ['fleet', 'logistics'], 'maintenance' => ['fleet', 'logistics'],
  'shipments' => ['*'], 'mediaBookings' => ['*'], 'eeeEnquiries' => ['*'], 'messages' => ['*'], 'notifications' => ['*'],
  'media' => ['travels', 'hotels'], 'reviews' => ['travels', 'hotels'], 'payments' => ['finance', 'travels', 'hotels'],
  'gatewaySettings' => ['finance'], 'notifyTemplates' => [], 'notifySettings' => [], 'staffUsers' => [],
];
const PUBLIC_READ   = ['buses', 'hotels', 'branches', 'media', 'reviews', 'agents', 'busBookings', 'hotelBookings', 'gatewaySettings'];
const PUBLIC_CREATE = ['busBookings', 'hotelBookings', 'parcels', 'shipments', 'mediaBookings', 'eeeEnquiries', 'messages', 'reviews', 'payments', 'notifications'];
const PUBLIC_ONE    = ['busBookings', 'hotelBookings', 'parcels', 'shipments'];
const MAX_DOC_BYTES = 700000;

function respond(int $code, array $body): void { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function fail(int $code, string $error, string $message): void { respond($code, ['error' => $error, 'message' => $message]); }
function now(): string { return gmdate('Y-m-d H:i:s'); }

$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) fail(503, 'not_installed', 'The database is not set up yet. Open api/install.php in your browser.');
$CFG = require $cfgFile;

/* ---- CORS (only needed when the website is served from another address, e.g. GitHub Pages) ---- */
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $CFG['origins'] ?? [], true)) { header("Access-Control-Allow-Origin: $origin"); header('Vary: Origin'); header('Access-Control-Allow-Headers: Content-Type, X-Auth'); header('Access-Control-Allow-Methods: GET, POST, OPTIONS'); header('Access-Control-Max-Age: 600'); }
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
header('X-Content-Type-Options: nosniff');

try { $db = new PDO($CFG['dsn'], $CFG['user'] ?? null, $CFG['pass'] ?? null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]); }
catch (Throwable $e) { fail(503, 'db_down', 'Could not connect to the database.'); }
$T = preg_replace('/[^a-z0-9_]/i', '', $CFG['prefix'] ?? 'jj_');

/* ---- storage helpers ---- */
function rows(string $c): array { global $db, $T; $s = $db->prepare("SELECT data FROM {$T}records WHERE collection = ? ORDER BY seq DESC"); $s->execute([$c]); $out = []; foreach ($s as $r) { $d = json_decode($r['data'], true); if (is_array($d)) $out[] = $d; } return $out; }
function getDoc(string $c, string $id): ?array { global $db, $T; $s = $db->prepare("SELECT data FROM {$T}records WHERE collection = ? AND id = ?"); $s->execute([$c, $id]); $r = $s->fetch(); return $r ? json_decode($r['data'], true) : null; }
function putDoc(string $c, array $doc, ?string $secret = null): void {
  global $db, $T; $json = json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $s = $db->prepare("SELECT 1 FROM {$T}records WHERE collection = ? AND id = ?"); $s->execute([$c, $doc['id']]);
  if ($s->fetch()) { $q = $secret === null ? "UPDATE {$T}records SET data = ?, updated_at = ? WHERE collection = ? AND id = ?" : "UPDATE {$T}records SET data = ?, updated_at = ?, secret = ? WHERE collection = ? AND id = ?";
    $db->prepare($q)->execute($secret === null ? [$json, now(), $c, $doc['id']] : [$json, now(), $secret, $c, $doc['id']]); }
  else $db->prepare("INSERT INTO {$T}records (collection, id, data, secret, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")->execute([$c, $doc['id'], $json, $secret, now(), now()]);
}
function delDoc(string $c, string $id): void { global $db, $T; $db->prepare("DELETE FROM {$T}records WHERE collection = ? AND id = ?")->execute([$c, $id]); }
function pid(string $id): string { global $CFG; return 'p' . substr(sha1($id . ($CFG['salt'] ?? '')), 0, 12); }

/* ---- who is calling ---- */
function currentUser(): ?array {
  global $db, $T; $tok = $_SERVER['HTTP_X_AUTH'] ?? ''; if (!preg_match('/^[a-f0-9]{64}$/', $tok)) return null;
  $s = $db->prepare("SELECT user_id FROM {$T}sessions WHERE token = ? AND expires_at > ?"); $s->execute([hash('sha256', $tok), now()]); $r = $s->fetch(); if (!$r) return null;
  $u = getDoc('staffUsers', $r['user_id']); return ($u && ($u['status'] ?? '') === 'Active') ? $u : null;
}
function publicUser(array $u): array { return ['id' => $u['id'], 'name' => $u['name'] ?? '', 'username' => $u['username'] ?? '', 'role' => $u['role'] ?? '']; }
function canWrite(?array $u, string $c): bool { if (!$u) return false; if (($u['role'] ?? '') === 'admin') return true; $r = STAFF_WRITE[$c] ?? null; return $r !== null && (in_array('*', $r, true) || in_array($u['role'], $r, true)); }

/* ---- what the public may see of each collection ---- */
function publicView(string $c, array $list): array {
  $out = [];
  foreach ($list as $d) switch ($c) {
    case 'busBookings': if (($d['status'] ?? '') === 'Confirmed') $out[] = ['id' => pid($d['id']), 'busId' => $d['busId'] ?? '', 'date' => $d['date'] ?? '', 'status' => 'Confirmed', 'seats' => $d['seats'] ?? [], 'passengers' => array_map(fn($p) => ['seat' => $p['seat'] ?? '', 'gender' => $p['gender'] ?? ''], $d['passengers'] ?? [])]; break;
    case 'hotelBookings': if (in_array($d['status'] ?? '', ['Confirmed', 'Checked-in'], true)) $out[] = ['id' => pid($d['id']), 'hotelId' => $d['hotelId'] ?? '', 'checkIn' => $d['checkIn'] ?? '', 'checkOut' => $d['checkOut'] ?? '', 'rooms' => $d['rooms'] ?? 1, 'status' => $d['status']]; break;
    case 'agents': if (($d['status'] ?? '') === 'Active') $out[] = ['id' => $d['id'], 'name' => $d['name'] ?? '', 'agency' => $d['agency'] ?? '', 'city' => $d['city'] ?? '', 'status' => 'Active']; break;
    case 'reviews': if (($d['status'] ?? '') !== 'Removed') { unset($d['resolution']); if (isset($d['challenge'])) $d['challenge'] = ['reason' => 'under review']; $out[] = $d; } break;
    default: $out[] = $d;
  }
  return $out;
}

/* ---- request ---- */
$a = $_GET['a'] ?? ''; $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$in = []; if ($method === 'POST') { $raw = file_get_contents('php://input') ?: ''; if (strlen($raw) > 6000000) fail(413, 'too_large', 'That is too much data in one request.'); $in = json_decode($raw, true); if (!is_array($in)) fail(400, 'bad_json', 'The request was not valid JSON.'); }
$needPost = fn() => $method === 'POST' || fail(405, 'post_only', 'Use POST for this action.');
$validId = fn($id) => is_string($id) && preg_match('/^[A-Za-z0-9_.\-]{2,80}$/', $id);
$validC  = fn($c) => is_string($c) && array_key_exists($c, STAFF_WRITE);

switch ($a) {

case 'boot': { /* everything the caller is allowed to see, in one request */
  $u = currentUser(); $cols = [];
  foreach (array_keys(STAFF_WRITE) as $c) {
    if ($u) { if ($c === 'staffUsers' && $u['role'] !== 'admin') continue; $cols[$c] = rows($c); }
    elseif (in_array($c, PUBLIC_READ, true)) $cols[$c] = publicView($c, rows($c));
  }
  respond(200, ['user' => $u ? publicUser($u) : null, 'collections' => $cols, 'time' => gmdate('c')]);
}

case 'one': { /* look a single record up by its exact ID (PNR, booking ID, airway bill, shipment ID) */
  $c = $_GET['c'] ?? ''; $id = $_GET['id'] ?? ''; $u = currentUser();
  if (!$validC($c) || !$validId($id)) fail(400, 'bad_request', 'Unknown record.');
  if (!$u && !in_array($c, PUBLIC_ONE, true)) fail(403, 'forbidden', 'Sign in to see this.');
  if ($u && $c === 'staffUsers' && $u['role'] !== 'admin') fail(403, 'forbidden', 'Administrators only.');
  $d = getDoc($c, $id); if (!$d) fail(404, 'not_found', 'No record with that ID.');
  respond(200, ['doc' => $d, 'pid' => pid($id)]);
}

case 'save': { $needPost();
  $c = $in['c'] ?? ''; $doc = $in['doc'] ?? null; $u = currentUser();
  if (!$validC($c) || !is_array($doc)) fail(400, 'bad_request', 'Unknown collection.');
  if (in_array($c, OBJECT_KEYS, true)) $doc['id'] = 'main';
  if (!$validId($doc['id'] ?? null)) fail(400, 'bad_id', 'The record has no valid ID.');
  if (strlen(json_encode($doc)) > MAX_DOC_BYTES) fail(413, 'too_large', 'That record is too large. Use a smaller photo.');
  $old = getDoc($c, $doc['id']); $secret = null;

  if (canWrite($u, $c)) {
    if ($c === 'staffUsers') {
      if (!preg_match('/^[a-z0-9._-]{3,30}$/', $doc['username'] ?? '')) fail(400, 'bad_username', 'Username: 3–30 letters, numbers, dot, dash or underscore.');
      foreach (rows('staffUsers') as $o) if ($o['id'] !== $doc['id'] && ($o['username'] ?? '') === $doc['username']) fail(409, 'taken', 'That username is taken.');
      if (!empty($doc['passHash'])) { if (!preg_match('/^[a-f0-9]{64}$/', $doc['passHash'])) fail(400, 'bad_password', 'Password could not be read.'); $secret = password_hash($doc['passHash'], PASSWORD_DEFAULT); }
      elseif (!$old) fail(400, 'no_password', 'Set a password for the new user.');
      unset($doc['passHash'], $doc['password']);
      if ($old && ($old['role'] ?? '') === 'admin' && (($doc['role'] ?? '') !== 'admin' || ($doc['status'] ?? '') !== 'Active')) { $n = 0; foreach (rows('staffUsers') as $o) if ($o['id'] !== $doc['id'] && ($o['role'] ?? '') === 'admin' && ($o['status'] ?? '') === 'Active') $n++; if (!$n) fail(409, 'last_admin', 'Keep at least one active administrator.'); }
    }
    putDoc($c, $doc, $secret); respond(200, ['ok' => true]);
  }
  if ($u) fail(403, 'forbidden', 'Your role cannot change this.');

  /* ---- public (customers) ---- */
  if (!in_array($c, PUBLIC_CREATE, true)) fail(403, 'forbidden', 'Sign in to change this.');
  if ($old) { /* the only change a customer may make to an existing record: cancel their own booking */
    if (in_array($c, ['busBookings', 'hotelBookings'], true) && ($doc['status'] ?? '') === 'Cancelled' && in_array($old['status'] ?? '', ['Confirmed', 'Requested'], true)) { $old['status'] = 'Cancelled'; if (isset($doc['refund']) && is_numeric($doc['refund'])) $old['refund'] = min((float)$doc['refund'], (float)($old['total'] ?? 0)); putDoc($c, $old); respond(200, ['ok' => true]); }
    fail(403, 'forbidden', 'This record already exists.');
  }
  if (in_array($c, ['busBookings', 'hotelBookings'], true) && empty($CFG['public_confirm'])) $doc['status'] = 'Requested'; // staff confirm it after checking availability / payment
  if ($c === 'parcels' && empty($CFG['public_confirm'])) { $doc['status'] = 'Booked'; }
  if ($c === 'reviews') {
    $r = (int)($doc['rating'] ?? 0); if ($r < 1 || $r > 5) fail(400, 'bad_rating', 'Rating must be 1 to 5 stars.');
    $type = $doc['targetType'] ?? ''; $bk = getDoc($type === 'bus' ? 'busBookings' : 'hotelBookings', (string)($doc['bookingId'] ?? ''));
    if (!$bk || !in_array($bk['status'] ?? '', ['Confirmed', 'Checked-in', 'Checked-out'], true)) fail(403, 'no_booking', 'Only customers with a confirmed booking can leave a rating.');
    if (($type === 'bus' ? ($bk['busId'] ?? '') : ($bk['hotelId'] ?? '')) !== ($doc['targetId'] ?? '')) fail(400, 'mismatch', 'The rating does not match the booking.');
    foreach (rows('reviews') as $o) if (($o['bookingId'] ?? '') === $doc['bookingId']) fail(409, 'exists', 'This booking has already been rated.');
    $doc['rating'] = $r; $doc['status'] = 'Published'; unset($doc['reply'], $doc['challenge'], $doc['resolution'], $doc['sample']);
    $doc['text'] = mb_substr((string)($doc['text'] ?? ''), 0, 2000); $doc['name'] = mb_substr((string)($doc['name'] ?? 'Customer'), 0, 80);
  }
  $doc['createdAt'] = gmdate('Y-m-d\TH:i:s\Z'); unset($doc['sample']);
  putDoc($c, $doc); respond(200, ['ok' => true, 'doc' => $doc]);
}

case 'delete': { $needPost();
  $c = $in['c'] ?? ''; $id = $in['id'] ?? ''; $u = currentUser();
  if (!$validC($c) || !$validId($id)) fail(400, 'bad_request', 'Unknown record.');
  if (!canWrite($u, $c)) fail(403, 'forbidden', $u ? 'Your role cannot delete this.' : 'Sign in to delete.');
  if ($c === 'staffUsers') { if ($id === $u['id']) fail(409, 'self', 'You cannot delete your own account.'); $db->prepare("DELETE FROM {$T}sessions WHERE user_id = ?")->execute([$id]); }
  delDoc($c, $id); respond(200, ['ok' => true]);
}

case 'login': { $needPost();
  $name = strtolower(trim((string)($in['username'] ?? ''))); $hash = (string)($in['hash'] ?? '');
  $db->prepare("DELETE FROM {$T}login_fails WHERE at < ?")->execute([gmdate('Y-m-d H:i:s', time() - 120)]);
  $s = $db->prepare("SELECT COUNT(*) AS n FROM {$T}login_fails WHERE username = ?"); $s->execute([$name]);
  if ((int)$s->fetch()['n'] >= 5) fail(429, 'locked', 'Too many wrong attempts. Try again in 2 minutes.');
  $s = $db->prepare("SELECT data, secret FROM {$T}records WHERE collection = 'staffUsers'"); $s->execute(); $found = null;
  foreach ($s as $r) { $d = json_decode($r['data'], true); if (strtolower($d['username'] ?? '') === $name) { $found = [$d, $r['secret']]; break; } }
  if (!$found || !$found[1] || !password_verify($hash, $found[1])) { $db->prepare("INSERT INTO {$T}login_fails (username, at) VALUES (?, ?)")->execute([$name, now()]); fail(401, 'wrong', 'Wrong username or password.'); }
  [$u] = $found; if (($u['status'] ?? '') !== 'Active') fail(403, 'disabled', 'This account is disabled. Ask the group administrator.');
  $tok = bin2hex(random_bytes(32));
  $db->prepare("DELETE FROM {$T}sessions WHERE expires_at < ?")->execute([now()]);
  $db->prepare("INSERT INTO {$T}sessions (token, user_id, expires_at) VALUES (?, ?, ?)")->execute([hash('sha256', $tok), $u['id'], gmdate('Y-m-d H:i:s', time() + 8 * 3600)]);
  $u['lastLogin'] = gmdate('c'); putDoc('staffUsers', $u);
  respond(200, ['token' => $tok, 'user' => publicUser($u)]);
}

case 'logout': { $needPost(); $tok = $_SERVER['HTTP_X_AUTH'] ?? ''; if ($tok) $db->prepare("DELETE FROM {$T}sessions WHERE token = ?")->execute([hash('sha256', $tok)]); respond(200, ['ok' => true]); }

case 'import': { $needPost(); /* administrator: load many records at once (starter listings, or a backup) */
  $u = currentUser(); if (!$u || $u['role'] !== 'admin') fail(403, 'forbidden', 'Administrators only.');
  $n = 0; $db->beginTransaction();
  foreach (($in['collections'] ?? []) as $c => $list) { if (!$validC($c) || $c === 'staffUsers' || !is_array($list)) continue; foreach (array_reverse($list) as $doc) if (is_array($doc) && $validId($doc['id'] ?? null)) { putDoc($c, $doc); $n++; } }
  $db->commit(); respond(200, ['ok' => true, 'saved' => $n]);
}

case 'export': { /* administrator: full backup as JSON */
  $u = currentUser(); if (!$u || $u['role'] !== 'admin') fail(403, 'forbidden', 'Administrators only.');
  $cols = []; foreach (array_keys(STAFF_WRITE) as $c) $cols[$c] = rows($c); respond(200, ['exportedAt' => gmdate('c'), 'collections' => $cols]);
}

case 'ping': respond(200, ['ok' => true, 'time' => gmdate('c')]);
default: fail(404, 'unknown_action', 'Unknown action.');
}
