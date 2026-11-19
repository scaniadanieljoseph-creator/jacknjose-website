<?php
/* Hotel Jothi Grand management: database connection and tables.
   The live hotel uses the cPanel MySQL database written into manage/config.php by manage/install.php.
   Until that is done, data lives in an SQLite file in manage/data/ (so the system works straight after upload). */
declare(strict_types=1);
if (!ini_get('date.timezone') || date_default_timezone_get() === 'UTC') date_default_timezone_set('Asia/Kolkata');

const JG_CONFIG = __DIR__ . '/config.php';

/* SQLite fallback: a randomly named file in manage/data, which the web can never download */
function jg_sqlite_dsn(): string {
  $dir = __DIR__ . '/data';
  if (!is_dir($dir)) mkdir($dir, 0755, true);
  if (!is_file("$dir/.htaccess")) file_put_contents("$dir/.htaccess", "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
  if (!is_file("$dir/index.html")) file_put_contents("$dir/index.html", '');
  $nameFile = "$dir/dbname.php";
  if (!is_file($nameFile)) file_put_contents($nameFile, "<?php return 'jothigrand-" . bin2hex(random_bytes(12)) . ".sqlite';\n", LOCK_EX);
  return 'sqlite:' . $dir . '/' . basename((string)require $nameFile);
}
function jg_has_sqlite(): bool { $f = __DIR__ . '/data/dbname.php'; return is_file($f) && is_file(__DIR__ . '/data/' . basename((string)require $f)); }

/* $cfg: ['host' => 'localhost', 'name' => 'cpuser_db', 'user' => 'cpuser_u', 'pass' => '...'] for MySQL, or [] for SQLite */
function jg_connect(array $cfg): PDO {
  $opt = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_TIMEOUT => 8];
  if (!empty($cfg['name'])) {
    $host = $cfg['host'] ?? 'localhost'; $port = '';
    if (preg_match('/^(.+):(\d+)$/', $host, $m)) { $host = $m[1]; $port = ';port=' . $m[2]; }
    $db = new PDO("mysql:host=$host$port;dbname={$cfg['name']};charset=utf8mb4", $cfg['user'] ?? '', $cfg['pass'] ?? '', $opt);
    $db->exec("SET time_zone = '+05:30'");
  } else {
    $db = new PDO(!empty($cfg['dsn']) ? $cfg['dsn'] : jg_sqlite_dsn(), null, null, $opt);
    $db->exec('PRAGMA journal_mode = WAL'); $db->exec('PRAGMA busy_timeout = 4000');
  }
  return $db;
}

function jg_schema(PDO $db): void {
  $mysql = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
  $auto = $mysql ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  $txt = $mysql ? 'MEDIUMTEXT' : 'TEXT'; $key = $mysql ? 'VARCHAR(64)' : 'TEXT'; $eng = $mysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '';
  $db->exec("CREATE TABLE IF NOT EXISTS jg_records (collection $key NOT NULL, id $key NOT NULL, data $txt NOT NULL, created_at $key, updated_at $key, updated_by $key, PRIMARY KEY (collection, id))$eng");
  $db->exec("CREATE TABLE IF NOT EXISTS jg_users (id $auto, username $key NOT NULL UNIQUE, name $key, role $key NOT NULL, pass $txt NOT NULL, active INTEGER DEFAULT 1, created_at $key)$eng");
  $db->exec("CREATE TABLE IF NOT EXISTS jg_sessions (token $key PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL)$eng");
  $db->exec("CREATE TABLE IF NOT EXISTS jg_counters (name $key PRIMARY KEY, value INTEGER NOT NULL)$eng");
  $db->exec("CREATE TABLE IF NOT EXISTS jg_attempts (k $key NOT NULL, at INTEGER NOT NULL)$eng");
  $db->exec("CREATE TABLE IF NOT EXISTS jg_log (id $auto, at $key, username $key, action $key, collection $key, record $key, note $txt)$eng");
  /* uploaded documents and photos (ID proofs, guest and staff photos, expense bills, attendance selfies) */
  $blob = $mysql ? 'MEDIUMBLOB' : 'BLOB';
  $db->exec("CREATE TABLE IF NOT EXISTS jg_files (id $key PRIMARY KEY, kind $key NOT NULL, name $key, mime $key NOT NULL, size INTEGER NOT NULL, data $blob NOT NULL, created_at $key, created_by $key)$eng");
  /* one-time upgrades, recorded in jg_counters */
  $v = $db->query("SELECT value FROM jg_counters WHERE name = 'schema'")->fetchColumn();
  if ($v === false || (int)$v < 2) {
    $cols = $mysql ? array_column($db->query('SHOW COLUMNS FROM jg_users')->fetchAll(), 'Field') : array_column($db->query('PRAGMA table_info(jg_users)')->fetchAll(), 'name');
    if (!in_array('staff_id', $cols, true)) $db->exec("ALTER TABLE jg_users ADD COLUMN staff_id $key");   // links a login to a staff member for app attendance
    if ($v === false) $db->exec("INSERT INTO jg_counters (name, value) VALUES ('schema', 2)"); else $db->exec("UPDATE jg_counters SET value = 2 WHERE name = 'schema'");
  }
}

