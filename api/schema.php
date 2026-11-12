<?php
/* Table definitions shared by the installer. */
function jj_schema(string $driver, string $T): array {
  if ($driver === 'sqlite') return [
    "CREATE TABLE IF NOT EXISTS {$T}records (seq INTEGER PRIMARY KEY AUTOINCREMENT, collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, secret TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE (collection, id))",
    "CREATE TABLE IF NOT EXISTS {$T}sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS {$T}login_fails (username TEXT NOT NULL, at TEXT NOT NULL)",
  ];
  return [
    "CREATE TABLE IF NOT EXISTS {$T}records (seq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, collection VARCHAR(40) NOT NULL, id VARCHAR(80) NOT NULL, data MEDIUMTEXT NOT NULL, secret VARCHAR(255) NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY (collection, id), UNIQUE KEY seq (seq)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS {$T}sessions (token CHAR(64) NOT NULL PRIMARY KEY, user_id VARCHAR(80) NOT NULL, expires_at DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    "CREATE TABLE IF NOT EXISTS {$T}login_fails (username VARCHAR(80) NOT NULL, at DATETIME NOT NULL, KEY username (username)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  ];
}
