-- Migration: Create feedback_requests table
-- Description: Table for storing feedback requests from landing page

CREATE TABLE IF NOT EXISTS feedback_requests (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    tel VARCHAR(50) NULL,
    tg VARCHAR(100) NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_requests_status ON feedback_requests(status);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_created_at ON feedback_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_email ON feedback_requests(email);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_feedback_requests_updated_at ON feedback_requests;
CREATE TRIGGER update_feedback_requests_updated_at 
    BEFORE UPDATE ON feedback_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

