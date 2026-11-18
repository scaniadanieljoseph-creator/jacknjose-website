<?php
/* Hotel Jothi Grand management: database connection and tables.
   By default the data lives in an SQLite database file in manage/data/ (no setup needed on cPanel).
   To use MySQL instead, create manage/config.php returning:
     ['dsn' => 'mysql:host=localhost;dbname=CPANELUSER_jothigrand;charset=utf8mb4', 'user' => 'CPANELUSER_jg', 'pass' => '...'] */
declare(strict_types=1);

function jg_db(): PDO {
  static $db = null; if ($db) return $db;
  $cfgFile = __DIR__ . '/config.php';
  $cfg = is_file($cfgFile) ? require $cfgFile : [];
  if (empty($cfg['dsn'])) {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    if (!is_file("$dir/.htaccess")) file_put_contents("$dir/.htaccess", "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
    if (!is_file("$dir/index.html")) file_put_contents("$dir/index.html", '');
    /* the database file gets a random name that cannot be guessed from the web, kept in a PHP file that never downloads */
    $nameFile = "$dir/dbname.php";
    if (!is_file($nameFile)) file_put_contents($nameFile, "<?php return 'jothigrand-" . bin2hex(random_bytes(12)) . ".sqlite';\n", LOCK_EX);
    $cfg['dsn'] = 'sqlite:' . $dir . '/' . basename((string)require $nameFile);
  }
  $db = new PDO($cfg['dsn'], $cfg['user'] ?? null, $cfg['pass'] ?? null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  $mysql = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
  if (!$mysql) { $db->exec('PRAGMA journal_mode = WAL'); $db->exec('PRAGMA busy_timeout = 4000'); }
  $auto = $mysql ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  $txt = $mysql ? 'MEDIUMTEXT' : 'TEXT'; $key = $mysql ? 'VARCHAR(64)' : 'TEXT'; $eng = $mysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
  $db->exec("CREATE TABLE IF NOT EXISTS jg_records (collection $key NOT NULL, id $key NOT NULL, data $txt NOT NULL, created_at $key, updated_at $key, updated_by $key, PRIMARY KEY (collection, id))$eng");
  $db->exec("CREATE TABLE IF NOT EXISTS jg_users (id $auto, username $key NOT NULL UNIQUE, name $key, role $key NOT NULL, pass $txt NOT NULL, active INTEGER DEFAULT 1, created_at $key)$eng");
  $db->exec("CREATE TABLE IF NOT EXISTS jg_sessions (token $key PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL)$eng");
  $db->exec("CREATE TABLE IF NOT EXISTS jg_counters (name $key PRIMARY KEY, value INTEGER NOT NULL)$eng");
  $db->exec("CREATE TABLE IF NOT EXISTS jg_attempts (k $key NOT NULL, at INTEGER NOT NULL)$eng");
  $db->exec("CREATE TABLE IF NOT EXISTS jg_log (id $auto, at $key, username $key, action $key, collection $key, record $key, note $txt)$eng");
  return $db;
}

/* next number in a running sequence, e.g. BK-0007 */
function jg_next(string $name, string $prefix, int $pad = 4): string {
  $db = jg_db(); $db->beginTransaction();
  try {
    $s = $db->prepare('SELECT value FROM jg_counters WHERE name = ?'); $s->execute([$name]); $v = $s->fetchColumn();
    if ($v === false) { $v = 1; $db->prepare('INSERT INTO jg_counters (name, value) VALUES (?, 1)')->execute([$name]); }
    else { $v = (int)$v + 1; $db->prepare('UPDATE jg_counters SET value = ? WHERE name = ?')->execute([$v, $name]); }
    $db->commit();
  } catch (Throwable $e) { $db->rollBack(); throw $e; }
  return $prefix . str_pad((string)$v, $pad, '0', STR_PAD_LEFT);
}

function jg_put(string $collection, array $doc, string $by = 'website'): array {
  $db = jg_db(); $now = date('Y-m-d H:i:s'); $json = json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $s = $db->prepare('SELECT 1 FROM jg_records WHERE collection = ? AND id = ?'); $s->execute([$collection, $doc['id']]);
  if ($s->fetchColumn()) $db->prepare('UPDATE jg_records SET data = ?, updated_at = ?, updated_by = ? WHERE collection = ? AND id = ?')->execute([$json, $now, $by, $collection, $doc['id']]);
  else $db->prepare('INSERT INTO jg_records (collection, id, data, created_at, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?)')->execute([$collection, $doc['id'], $json, $now, $now, $by]);
  return $doc;
}

function jg_log(string $user, string $action, string $collection = '', string $record = '', string $note = ''): void {
  try { jg_db()->prepare('INSERT INTO jg_log (at, username, action, collection, record, note) VALUES (?, ?, ?, ?, ?, ?)')->execute([date('Y-m-d H:i:s'), $user, $action, $collection, $record, mb_substr($note, 0, 300)]); } catch (Throwable $e) {}
}
