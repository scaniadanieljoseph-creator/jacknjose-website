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
const ROLES = ['admin' => 'Owner / Admin', 'manager' => 'Manager', 'frontdesk' => 'Front desk', 'accounts' => 'Accounts'];
const PERMS = [
  'frontdesk' => ['rooms' => 'rw', 'bookings' => 'rw', 'guests' => 'rw', 'enquiries' => 'rw', 'attendance' => 'rw', 'staff' => 'r', 'settings' => 'r', 'income' => 'rw'],
  'accounts'  => ['rooms' => 'r', 'bookings' => 'r', 'guests' => 'r', 'enquiries' => 'r', 'staff' => 'rw', 'attendance' => 'rw', 'payroll' => 'rw', 'expenses' => 'rw', 'income' => 'rw', 'settings' => 'r'],
];
const COLLECTIONS = ['rooms' => ['RM', 3], 'bookings' => ['BK', 4], 'guests' => ['GU', 4], 'enquiries' => ['WEB', 4], 'staff' => ['EMP', 3], 'attendance' => null, 'payroll' => null, 'expenses' => ['EX', 4], 'income' => ['IN', 4], 'settings' => null];

function can(array $u, string $c, string $mode): bool {
  if (in_array($u['role'], ['admin', 'manager'], true)) return true;
  return strpos(PERMS[$u['role']][$c] ?? '', $mode) !== false;
}
/* front desk does not see salaries or bank details */
function redact(array $u, string $c, array $d): array {
  if ($c === 'staff' && $u['role'] === 'frontdesk') return array_intersect_key($d, array_flip(['id', 'name', 'role', 'dept', 'status', 'phone']));
  return $d;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') bad('Use POST', 405);
$in = json_decode(file_get_contents('php://input', false, null, 0, 2000000) ?: '', true);
if (!is_array($in)) bad('Bad request');
$action = (string)($in['action'] ?? '');

try { $db = jg_db(); } catch (Throwable $e) { bad('The database could not be opened. Check that the manage/data folder is writable.', 503); }
$ip = $_SERVER['REMOTE_ADDR'] ?? '';

/* ---------- first-time setup and sign-in ---------- */
$userCount = (int)$db->query('SELECT COUNT(*) FROM jg_users')->fetchColumn();
if ($action === 'status') out(['ok' => true, 'needsSetup' => $userCount === 0]);

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
  out(['ok' => true, 'user' => ['id' => (int)$U['id'], 'username' => $U['username'], 'name' => $U['name'], 'role' => $U['role']], 'data' => $data, 'roles' => ROLES]);
}

if ($action === 'save') {
  $c = (string)($in['collection'] ?? ''); $d = $in['doc'] ?? null;
  if (!array_key_exists($c, COLLECTIONS) || !is_array($d)) bad('Unknown record type.');
  if (!can($U, $c, 'w')) bad('Your login cannot change this.', 403);
  if (strlen(json_encode($d)) > 200000) bad('This record is too large.');
  $id = (string)($d['id'] ?? '');
  if ($id === '') { if (!COLLECTIONS[$c]) bad('Missing record id.'); [$pfx, $pad] = COLLECTIONS[$c]; $id = jg_next($c, $pfx . '-', $pad); }
  if (!preg_match('/^[A-Za-z0-9_.:-]{1,64}$/', $id)) bad('Bad record id.');
  $d['id'] = $id;
  if ($c === 'staff' && $U['role'] === 'frontdesk') bad('Your login cannot change staff details.', 403);
  $s = $db->prepare('SELECT data FROM jg_records WHERE collection = ? AND id = ?'); $s->execute([$c, $id]); $old = $s->fetchColumn();
  $old = $old ? json_decode($old, true) : null;
  if ($old && ($old['status'] ?? '') === 'Paid' && $c === 'payroll' && !in_array($U['role'], ['admin', 'manager'], true)) bad('A paid salary can only be changed by a manager.', 403);
  $d['updatedBy'] = $who; $d['updatedAt'] = date('Y-m-d H:i:s'); if (!$old) { $d['createdBy'] = $who; $d['createdAt'] = $d['updatedAt']; } else { $d['createdBy'] = $old['createdBy'] ?? ''; $d['createdAt'] = $old['createdAt'] ?? ''; }
  jg_put($c, $d, $who); jg_log($who, $old ? 'update' : 'create', $c, $id, (string)($d['name'] ?? $d['guest'] ?? $d['status'] ?? ''));
  out(['ok' => true, 'doc' => redact($U, $c, $d)]);
}

