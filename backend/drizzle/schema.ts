import { sqliteTable, integer, text, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================
// Users Table
// ============================================
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password'), // nullable for Google-only accounts (Phase 3)
  // google_id: text('google_id').unique(), // Phase 3 - not added yet
  role: text('role').notNull().default('USER'), // 'USER' or 'SUPERADMIN'
  status: text('status').notNull().default('PENDING'), // 'PENDING', 'ACTIVE', or 'BANNED'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
});

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  sessions: many(sessions),
  kbItems: many(kbItems),
  logs: many(logs),
}));

// ============================================
// Refresh Tokens Table
// ============================================
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // hashed before storage
  revoked: integer('revoked', { mode: 'boolean' }).notNull().default(false),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// ============================================
// OTP Codes Table (Phase 2 - defined but no migration yet)
// ============================================
export const otpCodes = sqliteTable('otp_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  code: text('code').notNull(), // 6-digit string
  purpose: text('purpose').notNull(), // 'verify_email' or 'reset_password'
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(), // 10 minutes from creation
  used: integer('used', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// Sessions Table
// ============================================
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // auto-generated from first user message
  mode: text('mode').notNull(), // 'WEB_SEARCH', 'KB_SEARCH', or 'DEEP_RESEARCH'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

// ============================================
// Messages Table
// ============================================
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' or 'assistant'
  content: text('content').notNull(),
  sources: text('sources'), // JSON array: [{title: string, url: string}]
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
}));

// ============================================
// KB Items Table (Phase 2 - defined in schema, migration deferred)
// ============================================
export const kbItems = sqliteTable('kb_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(), // full cleaned article text
  summary: text('summary'), // AI-generated bullet summary
  sourceUrl: text('source_url'), // original URL if saved from web
  tags: text('tags'), // JSON string array: ["ai", "research"]
  embedding: blob('embedding'), // float32[384] vector for sqlite-vec
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const kbItemsRelations = relations(kbItems, ({ one }) => ({
  user: one(users, {
    fields: [kbItems.userId],
    references: [users.id],
  }),
}));

// ============================================
// Logs Table
// ============================================
export const logs = sqliteTable('logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  level: text('level').notNull(), // 'INFO', 'WARN', or 'ERROR'
  context: text('context').notNull(), // NestJS context string e.g. 'AuthService'
  message: text('message').notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  meta: text('meta'), // JSON: {requestId, agentStep, latencyMs, etc.}
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const logsRelations = relations(logs, ({ one }) => ({
  user: one(users, {
    fields: [logs.userId],
    references: [users.id],
  }),
}));

// Export type helpers
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type OtpCode = typeof otpCodes.$inferSelect;
export type NewOtpCode = typeof otpCodes.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type KbItem = typeof kbItems.$inferSelect;
export type NewKbItem = typeof kbItems.$inferInsert;
export type Log = typeof logs.$inferSelect;
export type NewLog = typeof logs.$inferInsert;
