-- Database Schema
-- This file reflects the table structures defined in app/db/models/tools.py and app/db/models/widgets.py

-- Create enum types
DO $$ BEGIN
    CREATE TYPE tool_source_type AS ENUM ('openapi_spec', 'mcp_server');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create toolkit_source table
CREATE TABLE IF NOT EXISTS toolkit_source (
    id TEXT NOT NULL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    name TEXT NOT NULL,
    source_type tool_source_type NOT NULL,
    description TEXT,
    configuration JSONB NOT NULL
);

-- Create indexes for toolkit_source
CREATE INDEX IF NOT EXISTS idx_toolkit_source_source_type ON toolkit_source(source_type);
CREATE INDEX IF NOT EXISTS idx_toolkit_source_created_at ON toolkit_source(created_at DESC);

-- Create toolkit table
CREATE TABLE IF NOT EXISTS toolkit (
    id TEXT NOT NULL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    name TEXT NOT NULL,
    toolkit_source_id TEXT NOT NULL REFERENCES toolkit_source(id) ON DELETE CASCADE,
    description TEXT
);

-- Create indexes for toolkit
CREATE INDEX IF NOT EXISTS idx_toolkit_source_id ON toolkit(toolkit_source_id);
CREATE INDEX IF NOT EXISTS idx_toolkit_created_at ON toolkit(created_at DESC);

