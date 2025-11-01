-- Migration: Create licenses table
-- Description: Initial migration to create the licenses table with all necessary fields

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS licenses (
    id VARCHAR(255) PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('FREE', 'PRO')),
    email VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'expired')),
    purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'webhook', 'api')),
    metadata JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(key);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
CREATE INDEX IF NOT EXISTS idx_licenses_domain ON licenses(domain);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_type ON licenses(type);
CREATE INDEX IF NOT EXISTS idx_licenses_created_at ON licenses(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_licenses_updated_at ON licenses;
CREATE TRIGGER update_licenses_updated_at 
    BEFORE UPDATE ON licenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some test data
INSERT INTO licenses (id, key, type, email, domain, status, source) VALUES
('lic_test_1', 'BB-PRO-1234-5678-ABCD', 'PRO', 'demo@example.com', 'localhost', 'active', 'manual'),
('lic_test_2', 'BB-PRO-DEMO-KEY-2024', 'PRO', 'demo@example.com', 'example.com', 'active', 'manual')
ON CONFLICT (key) DO NOTHING;
