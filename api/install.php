<?php
/* One-time setup: creates the tables, writes api/config.php and the first administrator account.
   Refuses to run again once config.php exists (delete that file to reinstall). */
declare(strict_types=1);
require __DIR__ . '/schema.php';
$done = is_file(__DIR__ . '/config.php'); $err = ''; $ok = false;
if (PHP_VERSION_ID < 70400) { http_response_code(500); exit('This needs PHP 7.4 or newer. In cPanel open “Select PHP Version” (or MultiPHP Manager) and choose PHP 8.1 or later for this domain.'); }
if (!extension_loaded('pdo')) { http_response_code(500); exit('The PHP “pdo” extension is off. In cPanel → Select PHP Version → Extensions, tick pdo and pdo_mysql.'); }
$v = fn(string $k, string $d = '') => htmlspecialchars((string)($_POST[$k] ?? $d), ENT_QUOTES);
if (!$done && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  try {
    $engine = ($_POST['engine'] ?? 'mysql') === 'sqlite' ? 'sqlite' : 'mysql';
    $user = strtolower(trim((string)($_POST['admin_user'] ?? ''))); $pw = (string)($_POST['admin_pass'] ?? ''); $name = trim((string)($_POST['admin_name'] ?? '')) ?: 'Administrator';
    if (!preg_match('/^[a-z0-9._-]{3,30}$/', $user)) throw new Exception('Admin username: 3–30 letters, numbers, dot, dash or underscore.');
    if (strlen($pw) < 8 || !preg_match('/\d/', $pw)) throw new Exception('Admin password needs at least 8 characters including a number.');
    if ($pw !== (string)($_POST['admin_pass2'] ?? '')) throw new Exception('The two passwords do not match.');
    if ($engine === 'sqlite') {
      if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) throw new Exception('This server has no SQLite support. Use MySQL.');
      $dir = __DIR__ . '/data'; if (!is_dir($dir) && !mkdir($dir, 0700, true)) throw new Exception('Could not create the api/data folder. Check folder permissions.');
      file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n"); file_put_contents($dir . '/index.html', '');
      $dsn = 'sqlite:' . $dir . '/elsha-' . bin2hex(random_bytes(6)) . '.sqlite'; $dbUser = null; $dbPass = null;
    } else {
      $host = trim((string)($_POST['db_host'] ?? 'localhost')) ?: 'localhost'; $dbn = trim((string)($_POST['db_name'] ?? ''));
      if (!preg_match('/^[A-Za-z0-9_\-]+$/', $dbn)) throw new Exception('Enter the database name exactly as cPanel shows it (for example cpaneluser_elsha).');
      if (!preg_match('/^[A-Za-z0-9_.\-:]+$/', $host)) throw new Exception('The database host looks wrong. It is usually localhost.');
      if (!in_array('mysql', PDO::getAvailableDrivers(), true)) throw new Exception('The PHP “pdo_mysql” extension is off. In cPanel → Select PHP Version → Extensions, tick pdo_mysql, then try again.');
      $dsn = "mysql:host=$host;dbname=$dbn;charset=utf8mb4"; $dbUser = (string)($_POST['db_user'] ?? ''); $dbPass = (string)($_POST['db_pass'] ?? '');
    }
    try { $db = new PDO($dsn, $dbUser, $dbPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]); }
    catch (Throwable $e) { throw new Exception('Could not connect to the database. Check the name, user and password, and that the user is added to the database with ALL PRIVILEGES. (' . $e->getMessage() . ')'); }
    $T = 'jj_'; foreach (jj_schema($engine, $T) as $sql) $db->exec($sql);
    $origins = array_values(array_filter(array_map('trim', explode(',', (string)($_POST['origins'] ?? '')))));
    $cfg = ['dsn' => $dsn, 'user' => $dbUser, 'pass' => $dbPass, 'prefix' => $T, 'salt' => bin2hex(random_bytes(16)), 'origins' => $origins, 'public_confirm' => false];
    $id = 'USR' . strtoupper(bin2hex(random_bytes(3)));
    $doc = ['id' => $id, 'name' => $name, 'username' => $user, 'role' => 'admin', 'status' => 'Active', 'lastLogin' => '', 'createdAt' => gmdate('c')];
    $secret = password_hash(hash('sha256', $user . ':jacknjose:' . $pw), PASSWORD_DEFAULT); // the website sends this same SHA-256 of the password, never the password itself
    $db->prepare("DELETE FROM {$T}records WHERE collection = 'staffUsers' AND id = ?")->execute([$id]);
    $db->prepare("INSERT INTO {$T}records (collection, id, data, secret, created_at, updated_at) VALUES ('staffUsers', ?, ?, ?, ?, ?)")->execute([$id, json_encode($doc), $secret, gmdate('Y-m-d H:i:s'), gmdate('Y-m-d H:i:s')]);
    if (file_put_contents(__DIR__ . '/config.php', "<?php\n/* Created by install.php. Keep this file private. Delete it to run the installer again. */\nreturn " . var_export($cfg, true) . ";\n") === false) throw new Exception('Tables were created, but config.php could not be written. Make the api folder writable (permissions 755) and try again.');
    @chmod(__DIR__ . '/config.php', 0600); $ok = true; $done = true;
  } catch (Throwable $e) { $err = $e->getMessage(); }
}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Set up the database · Elsha by Jack &amp; Jose</title>
<style>body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#f3f7fa;color:#0c1e33;margin:0;padding:24px 16px;line-height:1.5}main{max-width:640px;margin:0 auto;background:#fff;border:1px solid #d4e0ea;border-radius:16px;padding:28px}h1{font-size:1.5rem;margin:0 0 6px}h2{font-size:1.05rem;margin:22px 0 8px}label{display:block;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#46586e;margin-top:12px}input,select{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d4e0ea;border-radius:10px;font:inherit;margin-top:4px}button{margin-top:22px;background:#0b57b7;color:#fff;border:0;border-radius:10px;padding:12px 22px;font:inherit;font-weight:700;cursor:pointer}.note{background:#dcebfb;border-radius:10px;padding:12px 14px;font-size:.9rem}.err{background:#fbe3e3;color:#a12428}.ok{background:#d8f3e6}small{color:#6b7c91}ol{padding-left:20px}code{background:#e9f1f7;padding:1px 5px;border-radius:4px}</style></head><body><main>
<h1>Set up the database</h1>
<?php if ($ok): ?>
  <p class="note ok"><b>Done.</b> The tables are created and your administrator account is ready.</p>
  <ol><li>Open <a href="../#login">the website’s staff sign-in</a> and sign in as <code><?= htmlspecialchars($user) ?></code>.</li><li>In <b>Staff dashboard</b> you can load starter listings and add your staff under <b>Staff users</b>.</li><li>For safety, delete <code>api/install.php</code> in cPanel File Manager.</li></ol>