-- Create tool table (MCP-compliant tool model)
-- Note: This is different from the existing 'tools' table which uses project_id
CREATE TABLE IF NOT EXISTS tool (
    id TEXT NOT NULL PRIMARY KEY,
    toolkit_id TEXT NOT NULL REFERENCES toolkit(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    name TEXT NOT NULL,
    title TEXT,
    description TEXT NOT NULL,
    input_schema JSONB NOT NULL,
    output_schema JSONB,
    annotations JSONB,
    is_enabled BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for tool
CREATE INDEX IF NOT EXISTS idx_tool_toolkit_id ON tool(toolkit_id);
CREATE INDEX IF NOT EXISTS idx_tool_is_enabled ON tool(is_enabled);
CREATE INDEX IF NOT EXISTS idx_tool_created_at ON tool(created_at DESC);
-- Composite index for efficient filtering by toolkit_id and ordering by created_at
CREATE INDEX IF NOT EXISTS idx_tool_toolkit_created_at ON tool(toolkit_id, created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_toolkit_source_updated_at ON toolkit_source;
CREATE TRIGGER update_toolkit_source_updated_at
    BEFORE UPDATE ON toolkit_source
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_toolkit_updated_at ON toolkit;
CREATE TRIGGER update_toolkit_updated_at
    BEFORE UPDATE ON toolkit
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tool_updated_at ON tool;
CREATE TRIGGER update_tool_updated_at
    BEFORE UPDATE ON tool
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Widget-related tables
-- ============================================================================

-- Create ui_widget_resource table
CREATE TABLE IF NOT EXISTS ui_widget_resource (
    id TEXT NOT NULL PRIMARY KEY,
    widget_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resource JSONB NOT NULL
);

-- Create indexes for ui_widget_resource
CREATE INDEX IF NOT EXISTS idx_ui_widget_resource_widget_id ON ui_widget_resource(widget_id);
CREATE INDEX IF NOT EXISTS idx_ui_widget_resource_created_at ON ui_widget_resource(created_at DESC);

-- Create widget table
CREATE TABLE IF NOT EXISTS widget (
    id TEXT NOT NULL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    ui_widget_resource_id TEXT REFERENCES ui_widget_resource(id) ON DELETE CASCADE
);

-- Create indexes for widget
CREATE INDEX IF NOT EXISTS idx_widget_ui_widget_resource_id ON widget(ui_widget_resource_id);
CREATE INDEX IF NOT EXISTS idx_widget_created_at ON widget(created_at DESC);

-- Create tool_widget junction table (association between tools and widgets)
CREATE TABLE IF NOT EXISTS tool_widget (
    tool_id TEXT NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
    widget_id TEXT NOT NULL REFERENCES widget(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (tool_id, widget_id)
);

-- Create indexes for tool_widget
CREATE INDEX IF NOT EXISTS idx_tool_widget_tool_id ON tool_widget(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_widget_widget_id ON tool_widget(widget_id);
CREATE INDEX IF NOT EXISTS idx_tool_widget_created_at ON tool_widget(created_at DESC);

-- Create enum types for widget deployment
DO $$ BEGIN
    CREATE TYPE widget_deployment_type AS ENUM ('local');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE widget_deployment_status AS ENUM ('active', 'deploying', 'suspended', 'error', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create widget_deployment table
CREATE TABLE IF NOT EXISTS widget_deployment (
    id TEXT NOT NULL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    widget_id TEXT NOT NULL REFERENCES widget(id) ON DELETE CASCADE,
    deployment_type widget_deployment_type NOT NULL,
    deployment_url TEXT NOT NULL,
    deployment_status widget_deployment_status NOT NULL
);

-- Create indexes for widget_deployment
CREATE INDEX IF NOT EXISTS idx_widget_deployment_widget_id ON widget_deployment(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_deployment_status ON widget_deployment(deployment_status);
CREATE INDEX IF NOT EXISTS idx_widget_deployment_created_at ON widget_deployment(created_at DESC);
-- Composite index for efficient filtering by widget_id and ordering by created_at
CREATE INDEX IF NOT EXISTS idx_widget_deployment_widget_created_at ON widget_deployment(widget_id, created_at DESC);

-- Create triggers to auto-update updated_at for widget tables
DROP TRIGGER IF EXISTS update_ui_widget_resource_updated_at ON ui_widget_resource;
CREATE TRIGGER update_ui_widget_resource_updated_at
    BEFORE UPDATE ON ui_widget_resource
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_widget_updated_at ON widget;
CREATE TRIGGER update_widget_updated_at
    BEFORE UPDATE ON widget
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tool_widget_updated_at ON tool_widget;
CREATE TRIGGER update_tool_widget_updated_at
    BEFORE UPDATE ON tool_widget
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_widget_deployment_updated_at ON widget_deployment;
CREATE TRIGGER update_widget_deployment_updated_at
    BEFORE UPDATE ON widget_deployment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Widget Chat tables
-- ============================================================================

-- Create message_role enum type for widget messages
DO $$ BEGIN
    CREATE TYPE widget_message_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create widget_chat table (conversations for widgets)
CREATE TABLE IF NOT EXISTS widget_chat (
    id TEXT NOT NULL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    widget_id TEXT NOT NULL REFERENCES widget(id) ON DELETE CASCADE
);

-- Create indexes for widget_chat
CREATE INDEX IF NOT EXISTS idx_widget_chat_widget_id ON widget_chat(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_chat_created_at ON widget_chat(created_at DESC);

-- Create widget_message table (messages in widget conversations)
CREATE TABLE IF NOT EXISTS widget_message (
    id TEXT NOT NULL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    conversation_id TEXT NOT NULL REFERENCES widget_chat(id) ON DELETE CASCADE,
    role widget_message_role NOT NULL,
    content TEXT NOT NULL,
    ui_resource_id TEXT REFERENCES ui_widget_resource(id)
);

-- Create indexes for widget_message
CREATE INDEX IF NOT EXISTS idx_widget_message_conversation_id ON widget_message(conversation_id);
CREATE INDEX IF NOT EXISTS idx_widget_message_created_at ON widget_message(created_at DESC);
-- Composite index for efficient message retrieval by conversation
CREATE INDEX IF NOT EXISTS idx_widget_message_conversation_created_at ON widget_message(conversation_id, created_at ASC);

-- Create triggers to auto-update updated_at for widget chat tables
DROP TRIGGER IF EXISTS update_widget_chat_updated_at ON widget_chat;
CREATE TRIGGER update_widget_chat_updated_at
    BEFORE UPDATE ON widget_chat
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Design tables
-- ============================================================================

-- Create enum type for design type
DO $$ BEGIN
    CREATE TYPE design_type AS ENUM ('logo', 'ux_design');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create design table
CREATE TABLE IF NOT EXISTS design (
    id TEXT NOT NULL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    design_type design_type NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_data BYTEA NOT NULL,
    file_size INTEGER NOT NULL
);

-- Create indexes for design
CREATE INDEX IF NOT EXISTS idx_design_design_type ON design(design_type);
CREATE INDEX IF NOT EXISTS idx_design_created_at ON design(created_at DESC);
-- Composite index for efficient filtering by design_type and ordering by created_at
CREATE INDEX IF NOT EXISTS idx_design_type_created_at ON design(design_type, created_at DESC);

-- Create trigger to auto-update updated_at for design table
DROP TRIGGER IF EXISTS update_design_updated_at ON design;
CREATE TRIGGER update_design_updated_at
    BEFORE UPDATE ON design
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

