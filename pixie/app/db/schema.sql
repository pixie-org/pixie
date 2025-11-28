-- Database Schema
-- This file reflects the table structures defined in app/db/models/tools.py and app/db/models/widgets.py

-- ============================================================================
-- Enums and Functions
-- ============================================================================

-- Create enum types
DO $$ BEGIN
    CREATE TYPE tool_source_type AS ENUM ('openapi_spec', 'mcp_server');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE widget_message_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE design_type AS ENUM ('logo', 'ux_design');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to handle ui_widget_resource deletion
-- Sets ui_resource_id to NULL in widget_message while preserving project_id
CREATE OR REPLACE FUNCTION handle_ui_widget_resource_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE widget_message
    SET ui_resource_id = NULL
    WHERE ui_resource_id = OLD.id
      AND project_id = OLD.project_id;
    
    RETURN OLD;
END;
$$ language 'plpgsql';

-- ============================================================================
-- User Authentication tables
-- ============================================================================

-- Create user table
CREATE TABLE IF NOT EXISTS "user" (
    id TEXT NOT NULL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    last_login_at TIMESTAMP,
    last_activity_at TIMESTAMP,
    waitlisted BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for user
-- Drop existing non-unique index if it exists, then create unique index
DROP INDEX IF EXISTS idx_user_email;
CREATE UNIQUE INDEX idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_created_at ON "user"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_last_login_at ON "user"(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_last_activity_at ON "user"(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_waitlisted ON "user"(waitlisted);

-- Create trigger to auto-update updated_at for user table
DROP TRIGGER IF EXISTS update_user_updated_at ON "user";
CREATE TRIGGER update_user_updated_at
    BEFORE UPDATE ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create user_refresh_token table to store salted hashes of refresh tokens
CREATE TABLE IF NOT EXISTS user_refresh_token (
    id TEXT NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_refresh_token_id ON user_refresh_token(token_id);
CREATE INDEX IF NOT EXISTS idx_user_refresh_token_user_id ON user_refresh_token(user_id);
CREATE INDEX IF NOT EXISTS idx_user_refresh_token_expires_at ON user_refresh_token(expires_at);

-- ============================================================================
-- Project tables
-- ============================================================================

-- Create project table
CREATE TABLE IF NOT EXISTS project (
    id TEXT NOT NULL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

-- Create indexes for project
CREATE INDEX IF NOT EXISTS idx_project_owner_id ON project(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_created_at ON project(created_at DESC);

-- Create trigger to auto-update updated_at for project table
DROP TRIGGER IF EXISTS update_project_updated_at ON project;
CREATE TRIGGER update_project_updated_at
    BEFORE UPDATE ON project
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create project_user junction table (association between users and projects for access control)
CREATE TABLE IF NOT EXISTS project_user (
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

-- Create indexes for project_user
CREATE INDEX IF NOT EXISTS idx_project_user_project_id ON project_user(project_id);
CREATE INDEX IF NOT EXISTS idx_project_user_user_id ON project_user(user_id);

-- ============================================================================
-- Tool-related tables
-- ============================================================================

-- Create toolkit_source table
CREATE TABLE IF NOT EXISTS toolkit_source (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    name TEXT NOT NULL,
    source_type tool_source_type NOT NULL,
    description TEXT,
    configuration JSONB NOT NULL,
    PRIMARY KEY (id, project_id)
);

-- Create indexes for toolkit_source
CREATE INDEX IF NOT EXISTS idx_toolkit_source_source_type ON toolkit_source(source_type);
CREATE INDEX IF NOT EXISTS idx_toolkit_source_created_at ON toolkit_source(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_toolkit_source_project_id ON toolkit_source(project_id);

-- Create triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_toolkit_source_updated_at ON toolkit_source;
CREATE TRIGGER update_toolkit_source_updated_at
    BEFORE UPDATE ON toolkit_source
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create toolkit table
CREATE TABLE IF NOT EXISTS toolkit (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    name TEXT NOT NULL,
    toolkit_source_id TEXT NOT NULL,
    description TEXT,
    PRIMARY KEY (id, project_id),
    FOREIGN KEY (toolkit_source_id, project_id) REFERENCES toolkit_source(id, project_id) ON DELETE CASCADE
);

-- Create indexes for toolkit
CREATE INDEX IF NOT EXISTS idx_toolkit_source_id ON toolkit(toolkit_source_id, project_id);
CREATE INDEX IF NOT EXISTS idx_toolkit_created_at ON toolkit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_toolkit_project_id ON toolkit(project_id);

DROP TRIGGER IF EXISTS update_toolkit_updated_at ON toolkit;
CREATE TRIGGER update_toolkit_updated_at
    BEFORE UPDATE ON toolkit
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create tool table (MCP-compliant tool model)
CREATE TABLE IF NOT EXISTS tool (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    toolkit_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    name TEXT NOT NULL,
    title TEXT,
    description TEXT NOT NULL,
    input_schema JSONB NOT NULL,
    output_schema JSONB,
    annotations JSONB,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (id, project_id),
    FOREIGN KEY (toolkit_id, project_id) REFERENCES toolkit(id, project_id) ON DELETE CASCADE
);

-- Create indexes for tool
CREATE INDEX IF NOT EXISTS idx_tool_toolkit_id ON tool(toolkit_id, project_id);
CREATE INDEX IF NOT EXISTS idx_tool_is_enabled ON tool(is_enabled);
CREATE INDEX IF NOT EXISTS idx_tool_created_at ON tool(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_project_id ON tool(project_id);
-- Composite index for efficient filtering by toolkit_id and ordering by created_at
CREATE INDEX IF NOT EXISTS idx_tool_toolkit_created_at ON tool(toolkit_id, project_id, created_at DESC);
-- Composite index for efficient filtering by project_id and ordering by created_at
CREATE INDEX IF NOT EXISTS idx_tool_project_created_at ON tool(project_id, created_at DESC);

DROP TRIGGER IF EXISTS update_tool_updated_at ON tool;
CREATE TRIGGER update_tool_updated_at
    BEFORE UPDATE ON tool
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Widget-related tables
-- ============================================================================

-- Create widget table
CREATE TABLE IF NOT EXISTS widget (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    ui_widget_resource_id TEXT,
    PRIMARY KEY (id, project_id)
);

-- Create indexes for widget
CREATE INDEX IF NOT EXISTS idx_widget_ui_widget_resource_id ON widget(ui_widget_resource_id, project_id);
CREATE INDEX IF NOT EXISTS idx_widget_created_at ON widget(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_project_id ON widget(project_id);

DROP TRIGGER IF EXISTS update_widget_updated_at ON widget;
CREATE TRIGGER update_widget_updated_at
    BEFORE UPDATE ON widget
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create ui_widget_resource table
CREATE TABLE IF NOT EXISTS ui_widget_resource (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    widget_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resource JSONB NOT NULL,
    PRIMARY KEY (id, project_id),
    FOREIGN KEY (widget_id, project_id) REFERENCES widget(id, project_id) ON DELETE CASCADE
);

-- Create indexes for ui_widget_resource
CREATE INDEX IF NOT EXISTS idx_ui_widget_resource_widget_id ON ui_widget_resource(widget_id, project_id);
CREATE INDEX IF NOT EXISTS idx_ui_widget_resource_created_at ON ui_widget_resource(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ui_widget_resource_project_id ON ui_widget_resource(project_id);

DROP TRIGGER IF EXISTS update_ui_widget_resource_updated_at ON ui_widget_resource;
CREATE TRIGGER update_ui_widget_resource_updated_at
    BEFORE UPDATE ON ui_widget_resource
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to handle ui_widget_resource deletion
-- This sets ui_resource_id to NULL in widget_message while preserving project_id
DROP TRIGGER IF EXISTS handle_ui_widget_resource_delete_trigger ON ui_widget_resource;
CREATE TRIGGER handle_ui_widget_resource_delete_trigger
    BEFORE DELETE ON ui_widget_resource
    FOR EACH ROW
    EXECUTE FUNCTION handle_ui_widget_resource_delete();

-- Add foreign key constraint from widget to ui_widget_resource
-- (deferred because of circular dependency)
ALTER TABLE widget
    ADD CONSTRAINT fk_widget_ui_widget_resource
    FOREIGN KEY (ui_widget_resource_id, project_id)
    REFERENCES ui_widget_resource(id, project_id)
    ON DELETE CASCADE;

-- Create tool_widget junction table (association between tools and widgets)
CREATE TABLE IF NOT EXISTS tool_widget (
    tool_id TEXT NOT NULL,
    widget_id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (tool_id, widget_id, project_id),
    FOREIGN KEY (tool_id, project_id) REFERENCES tool(id, project_id) ON DELETE CASCADE,
    FOREIGN KEY (widget_id, project_id) REFERENCES widget(id, project_id) ON DELETE CASCADE
);

-- Create indexes for tool_widget
CREATE INDEX IF NOT EXISTS idx_tool_widget_tool_id ON tool_widget(tool_id, project_id);
CREATE INDEX IF NOT EXISTS idx_tool_widget_widget_id ON tool_widget(widget_id, project_id);
CREATE INDEX IF NOT EXISTS idx_tool_widget_project_id ON tool_widget(project_id);
CREATE INDEX IF NOT EXISTS idx_tool_widget_created_at ON tool_widget(created_at DESC);

DROP TRIGGER IF EXISTS update_tool_widget_updated_at ON tool_widget;
CREATE TRIGGER update_tool_widget_updated_at
    BEFORE UPDATE ON tool_widget
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Widget Chat tables
-- ============================================================================

-- Create widget_chat table (conversations for widgets)
CREATE TABLE IF NOT EXISTS widget_chat (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    widget_id TEXT NOT NULL,
    PRIMARY KEY (id, project_id),
    FOREIGN KEY (widget_id, project_id) REFERENCES widget(id, project_id) ON DELETE CASCADE
);

-- Create indexes for widget_chat
CREATE INDEX IF NOT EXISTS idx_widget_chat_widget_id ON widget_chat(widget_id, project_id);
CREATE INDEX IF NOT EXISTS idx_widget_chat_created_at ON widget_chat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_chat_project_id ON widget_chat(project_id);

DROP TRIGGER IF EXISTS update_widget_chat_updated_at ON widget_chat;
CREATE TRIGGER update_widget_chat_updated_at
    BEFORE UPDATE ON widget_chat
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create widget_message table (messages in widget conversations)
CREATE TABLE IF NOT EXISTS widget_message (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    conversation_id TEXT NOT NULL,
    role widget_message_role NOT NULL,
    content TEXT NOT NULL,
    ui_resource_id TEXT,
    PRIMARY KEY (id, project_id),
    FOREIGN KEY (conversation_id, project_id) REFERENCES widget_chat(id, project_id) ON DELETE CASCADE,
    FOREIGN KEY (ui_resource_id, project_id) REFERENCES ui_widget_resource(id, project_id) ON DELETE NO ACTION
);

-- Create indexes for widget_message
CREATE INDEX IF NOT EXISTS idx_widget_message_conversation_id ON widget_message(conversation_id, project_id);
CREATE INDEX IF NOT EXISTS idx_widget_message_created_at ON widget_message(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_message_project_id ON widget_message(project_id);
-- Composite index for efficient message retrieval by conversation
CREATE INDEX IF NOT EXISTS idx_widget_message_conversation_created_at ON widget_message(conversation_id, project_id, created_at ASC);
-- Composite index for efficient filtering by project_id and ordering by created_at
CREATE INDEX IF NOT EXISTS idx_widget_message_project_created_at ON widget_message(project_id, created_at DESC);

-- ============================================================================
-- Design tables
-- ============================================================================

-- Create design table
CREATE TABLE IF NOT EXISTS design (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    design_type design_type NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_data BYTEA NOT NULL,
    file_size INTEGER NOT NULL,
    PRIMARY KEY (id, project_id)
);

-- Create indexes for design
CREATE INDEX IF NOT EXISTS idx_design_design_type ON design(design_type);
CREATE INDEX IF NOT EXISTS idx_design_created_at ON design(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_project_id ON design(project_id);
-- Composite index for efficient filtering by design_type and ordering by created_at
CREATE INDEX IF NOT EXISTS idx_design_type_created_at ON design(design_type, created_at DESC);

-- Create trigger to auto-update updated_at for design table
DROP TRIGGER IF EXISTS update_design_updated_at ON design;
CREATE TRIGGER update_design_updated_at
    BEFORE UPDATE ON design
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
