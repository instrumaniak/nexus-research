CREATE TABLE `kb_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`summary` text,
	`source_url` text,
	`tags` text,
	`embedding` blob,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`level` text NOT NULL,
	`context` text NOT NULL,
	`message` text NOT NULL,
	`user_id` integer,
	`meta` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`sources` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`code` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`revoked` integer DEFAULT false NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`mode` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`role` text DEFAULT 'USER' NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` integer NOT NULL,
	`last_login_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_unique` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint

-- FTS5 full-text search for KB items
CREATE VIRTUAL TABLE IF NOT EXISTS kb_items_fts USING fts5(
  title, content, summary,
  content=kb_items,
  content_rowid=id
);

-- sqlite-vec semantic search for KB items
CREATE VIRTUAL TABLE IF NOT EXISTS kb_items_vec USING vec0(
  item_id INTEGER PRIMARY KEY,
  embedding float[384]
);

-- FTS5 sync triggers
CREATE TRIGGER IF NOT EXISTS kb_items_fts_insert AFTER INSERT ON kb_items BEGIN
  INSERT INTO kb_items_fts(rowid, title, content, summary) VALUES (new.id, new.title, new.content, new.summary);
END;
CREATE TRIGGER IF NOT EXISTS kb_items_fts_delete AFTER DELETE ON kb_items BEGIN
  INSERT INTO kb_items_fts(kb_items_fts, rowid, title, content, summary) VALUES ('delete', old.id, old.title, old.content, old.summary);
END;
CREATE TRIGGER IF NOT EXISTS kb_items_fts_update AFTER UPDATE ON kb_items BEGIN
  INSERT INTO kb_items_fts(kb_items_fts, rowid, title, content, summary) VALUES ('delete', old.id, old.title, old.content, old.summary);
  INSERT INTO kb_items_fts(rowid, title, content, summary) VALUES (new.id, new.title, new.content, new.summary);
END;