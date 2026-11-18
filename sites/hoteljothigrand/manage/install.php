<?php
/* Hotel Jothi Grand: connect the management system to a cPanel MySQL database (one time).
   Writes manage/config.php and moves any data already saved in the built-in SQLite database. */
declare(strict_types=1);
require __DIR__ . '/db.php';
header('X-Content-Type-Options: nosniff'); header('X-Frame-Options: DENY'); header('Cache-Control: no-store');
function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

$cfg = jg_config(); $done = !empty($cfg['name']); $msg = ''; $ok = '';
$sqlite = null; $owners = 0;
if (!$done && jg_has_sqlite()) { try { $sqlite = jg_connect([]); jg_schema($sqlite); $owners = (int)$sqlite->query("SELECT COUNT(*) FROM jg_users WHERE role = 'admin' AND active = 1")->fetchColumn(); } catch (Throwable $e) { $sqlite = null; } }

if (!$done && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  $host = trim((string)($_POST['host'] ?? 'localhost')); $name = trim((string)($_POST['name'] ?? '')); $user = trim((string)($_POST['user'] ?? '')); $pass = (string)($_POST['pass'] ?? '');
  $from = parse_url((string)($_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? ''), PHP_URL_HOST); $here = preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? ''));
  try {
    if (!$from || strcasecmp((string)$from, $here) !== 0) throw new RuntimeException('Please submit this form from this page.');
    if ($owners > 0) {   // the system is already in use: only its owner may move it
      $s = $sqlite->prepare("SELECT pass FROM jg_users WHERE username = ? AND role = 'admin' AND active = 1"); $s->execute([strtolower(trim((string)($_POST['owner'] ?? '')))]); $hash = $s->fetchColumn();
      if (!$hash || !password_verify((string)($_POST['ownerpass'] ?? ''), (string)$hash)) { sleep(1); throw new RuntimeException('The owner username or password is not correct.'); }
    }
    if (!preg_match('/^(localhost|127\.0\.0\.1)(:\d{2,5})?$/', $host)) throw new RuntimeException('The database server must be on this hosting account (usually “localhost”).');
    if (!preg_match('/^[A-Za-z0-9_]{1,64}$/', $name) || !preg_match('/^[A-Za-z0-9_]{1,64}$/', $user)) throw new RuntimeException('Copy the database name and user exactly as cPanel shows them (letters, numbers and _ only), e.g. cpuser_jothigrand.');
    $new = ['host' => $host, 'name' => $name, 'user' => $user, 'pass' => $pass];
    try { $my = jg_connect($new); } catch (Throwable $e) {
      $m = $e->getMessage();
      throw new RuntimeException(stripos($m, 'denied') !== false ? 'MySQL refused the user or password, or the user has not been added to this database with ALL PRIVILEGES (cPanel → MySQL Databases → Add User To Database).' : (stripos($m, 'Unknown database') !== false ? 'There is no database with that name. Check the full name in cPanel → MySQL Databases.' : 'Could not reach MySQL. Check the server name (usually localhost).'));
    }
    jg_schema($my);
    $moved = '';
    $hasData = (int)$my->query('SELECT COUNT(*) FROM jg_users')->fetchColumn() + (int)$my->query('SELECT COUNT(*) FROM jg_records')->fetchColumn();
    if ($sqlite && !$hasData) {
      $my->beginTransaction();
      $n = ['records' => 0, 'users' => 0];
      foreach ($sqlite->query('SELECT * FROM jg_records') as $r) { $my->prepare('INSERT INTO jg_records (collection, id, data, created_at, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?)')->execute([$r['collection'], $r['id'], $r['data'], $r['created_at'], $r['updated_at'], $r['updated_by']]); $n['records']++; }
      foreach ($sqlite->query('SELECT * FROM jg_users') as $r) { $my->prepare('INSERT INTO jg_users (id, username, name, role, pass, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([$r['id'], $r['username'], $r['name'], $r['role'], $r['pass'], $r['active'], $r['created_at']]); $n['users']++; }
      foreach ($sqlite->query('SELECT * FROM jg_counters') as $r) $my->prepare('INSERT INTO jg_counters (name, value) VALUES (?, ?)')->execute([$r['name'], $r['value']]);
      foreach ($sqlite->query('SELECT * FROM jg_log ORDER BY id') as $r) $my->prepare('INSERT INTO jg_log (at, username, action, collection, record, note) VALUES (?, ?, ?, ?, ?, ?)')->execute([$r['at'], $r['username'], $r['action'], $r['collection'], $r['record'], $r['note']]);
      $my->commit();
      $moved = "Moved {$n['records']} records and {$n['users']} logins from the built-in database. The old file stays in manage/data as a backup.";
    } elseif ($hasData) $moved = 'This MySQL database already had hotel data, so it was kept as it is.';
    $php = "<?php\n/* Hotel Jothi Grand management: MySQL connection (written by install.php). Keep this file private. */\nreturn " . var_export($new, true) . ";\n";
    if (@file_put_contents(JG_CONFIG, $php, LOCK_EX) === false) throw new RuntimeException('Connected, but could not save manage/config.php. Make the manage folder writable (permissions 755) and try again.');
    @chmod(JG_CONFIG, 0600);
    jg_log('install', 'mysql', '', $name, $moved);
    $ok = 'Connected to MySQL database ' . $name . '. ' . $moved; $done = true; $cfg = $new;
  } catch (Throwable $e) { $msg = $e instanceof RuntimeException ? $e->getMessage() : 'Something went wrong while setting up the database.'; }
}

$status = '';
if ($done && !$ok) { try { $c = jg_db()->query('SELECT COUNT(*) FROM jg_records')->fetchColumn(); $status = 'Connected to MySQL database <b>' . h((string)$cfg['name']) . '</b> · ' . (int)$c . ' records.'; } catch (Throwable $e) { $status = '<b style="color:#ffb3c9">The saved MySQL connection is not working.</b> If the password was changed in cPanel, delete manage/config.php in File Manager and open this page again.'; } }
?><!doctype html>
<html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Connect MySQL · Hotel Jothi Grand</title>
<link rel="stylesheet" href="app.css"><style>.login form{width:min(520px,100%)}.login ol{margin:0;padding-left:20px;color:#c8d0ec;font-size:.9rem;display:grid;gap:4px}.ok{background:rgba(18,164,107,.18);border:1px solid rgba(18,164,107,.5);border-radius:12px;padding:12px 14px;color:#c9f5df}.login hr{border:0;border-top:1px solid rgba(255,255,255,.14);margin:4px 0}</style></head>
<body><div class="login"><form method="post" autocomplete="off"><img src="../img/logo-gold-light-360.png" alt=""><h1>MYSQL DATABASE</h1>
<?php if ($done): ?>
  <?php if ($ok): ?><div class="ok"><?= h($ok) ?></div><?php else: ?><p><?= $status ?></p><?php endif; ?>
  <p>All hotel records are now saved in your cPanel MySQL database. Keep regular backups in cPanel → Backup.</p>
  <a class="btn btn-p" href="./">Open the management system</a>
<?php else: ?>
  <p>Connect the hotel management system to your cPanel MySQL database. Do this once.</p>
  <ol><li>In cPanel open <b>MySQL® Databases</b>.</li><li>Create a database, e.g. <b>jothigrand</b> (cPanel adds your prefix).</li><li>Create a user with a strong password.</li><li>Under <b>Add User To Database</b> add the user to the database and tick <b>ALL PRIVILEGES</b>.</li><li>Enter the names below exactly as cPanel shows them.</li></ol><hr>
  <label>Database name<input name="name" required placeholder="cpuser_jothigrand" value="<?= h((string)($_POST['name'] ?? '')) ?>"></label>
  <label>Database user<input name="user" required placeholder="cpuser_jguser" value="<?= h((string)($_POST['user'] ?? '')) ?>"></label>
  <label>Database password<input name="pass" type="password" required autocomplete="new-password"></label>
  <label>Database server<input name="host" value="<?= h((string)($_POST['host'] ?? 'localhost')) ?>"></label>
  <?php if ($owners > 0): ?><hr><p>The system already has data. Confirm with the <b>owner</b> login to move it into MySQL.</p>
  <label>Owner username<input name="owner" required autocomplete="username"></label><label>Owner password<input name="ownerpass" type="password" required autocomplete="current-password"></label><?php endif; ?>
  <div class="err"><?= h($msg) ?></div><button class="btn btn-p">Connect &amp; move data</button>
<?php endif; ?>
</form></div></body></html>