if ($action === 'saveMany') {       // e.g. a whole day of attendance or a month of payroll
  $c = (string)($in['collection'] ?? ''); $docs = $in['docs'] ?? null;
  if (!in_array($c, ['attendance', 'payroll'], true) || !is_array($docs) || count($docs) > 500) bad('Bad request.');
  if (!can($U, $c, 'w')) bad('Your login cannot change this.', 403);
  $saved = []; $db->beginTransaction();
  foreach ($docs as $d) { if (!is_array($d) || !preg_match('/^[A-Za-z0-9_.:-]{1,64}$/', (string)($d['id'] ?? ''))) continue; $d['updatedBy'] = $who; $d['updatedAt'] = date('Y-m-d H:i:s'); jg_put($c, $d, $who); $saved[] = $d; }
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
    if (!isset(ROLES[$role])) bad('Choose a role.');
    if ($role === 'admin' && $U['role'] !== 'admin') bad('Only the owner can create another owner login.', 403);
    if ($id) {
      $s = $db->prepare('SELECT * FROM jg_users WHERE id = ?'); $s->execute([$id]); $t = $s->fetch(); if (!$t) bad('Login not found.');
      if ($t['role'] === 'admin' && $U['role'] !== 'admin') bad('Only the owner can change an owner login.', 403);
      if ((int)$t['id'] === (int)$U['id'] && (!$active || $role !== $U['role'])) bad('You cannot switch off or change the role of your own login.');
      $db->prepare('UPDATE jg_users SET name = ?, role = ?, active = ? WHERE id = ?')->execute([$nm, $role, $active, $id]);
      if ($pw !== '') { checkPassword($pw); $db->prepare('UPDATE jg_users SET pass = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $id]); $db->prepare('DELETE FROM jg_sessions WHERE user_id = ?')->execute([$id]); }
      if (!$active) $db->prepare('DELETE FROM jg_sessions WHERE user_id = ?')->execute([$id]);
      jg_log($who, 'update', 'logins', $t['username']);
    } else {
      if (!preg_match('/^[a-z0-9._-]{3,30}$/', $un)) bad('Username: 3 to 30 letters, numbers, dot, dash or underscore.');
      checkPassword($pw);
      $s = $db->prepare('SELECT 1 FROM jg_users WHERE username = ?'); $s->execute([$un]); if ($s->fetchColumn()) bad('That username is taken.');
      $db->prepare('INSERT INTO jg_users (username, name, role, pass, active, created_at) VALUES (?, ?, ?, ?, 1, ?)')->execute([$un, $nm ?: $un, $role, password_hash($pw, PASSWORD_DEFAULT), date('Y-m-d H:i:s')]);
      jg_log($who, 'create', 'logins', $un);
    }
  }
  out(['ok' => true, 'users' => array_map(fn($r) => ['id' => (int)$r['id'], 'username' => $r['username'], 'name' => $r['name'], 'role' => $r['role'], 'active' => (int)$r['active'], 'created' => $r['created_at']], $db->query('SELECT * FROM jg_users ORDER BY id')->fetchAll())]);
}

if ($action === 'password') {
  $cur = (string)($in['current'] ?? ''); $new = (string)($in['password'] ?? '');
  if (!password_verify($cur, $U['pass'])) bad('Your current password is not correct.');
  checkPassword($new); $db->prepare('UPDATE jg_users SET pass = ? WHERE id = ?')->execute([password_hash($new, PASSWORD_DEFAULT), $U['id']]);
  $db->prepare('DELETE FROM jg_sessions WHERE user_id = ? AND token <> ?')->execute([$U['id'], hash('sha256', $tok)]);
  jg_log($who, 'password'); out(['ok' => true]);
}

bad('Unknown action.');