/* files are kept in the database; this checks what really arrived, whatever the browser claims */
const JG_FILE_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'application/pdf' => 'pdf'];
const JG_FILE_MAX = 4 * 1024 * 1024;
function jg_sniff(string $bin): ?string {
  if (strncmp($bin, "\xFF\xD8\xFF", 3) === 0) return 'image/jpeg';
  if (strncmp($bin, "\x89PNG\r\n\x1A\n", 8) === 0) return 'image/png';
  if (strncmp($bin, 'RIFF', 4) === 0 && substr($bin, 8, 4) === 'WEBP') return 'image/webp';
  if (strncmp($bin, '%PDF-', 5) === 0) return 'application/pdf';
  return null;
}
function jg_file_save(string $kind, string $name, string $bin, string $by): array {
  $mime = jg_sniff($bin);
  if (!$mime) throw new RuntimeException('Only photos (JPG, PNG, WEBP) and PDF files can be uploaded.');
  if (strlen($bin) > JG_FILE_MAX) throw new RuntimeException('That file is larger than 4 MB. Please use a smaller photo or PDF.');
  $id = 'F' . date('ymd') . bin2hex(random_bytes(10));
  $name = mb_substr(preg_replace('/[^\p{L}\p{N} ._()-]+/u', '_', $name) ?: 'file', 0, 60);
  $st = jg_db()->prepare('INSERT INTO jg_files (id, kind, name, mime, size, data, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  $st->bindValue(1, $id); $st->bindValue(2, $kind); $st->bindValue(3, $name); $st->bindValue(4, $mime); $st->bindValue(5, strlen($bin), PDO::PARAM_INT);
  $st->bindValue(6, $bin, PDO::PARAM_LOB); $st->bindValue(7, date('Y-m-d H:i:s')); $st->bindValue(8, $by); $st->execute();
  return ['id' => $id, 'name' => $name, 'mime' => $mime, 'size' => strlen($bin), 'kind' => $kind, 'at' => date('Y-m-d H:i')];
}

function jg_config(): array { return is_file(JG_CONFIG) ? (array)require JG_CONFIG : []; }
function jg_db(): PDO {
  static $db = null; if ($db) return $db;
  $db = jg_connect(jg_config());
  jg_schema($db);
  return $db;
}
function jg_driver(): string { return jg_db()->getAttribute(PDO::ATTR_DRIVER_NAME); }

/* next number in a running sequence, e.g. BK-0007 (safe when two people save at the same moment) */
function jg_next(string $name, string $prefix, int $pad = 4): string {
  $db = jg_db(); $mine = !$db->inTransaction(); if ($mine) $db->beginTransaction();
  try {
    $s = $db->prepare('SELECT value FROM jg_counters WHERE name = ?' . (jg_driver() === 'mysql' ? ' FOR UPDATE' : '')); $s->execute([$name]); $v = $s->fetchColumn();
    if ($v === false) { $v = 1; $db->prepare('INSERT INTO jg_counters (name, value) VALUES (?, 1)')->execute([$name]); }
    else { $v = (int)$v + 1; $db->prepare('UPDATE jg_counters SET value = ? WHERE name = ?')->execute([$v, $name]); }
    if ($mine) $db->commit();
  } catch (Throwable $e) { if ($mine) $db->rollBack(); throw $e; }
  return $prefix . str_pad((string)$v, $pad, '0', STR_PAD_LEFT);
}

function jg_get(string $collection, string $id): ?array {
  $s = jg_db()->prepare('SELECT data FROM jg_records WHERE collection = ? AND id = ?'); $s->execute([$collection, $id]); $r = $s->fetchColumn();
  return $r ? (json_decode($r, true) ?: null) : null;
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