<?php elseif ($done): ?>
  <p class="note">The database is already set up. To start over, delete <code>api/config.php</code> in cPanel File Manager and reload this page.</p><p><a href="../">Go to the website</a></p>
<?php else: ?>
  <p>This runs once. It creates the tables and your administrator sign-in.</p>
  <?php if ($err): ?><p class="note err"><b>Not installed:</b> <?= htmlspecialchars($err) ?></p><?php endif; ?>
  <div class="note"><b>First, in cPanel → MySQL® Databases:</b><ol><li>Create a database (for example <code>elsha</code>).</li><li>Create a database user with a strong password.</li><li>Add the user to the database with <b>ALL PRIVILEGES</b>.</li></ol>cPanel adds your account name in front, like <code>cpaneluser_elsha</code>. Type the full names below.</div>
  <form method="post" autocomplete="off">
    <h2>Database</h2>
    <label for="engine">Database type</label><select id="engine" name="engine"><option value="mysql">MySQL / MariaDB (recommended)</option><option value="sqlite" <?= ($_POST['engine'] ?? '') === 'sqlite' ? 'selected' : '' ?>>Built-in file database (no MySQL needed, for small sites)</option></select>
    <label for="db_host">Database host</label><input id="db_host" name="db_host" value="<?= $v('db_host', 'localhost') ?>">
    <label for="db_name">Database name</label><input id="db_name" name="db_name" value="<?= $v('db_name') ?>" placeholder="cpaneluser_elsha">
    <label for="db_user">Database user</label><input id="db_user" name="db_user" value="<?= $v('db_user') ?>" placeholder="cpaneluser_elsha">
    <label for="db_pass">Database password</label><input id="db_pass" name="db_pass" type="password">
    <h2>Your administrator account</h2>
    <label for="admin_name">Your name</label><input id="admin_name" name="admin_name" value="<?= $v('admin_name') ?>" required>
    <label for="admin_user">Username</label><input id="admin_user" name="admin_user" value="<?= $v('admin_user', 'admin') ?>" required>
    <label for="admin_pass">Password <small>(8+ characters with a number)</small></label><input id="admin_pass" name="admin_pass" type="password" required>
    <label for="admin_pass2">Repeat password</label><input id="admin_pass2" name="admin_pass2" type="password" required>
    <h2>Advanced <small>(leave empty if the website and this api folder are on the same address)</small></h2>
    <label for="origins">Other website addresses allowed to use this database</label><input id="origins" name="origins" value="<?= $v('origins') ?>" placeholder="https://elsha.jacknjose.co.in">
    <button>Create tables and finish</button>
  </form>
<?php endif; ?>
</main></body></html>
