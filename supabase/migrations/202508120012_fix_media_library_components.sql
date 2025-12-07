-- ============================================================================
-- Add Missing Columns to media_library Table
-- ============================================================================

-- Add storage_path column
ALTER TABLE media_library 
ADD COLUMN IF NOT EXISTS storage_path text;

-- Add public_url column (rename from url)
ALTER TABLE media_library 
ADD COLUMN IF NOT EXISTS public_url text;

-- Add mime_type column (rename from file_type)
ALTER TABLE media_library 
ADD COLUMN IF NOT EXISTS mime_type text;

-- Add width column
ALTER TABLE media_library 
ADD COLUMN IF NOT EXISTS width integer;

-- Add height column
ALTER TABLE media_library 
ADD COLUMN IF NOT EXISTS height integer;

-- ============================================================================
-- Migrate Data from Old Columns to New Columns
-- ============================================================================

-- Copy url to public_url if public_url is null
UPDATE media_library 
SET public_url = url 
WHERE public_url IS NULL AND url IS NOT NULL;

-- Copy file_type to mime_type if mime_type is null
UPDATE media_library 
SET mime_type = file_type 
WHERE mime_type IS NULL AND file_type IS NOT NULL;

-- Set storage_path based on existing url (extract from CDN URL)
-- This is a best-effort migration for existing records
UPDATE media_library 
SET storage_path = COALESCE(
  -- Extract path from Supabase storage URL
  regexp_replace(url, '^.*\/storage\/v1\/object\/public\/media_library\/', ''),
  -- Or use a default pattern with user_id
  user_id::text || '/' || filename
)
WHERE storage_path IS NULL;

-- ============================================================================
-- Make New Columns Required (After Data Migration)
-- ============================================================================

-- Make storage_path NOT NULL
ALTER TABLE media_library 
ALTER COLUMN storage_path SET NOT NULL;

-- Make public_url NOT NULL
ALTER TABLE media_library 
ALTER COLUMN public_url SET NOT NULL;

-- Make mime_type NOT NULL
ALTER TABLE media_library 
ALTER COLUMN mime_type SET NOT NULL;

-- ============================================================================
-- Optional: Drop Old Columns (Keep for now for safety)
-- ============================================================================

-- Uncomment these lines after verifying the migration works:
-- ALTER TABLE media_library DROP COLUMN IF EXISTS url;
-- ALTER TABLE media_library DROP COLUMN IF EXISTS file_type;

-- ============================================================================
-- Verify Migration
-- ============================================================================

-- Check the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'media_library'
ORDER BY ordinal_position;