CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS portal_users (
    clerk_user_id TEXT PRIMARY KEY,

    email TEXT NOT NULL,
    display_name TEXT,
    company TEXT,

    role TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN ('admin', 'user')),

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'disabled')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_users_email_unique
ON portal_users (LOWER(email));


CREATE TABLE IF NOT EXISTS portal_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    blob_pathname TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL,
    content_type TEXT,
    size_bytes BIGINT NOT NULL DEFAULT 0,

    description TEXT,

    uploaded_by TEXT REFERENCES portal_users(clerk_user_id)
        ON DELETE SET NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portal_files_created_at_idx
ON portal_files (created_at DESC);


CREATE TABLE IF NOT EXISTS portal_file_permissions (
    file_id UUID NOT NULL
        REFERENCES portal_files(id)
        ON DELETE CASCADE,

    clerk_user_id TEXT NOT NULL
        REFERENCES portal_users(clerk_user_id)
        ON DELETE CASCADE,

    can_view BOOLEAN NOT NULL DEFAULT TRUE,
    can_download BOOLEAN NOT NULL DEFAULT TRUE,

    granted_by TEXT
        REFERENCES portal_users(clerk_user_id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (file_id, clerk_user_id)
);

CREATE INDEX IF NOT EXISTS portal_permissions_user_idx
ON portal_file_permissions (clerk_user_id);


CREATE TABLE IF NOT EXISTS portal_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_user_id TEXT,
    action TEXT NOT NULL,

    target_type TEXT,
    target_id TEXT,

    details JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portal_audit_created_at_idx
ON portal_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS portal_audit_actor_idx
ON portal_audit_log (actor_user_id);
