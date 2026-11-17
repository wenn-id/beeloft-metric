-- BeeloftMetric Production Schema for Cloudflare D1 (beeloftmetric.biz.id)

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  api_token TEXT NOT NULL UNIQUE,
  totp_secret TEXT,
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'FREE',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  email_verified INTEGER NOT NULL DEFAULT 0,
  verification_token TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  workspace_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_api_token ON users(api_token);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invitations (
  token TEXT PRIMARY KEY,
  owner_user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  kind TEXT NOT NULL,
  assigned_brands_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

CREATE TABLE IF NOT EXISTS brands_index (
  blog_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  tracking_key TEXT NOT NULL UNIQUE,
  domain TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_brands_user ON brands_index(user_id);
CREATE INDEX IF NOT EXISTS idx_brands_tracking_key ON brands_index(tracking_key);

CREATE TABLE IF NOT EXISTS public_smartlinks (
  slug TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  blog_id INTEGER NOT NULL,
  link_id TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public_studio_reports (
  report_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  blog_id INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS web_events (
  id TEXT PRIMARY KEY,
  blog_id INTEGER NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  path TEXT NOT NULL,
  event_name TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  referrer TEXT,
  country_code TEXT,
  country_name TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_web_events_blog_time ON web_events(blog_id, created_at DESC);

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  blog_id INTEGER NOT NULL,
  network TEXT NOT NULL,
  code_verifier TEXT,
  redirect_origin TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_credentials (
  blog_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  network TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT,
  account_id TEXT,
  account_handle TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (blog_id, network)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  blog_id INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  filename TEXT NOT NULL,
  data_base64 TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_blog ON media_assets(blog_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_orders (
  order_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  plan TEXT NOT NULL,
  amount_idr INTEGER NOT NULL,
  amount_usd REAL NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  checkout_url TEXT,
  status TEXT NOT NULL,
  coupon_code TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_meta (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);
