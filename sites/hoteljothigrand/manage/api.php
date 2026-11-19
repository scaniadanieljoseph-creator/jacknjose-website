<?php
/* Hotel Jothi Grand management API. All requests: POST JSON {action, ...}, signed-in requests send the header X-Auth: <token>. */
declare(strict_types=1);
date_default_timezone_set('Asia/Kolkata');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
require __DIR__ . '/db.php';

function out(array $b, int $code = 200): void { http_response_code($code); echo json_encode($b, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function bad(string $m, int $code = 400): void { out(['ok' => false, 'error' => $m], $code); }

/* who may read (r) and change (w) each collection; admin and manager may do everything */
const ROLES = ['admin' => 'Owner / Admin', 'manager' => 'Manager', 'frontdesk' => 'Front desk', 'accounts' => 'Accounts', 'cashier' => 'Cashier / billing', 'waiter' => 'Waiter / steward', 'kitchen' => 'Kitchen', 'bar' => 'Bar staff', 'housekeeping' => 'Housekeeping'];
const PERMS = [
  'frontdesk'    => ['rooms' => 'rw', 'bookings' => 'rw', 'guests' => 'rw', 'enquiries' => 'rw', 'attendance' => 'rw', 'staff' => 'r', 'settings' => 'r', 'income' => 'rw', 'tasks' => 'rw', 'orders' => 'r', 'bills' => 'r', 'menu' => 'r', 'bar' => 'r'],
  'accounts'     => ['rooms' => 'r', 'bookings' => 'r', 'guests' => 'r', 'enquiries' => 'r', 'staff' => 'rw', 'attendance' => 'rw', 'payroll' => 'rw', 'expenses' => 'rw', 'income' => 'rw', 'settings' => 'r', 'orders' => 'r', 'bills' => 'r', 'menu' => 'r', 'bar' => 'r', 'tasks' => 'r', 'leaves' => 'r'],
  'cashier'      => ['orders' => 'rw', 'bills' => 'rw', 'menu' => 'r', 'bar' => 'rw', 'bookings' => 'r', 'rooms' => 'r', 'income' => 'rw', 'settings' => 'r'],
  'waiter'       => ['orders' => 'rw', 'menu' => 'r', 'bar' => 'r', 'bookings' => 'r', 'rooms' => 'r', 'settings' => 'r'],
  'kitchen'      => ['orders' => 'rw', 'menu' => 'rw', 'settings' => 'r'],
  'bar'          => ['orders' => 'rw', 'bills' => 'rw', 'bar' => 'rw', 'menu' => 'r', 'bookings' => 'r', 'rooms' => 'r', 'income' => 'rw', 'settings' => 'r'],
  'housekeeping' => ['rooms' => 'rw', 'tasks' => 'rw', 'staff' => 'r', 'bookings' => 'r', 'settings' => 'r'],
];
/* collection => [id prefix, digits] for new records; null = the screen sets the id */
const COLLECTIONS = ['rooms' => ['RM', 3], 'bookings' => ['BK', 4], 'guests' => ['GU', 4], 'enquiries' => ['WEB', 4], 'staff' => ['EMP', 3], 'attendance' => null, 'payroll' => null, 'expenses' => ['EX', 4], 'income' => ['IN', 4], 'settings' => null,
  'menu' => ['MN', 3], 'bar' => ['BR', 3], 'orders' => ['KOT', 5], 'bills' => ['BL', 5], 'tasks' => ['TK', 4], 'leaves' => ['LV', 4]];
const LEAVE_TYPES = ['CL' => 'Casual leave', 'SL' => 'Sick leave', 'EL' => 'Earned leave', 'CO' => 'Compensatory off', 'LOP' => 'Unpaid leave (loss of pay)'];
const LEAVE_QUOTA = ['CL' => 12, 'SL' => 7, 'EL' => 12, 'CO' => 0];
const ROOM_CHARGE_ROLES = ['admin', 'manager', 'frontdesk', 'cashier', 'bar'];

function can(array $u, string $c, string $mode): bool {
  if (in_array($u['role'], ['admin', 'manager'], true)) return true;
  return strpos(PERMS[$u['role']][$c] ?? '', $mode) !== false;
}
/* front desk does not see salaries or bank details */
function redact(array $u, string $c, array $d): array {
  if ($c === 'staff' && in_array($u['role'], ['frontdesk', 'housekeeping'], true)) return array_intersect_key($d, array_flip(['id', 'name', 'role', 'dept', 'status', 'phone']));
  /* restaurant, bar and housekeeping staff only need to know who is in which room */
  if ($c === 'bookings' && in_array($u['role'], ['cashier', 'waiter', 'bar', 'housekeeping'], true)) return array_intersect_key($d, array_flip(['id', 'guest', 'room', 'roomType', 'status', 'ci', 'co', 'adults']));
  return $d;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') bad('Use POST', 405);
$in = json_decode(file_get_contents('php://input', false, null, 0, 7000000) ?: '', true);   // room for a 4 MB upload
if (!is_array($in)) bad('Bad request');
$action = (string)($in['action'] ?? '');

try { $db = jg_db(); } catch (Throwable $e) { bad('The database could not be opened. If the MySQL password was changed in cPanel, the owner should open manage/install.php again.', 503); }
$ip = $_SERVER['REMOTE_ADDR'] ?? '';

/* ---------- first-time setup and sign-in ---------- */
$userCount = (int)$db->query('SELECT COUNT(*) FROM jg_users')->fetchColumn();
if ($action === 'status') out(['ok' => true, 'needsSetup' => $userCount === 0, 'db' => jg_driver()]);

function checkPassword(string $p): void { if (strlen($p) < 8) bad('Use a password of at least 8 characters.'); }
function newSession(array $u): array {
  $tok = bin2hex(random_bytes(32)); jg_db()->prepare('INSERT INTO jg_sessions (token, user_id, expires) VALUES (?, ?, ?)')->execute([hash('sha256', $tok), $u['id'], time() + 12 * 3600]);
  jg_db()->prepare('DELETE FROM jg_sessions WHERE expires < ?')->execute([time()]);
  return ['token' => $tok, 'user' => ['id' => (int)$u['id'], 'username' => $u['username'], 'name' => $u['name'], 'role' => $u['role']]];
}

if ($action === 'setup') {
  if ($userCount > 0) bad('Setup is already done. Please sign in.', 403);
  $un = strtolower(trim((string)($in['username'] ?? ''))); $nm = trim((string)($in['name'] ?? '')); $pw = (string)($in['password'] ?? '');
  if (!preg_match('/^[a-z0-9._-]{3,30}$/', $un)) bad('Username: 3 to 30 letters, numbers, dot, dash or underscore.');
  checkPassword($pw);
  $db->prepare('INSERT INTO jg_users (username, name, role, pass, active, created_at) VALUES (?, ?, ?, ?, 1, ?)')->execute([$un, $nm ?: $un, 'admin', password_hash($pw, PASSWORD_DEFAULT), date('Y-m-d H:i:s')]);
  $u = $db->query('SELECT * FROM jg_users ORDER BY id LIMIT 1')->fetch();
  jg_log($un, 'setup'); out(['ok' => true] + newSession($u));
}

if ($action === 'login') {
  $un = strtolower(trim((string)($in['username'] ?? ''))); $pw = (string)($in['password'] ?? '');
  $k = hash('sha256', $ip . '|' . $un); $db->prepare('DELETE FROM jg_attempts WHERE at < ?')->execute([time() - 900]);
  $s = $db->prepare('SELECT COUNT(*) FROM jg_attempts WHERE k = ?'); $s->execute([$k]);
  if ((int)$s->fetchColumn() >= 8) bad('Too many wrong attempts. Please wait 15 minutes.', 429);
  $s = $db->prepare('SELECT * FROM jg_users WHERE username = ?'); $s->execute([$un]); $u = $s->fetch();
  if (!$u || !(int)$u['active'] || !password_verify($pw, $u['pass'])) { $db->prepare('INSERT INTO jg_attempts (k, at) VALUES (?, ?)')->execute([$k, time()]); usleep(400000); bad('Wrong username or password.', 401); }
  if (password_needs_rehash($u['pass'], PASSWORD_DEFAULT)) $db->prepare('UPDATE jg_users SET pass = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
  jg_log($un, 'login'); out(['ok' => true] + newSession($u));
}

/* ---------- everything below needs a signed-in user ---------- */
$tok = (string)($_SERVER['HTTP_X_AUTH'] ?? '');
$s = $db->prepare('SELECT u.* FROM jg_sessions s JOIN jg_users u ON u.id = s.user_id WHERE s.token = ? AND s.expires > ? AND u.active = 1');
$s->execute([hash('sha256', $tok), time()]); $U = $s->fetch();
if (!$tok || !$U) bad('Please sign in again.', 401);
$db->prepare('UPDATE jg_sessions SET expires = ? WHERE token = ?')->execute([time() + 12 * 3600, hash('sha256', $tok)]);
$who = $U['username'];

if ($action === 'logout') { $db->prepare('DELETE FROM jg_sessions WHERE token = ?')->execute([hash('sha256', $tok)]); out(['ok' => true]); }

if ($action === 'load') {             // everything this user may see, in one go
  $data = [];
  foreach (COLLECTIONS as $c => $_) {
    if (!can($U, $c, 'r')) continue;
    $s = $db->prepare('SELECT data FROM jg_records WHERE collection = ?'); $s->execute([$c]);
    $data[$c] = array_map(fn($r) => redact($U, $c, json_decode($r['data'], true) ?: []), $s->fetchAll());
  }
  out(['ok' => true, 'user' => ['id' => (int)$U['id'], 'username' => $U['username'], 'name' => $U['name'], 'role' => $U['role'], 'staffId' => (string)($U['staff_id'] ?? '')], 'data' => $data, 'roles' => ROLES, 'now' => date('Y-m-d H:i:s'), 'db' => jg_driver()]);
}

if ($action === 'poll') {             // what changed since the last look (keeps the kitchen display, waiter and counter screens live)
  $since = (string)($in['since'] ?? ''); if (!preg_match('/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/', $since)) bad('Bad request.');
  $now = date('Y-m-d H:i:s'); $data = [];
  foreach (COLLECTIONS as $c => $_) {
    if (!can($U, $c, 'r')) continue;
    $s = $db->prepare('SELECT data FROM jg_records WHERE collection = ? AND updated_at >= ?'); $s->execute([$c, $since]);
    $rows = $s->fetchAll(); if ($rows) $data[$c] = array_map(fn($r) => redact($U, $c, json_decode($r['data'], true) ?: []), $rows);
  }
  out(['ok' => true, 'now' => $now, 'data' => $data]);
}

/* ---------- documents and photos ---------- */
/* who may add (w) or open (r) each kind of file */
function fileCan(array $u, string $kind, string $mode, string $owner = ''): bool {
  switch ($kind) {
    case 'guest':      return $mode === 'w' ? (can($u, 'bookings', 'w') || can($u, 'guests', 'w')) : (can($u, 'guests', 'r') || can($u, 'bookings', 'w'));
    case 'expense':    return can($u, 'expenses', $mode);
    case 'staff':      return can($u, 'staff', 'w');
    case 'leave':      return $mode === 'w' ? (!empty($u['staff_id']) || can($u, 'leaves', 'w')) : (can($u, 'leaves', 'r') || $owner === $u['username']);
    case 'attendance': return $mode === 'w' ? (!empty($u['staff_id']) || can($u, 'attendance', 'w')) : (can($u, 'attendance', 'r') || $owner === $u['username']);
  }
  return false;
}
if ($action === 'upload') {
  $kind = (string)($in['kind'] ?? '');
  if (!fileCan($U, $kind, 'w')) bad('Your login cannot upload this.', 403);
  $bin = base64_decode((string)($in['data'] ?? ''), true);
  if ($bin === false || $bin === '') bad('The file did not arrive. Please try again.');
  try { $f = jg_file_save($kind, (string)($in['name'] ?? 'file'), $bin, $who); } catch (RuntimeException $e) { bad($e->getMessage()); }
  jg_log($who, 'upload', $kind, $f['id'], $f['name']); out(['ok' => true, 'file' => $f]);
}
if ($action === 'file') {
  $s = $db->prepare('SELECT id, kind, name, mime, data, created_by FROM jg_files WHERE id = ?'); $s->execute([(string)($in['id'] ?? '')]); $f = $s->fetch();
  if (!$f) bad('File not found.', 404);
  if (!fileCan($U, $f['kind'], 'r', (string)$f['created_by'])) bad('Your login cannot open this file.', 403);
  $data = is_resource($f['data']) ? stream_get_contents($f['data']) : $f['data'];
  header('Content-Type: ' . (isset(JG_FILE_TYPES[$f['mime']]) ? $f['mime'] : 'application/octet-stream'));
  header('Content-Disposition: inline; filename="' . preg_replace('/[^A-Za-z0-9._-]+/', '_', (string)$f['name']) . '"');
  header("Content-Security-Policy: default-src 'none'; sandbox"); header('Content-Length: ' . strlen($data));
  echo $data; exit;
}

/* ---------- attendance from the staff member's own phone: selfie + location, server clock ---------- */
function metres(float $a1, float $o1, float $a2, float $o2): int { $r = 6371000; $p1 = deg2rad($a1); $p2 = deg2rad($a2); $dp = $p2 - $p1; $dl = deg2rad($o2 - $o1); $h = sin($dp / 2) ** 2 + cos($p1) * cos($p2) * sin($dl / 2) ** 2; return (int)round(2 * $r * asin(min(1, sqrt($h)))); }
function myStaff(array $U): array {
  $sid = (string)($U['staff_id'] ?? '');
  if ($sid === '') bad('This login is not linked to a staff member yet. Ask the manager: Settings → Staff logins → Edit → Staff member.');
  $st = jg_get('staff', $sid); if (!$st || ($st['status'] ?? 'Active') === 'Inactive') bad('Your staff record is missing or inactive. Please tell the manager.');
  return $st;
}
if ($action === 'myAttendance') {
  $st = myStaff($U); $mon = (string)($in['month'] ?? date('Y-m')); if (!preg_match('/^\d{4}-\d\d$/', $mon)) bad('Bad month.');
  $s = $db->prepare("SELECT data FROM jg_records WHERE collection = 'attendance' AND id LIKE ?"); $s->execute([$mon . '-%_' . $st['id']]);
  $set = jg_get('settings', 'hotel') ?: [];
  $yr = date('Y'); $LV = array_values(array_filter(staffLeaves($st['id']), fn($l) => substr($l['from'], 0, 4) >= $yr || $l['status'] === 'Pending'));
  out(['ok' => true, 'leaves' => $LV, 'leaveTypes' => LEAVE_TYPES, 'quota' => leaveQuota(), 'used' => leaveUsed($st['id'], $yr), 'staff' => ['id' => $st['id'], 'name' => $st['name'], 'role' => $st['role'] ?? '', 'shift' => $st['shift'] ?? ''], 'records' => array_map(fn($r) => json_decode($r['data'], true), $s->fetchAll()),
       'rules' => ['photo' => ($set['punchPhoto'] ?? true) !== false, 'location' => ($set['punchLocation'] ?? true) !== false, 'onSite' => !empty($set['punchOnSite']), 'hasHotel' => isset($set['lat'], $set['lng']) && $set['lat'] !== '' && $set['lng'] !== '', 'radius' => (int)($set['radius'] ?? 200)], 'now' => date('Y-m-d H:i:s')]);
}
if ($action === 'punch') {
  $st = myStaff($U); $type = (string)($in['type'] ?? ''); if (!in_array($type, ['in', 'out'], true)) bad('Bad request.');
  $set = jg_get('settings', 'hotel') ?: [];
  $loc = null; $lat = $in['lat'] ?? null; $lng = $in['lng'] ?? null;
  if (is_numeric($lat) && is_numeric($lng) && abs((float)$lat) <= 90 && abs((float)$lng) <= 180) $loc = ['lat' => round((float)$lat, 6), 'lng' => round((float)$lng, 6), 'acc' => is_numeric($in['acc'] ?? null) ? (int)round((float)$in['acc']) : null];
  if (!$loc && ($set['punchLocation'] ?? true) !== false) bad('Your location is needed. Allow location for this site in the phone’s browser and switch on GPS, then try again.');
  $photo = null; $pid = (string)($in['photo'] ?? '');
  if ($pid !== '') {
    $s = $db->prepare("SELECT id, name, mime, size, created_at FROM jg_files WHERE id = ? AND kind = 'attendance' AND created_by = ?"); $s->execute([$pid, $who]); $f = $s->fetch();
    if (!$f || strtotime((string)$f['created_at']) < time() - 900) bad('Please take the selfie again.');
    $photo = ['id' => $f['id'], 'name' => $f['name'], 'mime' => $f['mime'], 'size' => (int)$f['size'], 'kind' => 'attendance'];
  }
  if (!$photo && ($set['punchPhoto'] ?? true) !== false) bad('A selfie is needed to mark attendance.');
  $dist = null;
  if ($loc && isset($set['lat'], $set['lng']) && is_numeric($set['lat']) && is_numeric($set['lng'])) {
    $dist = metres((float)$set['lat'], (float)$set['lng'], $loc['lat'], $loc['lng']); $radius = max(30, (int)($set['radius'] ?? 200));
    if (!empty($set['punchOnSite']) && $dist > $radius + min(150, (int)($loc['acc'] ?? 0))) bad("You are about " . ($dist >= 1000 ? round($dist / 1000, 1) . ' km' : $dist . ' m') . " from the hotel. Attendance can only be marked at the hotel.");
  }
  $today = date('Y-m-d'); $att = jg_get('attendance', "{$today}_{$st['id']}");
  if ($type === 'out' && (!$att || empty($att['inAt']))) {   // night shift: checking out after midnight closes yesterday's record
    $y = jg_get('attendance', date('Y-m-d', strtotime('-1 day')) . "_{$st['id']}");
    if ($y && !empty($y['inAt']) && empty($y['outAt']) && strtotime($y['inAt']) > time() - 16 * 3600) $att = $y;
  }
  $att = $att ?: ['id' => "{$today}_{$st['id']}", 'date' => $today, 'staffId' => $st['id'], 'status' => '', 'in' => '', 'out' => '', 'ot' => 0];
  $now = date('Y-m-d H:i:s'); $hm = date('H:i');
  if ($type === 'in') {
    if (!empty($att['inAt'])) bad('You already checked in today at ' . substr($att['inAt'], 11, 5) . '.');
    $att['status'] = in_array($att['status'] ?? '', ['H', 'P'], true) ? $att['status'] : 'P'; $att['in'] = $hm; $att['inAt'] = $now; $att['inPhoto'] = $photo; $att['inLoc'] = $loc; $att['inDist'] = $dist;
  } else {
    if (empty($att['inAt'])) bad('Check in first.');
    if (!empty($att['outAt'])) bad('You already checked out at ' . substr($att['outAt'], 11, 5) . '.');
    $att['out'] = $hm; $att['outAt'] = $now; $att['outPhoto'] = $photo; $att['outLoc'] = $loc; $att['outDist'] = $dist; $att['hours'] = round((strtotime($now) - strtotime($att['inAt'])) / 3600, 2);
  }
  $att['via'] = 'app'; $att['updatedBy'] = $who; $att['updatedAt'] = $now;
  jg_put('attendance', $att, $who); jg_log($who, 'check ' . $type, 'attendance', $att['id'], $dist === null ? '' : "$dist m from hotel");
  out(['ok' => true, 'record' => $att]);
}
/* ---------- leave: staff apply from the app, a manager approves; approved days go into attendance and so into payroll ---------- */
function leaveQuota(): array { $set = jg_get('settings', 'hotel') ?: []; $q = []; foreach (LEAVE_QUOTA as $k => $d) $q[$k] = isset($set['leaveQuota'][$k]) && is_numeric($set['leaveQuota'][$k]) ? (float)$set['leaveQuota'][$k] : $d; return $q; }
function staffLeaves(string $sid): array {
  $out = []; $s = jg_db()->prepare("SELECT data FROM jg_records WHERE collection = 'leaves'"); $s->execute();
  foreach ($s->fetchAll() as $r) { $d = json_decode($r['data'], true); if (($d['staffId'] ?? '') === $sid) $out[] = $d; }
  usort($out, fn($a, $b) => strcmp($b['from'], $a['from'])); return $out;
}
/* days already used (approved) or asked for (pending) this year, by type */
function leaveUsed(string $sid, string $year, string $skip = ''): array {
  $u = []; foreach (staffLeaves($sid) as $l) if ($l['id'] !== $skip && in_array($l['status'], ['Approved', 'Pending'], true) && substr($l['from'], 0, 4) === $year) { $k = $l['type'] . ($l['status'] === 'Pending' ? '_p' : ''); $u[$k] = ($u[$k] ?? 0) + (float)$l['days']; }
  return $u;
}
function leaveDays(string $from, string $to): array { $d = []; for ($t = strtotime($from); $t <= strtotime($to); $t += 86400) $d[] = date('Y-m-d', $t); return $d; }
/* write (or take back) the attendance days for an approved leave; days the person actually worked are left alone */
function leaveToAttendance(array $l, string $who, bool $undo = false): int {
  $n = 0;
  foreach (leaveDays($l['from'], $l['to']) as $day) {
    $id = "{$day}_{$l['staffId']}"; $a = jg_get('attendance', $id);
    if ($undo) { if ($a && ($a['leaveId'] ?? '') === $l['id']) { unset($a['leaveId'], $a['leaveType']); $a['status'] = ''; $a['updatedBy'] = $who; $a['updatedAt'] = date('Y-m-d H:i:s'); jg_put('attendance', $a, $who); $n++; } continue; }
    if ($a && !empty($a['inAt'])) continue;
    $a = $a ?: ['id' => $id, 'date' => $day, 'staffId' => $l['staffId'], 'in' => '', 'out' => '', 'ot' => 0];
    $a['status'] = $l['type'] === 'LOP' ? 'A' : (!empty($l['half']) ? 'H' : 'L'); $a['leaveId'] = $l['id']; $a['leaveType'] = $l['type'];
    $a['updatedBy'] = $who; $a['updatedAt'] = date('Y-m-d H:i:s'); jg_put('attendance', $a, $who); $n++;
  }
  return $n;
}
if ($action === 'applyLeave') {
  $mgr = in_array($U['role'], ['admin', 'manager'], true);
  $sid = $mgr && !empty($in['staffId']) ? (string)$in['staffId'] : (myStaff($U))['id'];
  $st = jg_get('staff', $sid); if (!$st) bad('Choose a staff member.');
  $type = (string)($in['type'] ?? ''); if (!isset(LEAVE_TYPES[$type])) bad('Choose the type of leave.');
  $from = (string)($in['from'] ?? ''); $to = (string)($in['to'] ?? $from); $half = !empty($in['half']) && $from === $to;
  foreach ([$from, $to] as $dt) if (!preg_match('/^\d{4}-\d\d-\d\d$/', $dt) || !strtotime($dt)) bad('Choose the dates.');
  if ($to < $from) bad('The last day is before the first day.');
  if (!$mgr && $from < date('Y-m-d', strtotime('-30 days'))) bad('Leave more than 30 days ago can only be added by the manager.');
  if (substr($from, 0, 4) !== substr($to, 0, 4)) bad('Please split leave that crosses the new year into two requests.');
  $days = $half ? 0.5 : count(leaveDays($from, $to)); if ($days > 60) bad('A single request can be for up to 60 days.');
  $reason = mb_substr(trim((string)($in['reason'] ?? '')), 0, 300); if ($reason === '' && !$mgr) bad('Please write a short reason.');
  foreach (staffLeaves($sid) as $l) if (in_array($l['status'], ['Pending', 'Approved'], true) && $l['from'] <= $to && $from <= $l['to']) bad("These dates overlap {$l['id']} ({$l['status']}, " . date('j M', strtotime($l['from'])) . ' – ' . date('j M', strtotime($l['to'])) . ').');
  $att = null; if (is_array($in['attachment'] ?? null) && preg_match('/^F[0-9a-f]{6}[0-9a-f]+$/i', (string)($in['attachment']['id'] ?? '')) ) {
    $q = $db->prepare("SELECT id, name, mime, size FROM jg_files WHERE id = ? AND kind = 'leave'"); $q->execute([$in['attachment']['id']]); $f = $q->fetch();
    if ($f) $att = ['id' => $f['id'], 'name' => $f['name'], 'mime' => $f['mime'], 'size' => (int)$f['size'], 'kind' => 'leave'];
  }
  $quota = leaveQuota(); $used = leaveUsed($sid, substr($from, 0, 4)); $left = isset($quota[$type]) && $quota[$type] > 0 ? $quota[$type] - ($used[$type] ?? 0) - ($used[$type . '_p'] ?? 0) : null;
  $now = date('Y-m-d H:i:s');
  $db->beginTransaction();
  $l = ['id' => jg_next('leaves', 'LV-', 4), 'staffId' => $sid, 'staffName' => $st['name'], 'dept' => $st['dept'] ?? '', 'type' => $type, 'from' => $from, 'to' => $to, 'half' => $half, 'days' => $days, 'reason' => $reason, 'attachment' => $att,
        'overBalance' => $left !== null && $days > $left, 'status' => 'Pending', 'appliedAt' => $now, 'appliedBy' => $who, 'createdBy' => $who, 'createdAt' => $now, 'updatedBy' => $who, 'updatedAt' => $now];
  if ($mgr && !empty($in['approve'])) { $l['status'] = 'Approved'; $l['decidedBy'] = $who; $l['decidedAt'] = $now; $l['note'] = 'Added by the manager'; leaveToAttendance($l, $who); }
  jg_put('leaves', $l, $who); $db->commit();
  jg_log($who, 'leave ' . strtolower($l['status']), 'leaves', $l['id'], "{$st['name']} $type $from – $to");
  out(['ok' => true, 'leave' => $l]);
}
if ($action === 'decideLeave' || $action === 'cancelLeave') {
  $l = jg_get('leaves', (string)($in['id'] ?? '')); if (!$l) bad('Leave request not found.');
  $mgr = in_array($U['role'], ['admin', 'manager'], true); $now = date('Y-m-d H:i:s');
  $db->beginTransaction();
  if ($action === 'decideLeave') {
    if (!$mgr) { $db->rollBack(); bad('Only a manager can approve leave.', 403); }
    if ($l['status'] !== 'Pending') { $db->rollBack(); bad("This request is already {$l['status']}."); }
    $ok = !empty($in['approve']); $l['status'] = $ok ? 'Approved' : 'Rejected'; $l['note'] = mb_substr(trim((string)($in['note'] ?? '')), 0, 200);
    if (!$ok && $l['note'] === '') { $db->rollBack(); bad('Please give a reason for rejecting.'); }
    $l['decidedBy'] = $who; $l['decidedAt'] = $now; if ($ok) $l['marked'] = leaveToAttendance($l, $who);
  } else {
    $own = !empty($U['staff_id']) && $U['staff_id'] === $l['staffId'];
    if (!$mgr && !$own) { $db->rollBack(); bad('You can only cancel your own leave.', 403); }
    if (!in_array($l['status'], ['Pending', 'Approved'], true)) { $db->rollBack(); bad("This request is already {$l['status']}."); }
    if (!$mgr && $l['status'] === 'Approved' && $l['from'] <= date('Y-m-d')) { $db->rollBack(); bad('This leave has started. Ask the manager to change it.'); }
    if ($l['status'] === 'Approved') leaveToAttendance($l, $who, true);
    $l['status'] = 'Cancelled'; $l['cancelledBy'] = $who; $l['cancelledAt'] = $now;
  }
  $l['updatedBy'] = $who; $l['updatedAt'] = $now; jg_put('leaves', $l, $who); $db->commit();
  jg_log($who, 'leave ' . strtolower($l['status']), 'leaves', $l['id'], "{$l['staffName']} {$l['type']} {$l['from']} – {$l['to']}");
  out(['ok' => true, 'leave' => $l]);
}

/* a manager saving the day register must not wipe what staff recorded from their phones */
const PUNCH_FIELDS = ['inAt', 'inPhoto', 'inLoc', 'inDist', 'outAt', 'outPhoto', 'outLoc', 'outDist', 'hours', 'via'];
function keepPunch(?array $old, array $d): array {
  if (!$old || empty($old['inAt'])) return $d;
  foreach (PUNCH_FIELDS as $k) if (array_key_exists($k, $old) && !array_key_exists($k, $d)) $d[$k] = $old[$k];
  if (($d['in'] ?? '') === '' && !empty($old['in'])) $d['in'] = $old['in']; if (($d['out'] ?? '') === '' && !empty($old['out'])) $d['out'] = $old['out'];
  return $d;
}

if ($action === 'roomCharge') {       // restaurant / bar bill added to a guest's room bill
  if (!in_array($U['role'], ROOM_CHARGE_ROLES, true)) bad('Your login cannot post to room bills.', 403);
  $id = (string)($in['booking'] ?? ''); $amount = round((float)($in['amount'] ?? 0), 2); $desc = mb_substr(trim((string)($in['desc'] ?? '')), 0, 120);
  if ($amount <= 0 || $amount > 1000000 || $desc === '') bad('Bad charge.');
  $db->beginTransaction();
  $b = jg_get('bookings', $id);
  if (!$b || ($b['status'] ?? '') !== 'Checked-in') { $db->rollBack(); bad('That guest is not checked in.'); }
  $b['charges'] = array_values(array_merge($b['charges'] ?? [], [['date' => date('Y-m-d'), 'desc' => $desc, 'amount' => $amount, 'by' => $who]])); $b['updatedBy'] = $who; $b['updatedAt'] = date('Y-m-d H:i:s');
  jg_put('bookings', $b, $who); $db->commit(); jg_log($who, 'room charge', 'bookings', $id, "$desc $amount");
  out(['ok' => true, 'doc' => redact($U, 'bookings', $b)]);
}

if ($action === 'save') {
  $c = (string)($in['collection'] ?? ''); $d = $in['doc'] ?? null;
  if (!array_key_exists($c, COLLECTIONS) || !is_array($d)) bad('Unknown record type.');
  if ($c === 'leaves') bad('Use Approve, Reject or Cancel for leave.');
  if (!can($U, $c, 'w')) bad('Your login cannot change this.', 403);
  if (strlen(json_encode($d)) > 200000) bad('This record is too large.');
  $id = (string)($d['id'] ?? '');
  if ($id === '') {
    if (!COLLECTIONS[$c]) bad('Missing record id.'); [$pfx, $pad] = COLLECTIONS[$c];
    if ($c === 'bills') { $bar = ($d['dept'] ?? '') === 'Bar'; $id = jg_next($bar ? 'bills_bar' : 'bills_rest', $bar ? 'BB-' : 'RB-', 5); }   // separate bill numbers for restaurant and bar
    else $id = jg_next($c, $pfx . '-', $pad);
  }
  if (!preg_match('/^[A-Za-z0-9_.:-]{1,64}$/', $id)) bad('Bad record id.');
  $d['id'] = $id;
  if ($c === 'staff' && $U['role'] === 'frontdesk') bad('Your login cannot change staff details.', 403);
  $s = $db->prepare('SELECT data FROM jg_records WHERE collection = ? AND id = ?'); $s->execute([$c, $id]); $old = $s->fetchColumn();
  $old = $old ? json_decode($old, true) : null;
  if ($old && ($old['status'] ?? '') === 'Paid' && $c === 'payroll' && !in_array($U['role'], ['admin', 'manager'], true)) bad('A paid salary can only be changed by a manager.', 403);
  if ($c === 'attendance') $d = keepPunch($old, $d);
  $d['updatedBy'] = $who; $d['updatedAt'] = date('Y-m-d H:i:s'); if (!$old) { $d['createdBy'] = $who; $d['createdAt'] = $d['updatedAt']; } else { $d['createdBy'] = $old['createdBy'] ?? ''; $d['createdAt'] = $old['createdAt'] ?? ''; }
  jg_put($c, $d, $who); jg_log($who, $old ? 'update' : 'create', $c, $id, (string)($d['name'] ?? $d['guest'] ?? $d['status'] ?? ''));
  out(['ok' => true, 'doc' => redact($U, $c, $d)]);
}

if ($action === 'saveMany') {       // e.g. a whole day of attendance or a month of payroll
  $c = (string)($in['collection'] ?? ''); $docs = $in['docs'] ?? null;
  if (!in_array($c, ['attendance', 'payroll', 'orders', 'bar', 'rooms', 'tasks'], true) || !is_array($docs) || count($docs) > 500) bad('Bad request.');
  if (!can($U, $c, 'w')) bad('Your login cannot change this.', 403);
  $saved = []; $db->beginTransaction();
  foreach ($docs as $d) { if (!is_array($d) || !preg_match('/^[A-Za-z0-9_.:-]{1,64}$/', (string)($d['id'] ?? ''))) continue; if ($c === 'attendance') $d = keepPunch(jg_get('attendance', (string)$d['id']), $d); $d['updatedBy'] = $who; $d['updatedAt'] = date('Y-m-d H:i:s'); jg_put($c, $d, $who); $saved[] = redact($U, $c, $d); }
  $db->commit(); jg_log($who, 'update', $c, (string)count($saved) . ' records'); out(['ok' => true, 'docs' => $saved]);
}

if ($action === 'delete') {
  $c = (string)($in['collection'] ?? ''); $id = (string)($in['id'] ?? '');
  if (!array_key_exists($c, COLLECTIONS)) bad('Unknown record type.');
  if (!in_array($U['role'], ['admin', 'manager'], true)) bad('Only a manager can delete records.', 403);
  $db->prepare('DELETE FROM jg_records WHERE collection = ? AND id = ?')->execute([$c, $id]); jg_log($who, 'delete', $c, $id); out(['ok' => true]);
}

/* ---------- logins (owner and manager) ---------- */
if ($action === 'users' || $action === 'saveUser' || $action === 'log') {
  if (!in_array($U['role'], ['admin', 'manager'], true)) bad('Only a manager can manage logins.', 403);
  if ($action === 'log') out(['ok' => true, 'log' => $db->query('SELECT at, username, action, collection, record, note FROM jg_log ORDER BY id DESC LIMIT 300')->fetchAll()]);
  if ($action === 'saveUser') {
    $id = (int)($in['id'] ?? 0); $un = strtolower(trim((string)($in['username'] ?? ''))); $nm = trim((string)($in['name'] ?? '')); $role = (string)($in['role'] ?? ''); $pw = (string)($in['password'] ?? ''); $active = !empty($in['active']) ? 1 : 0;
    $sid = trim((string)($in['staffId'] ?? '')); if ($sid !== '' && (!preg_match('/^[A-Za-z0-9_.:-]{1,64}$/', $sid) || !jg_get('staff', $sid))) bad('Choose a staff member from the list.');
    if (!isset(ROLES[$role])) bad('Choose a role.');
    if ($role === 'admin' && $U['role'] !== 'admin') bad('Only the owner can create another owner login.', 403);
    if ($id) {
      $s = $db->prepare('SELECT * FROM jg_users WHERE id = ?'); $s->execute([$id]); $t = $s->fetch(); if (!$t) bad('Login not found.');
      if ($t['role'] === 'admin' && $U['role'] !== 'admin') bad('Only the owner can change an owner login.', 403);
      if ((int)$t['id'] === (int)$U['id'] && (!$active || $role !== $U['role'])) bad('You cannot switch off or change the role of your own login.');
      $db->prepare('UPDATE jg_users SET name = ?, role = ?, active = ?, staff_id = ? WHERE id = ?')->execute([$nm, $role, $active, $sid ?: null, $id]);
      if ($pw !== '') { checkPassword($pw); $db->prepare('UPDATE jg_users SET pass = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $id]); $db->prepare('DELETE FROM jg_sessions WHERE user_id = ?')->execute([$id]); }
      if (!$active) $db->prepare('DELETE FROM jg_sessions WHERE user_id = ?')->execute([$id]);
      jg_log($who, 'update', 'logins', $t['username']);
    } else {
      if (!preg_match('/^[a-z0-9._-]{3,30}$/', $un)) bad('Username: 3 to 30 letters, numbers, dot, dash or underscore.');
      checkPassword($pw);
      $s = $db->prepare('SELECT 1 FROM jg_users WHERE username = ?'); $s->execute([$un]); if ($s->fetchColumn()) bad('That username is taken.');
      $db->prepare('INSERT INTO jg_users (username, name, role, pass, active, created_at, staff_id) VALUES (?, ?, ?, ?, 1, ?, ?)')->execute([$un, $nm ?: $un, $role, password_hash($pw, PASSWORD_DEFAULT), date('Y-m-d H:i:s'), $sid ?: null]);
      jg_log($who, 'create', 'logins', $un);
    }
  }
  out(['ok' => true, 'users' => array_map(fn($r) => ['id' => (int)$r['id'], 'username' => $r['username'], 'name' => $r['name'], 'role' => $r['role'], 'active' => (int)$r['active'], 'created' => $r['created_at'], 'staffId' => (string)($r['staff_id'] ?? '')], $db->query('SELECT * FROM jg_users ORDER BY id')->fetchAll())]);
}

if ($action === 'password') {
  $cur = (string)($in['current'] ?? ''); $new = (string)($in['password'] ?? '');
  if (!password_verify($cur, $U['pass'])) bad('Your current password is not correct.');
  checkPassword($new); $db->prepare('UPDATE jg_users SET pass = ? WHERE id = ?')->execute([password_hash($new, PASSWORD_DEFAULT), $U['id']]);
  $db->prepare('DELETE FROM jg_sessions WHERE user_id = ? AND token <> ?')->execute([$U['id'], hash('sha256', $tok)]);
  jg_log($who, 'password'); out(['ok' => true]);
}

bad('Unknown action.');
