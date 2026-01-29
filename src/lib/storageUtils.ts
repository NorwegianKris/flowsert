import { supabase } from '@/integrations/supabase/client';

/**
 * Get a signed URL for a file in a private storage bucket.
 * Falls back to public URL if signed URL generation fails.
 * 
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if the path is invalid
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!path) return null;

  // If it's already a full URL, extract the path
  let filePath = path;
  if (path.includes('/storage/v1/object/public/')) {
    const match = path.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    if (match) {
      filePath = match[1];
    }
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.warn(`Failed to create signed URL for ${bucket}/${filePath}:`, error.message);
      // Fall back to public URL if signed URL fails (for backwards compatibility)
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return publicData?.publicUrl || null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error getting signed URL:', err);
    return null;
  }
}

/**
 * Download a file as a blob and return a blob URL.
 * This bypasses ad blockers that may block Supabase URLs.
 * 
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @returns Object with blob URL and cleanup function, or null on failure
 */
export async function downloadAsBlob(
  bucket: string,
  path: string
): Promise<{ blobUrl: string; revoke: () => void } | null> {
  if (!path) return null;

  // Handle both full URLs (legacy) and relative paths (new)
  let filePath = path;
  
  // Check for full Supabase storage URL format
  if (path.includes('/storage/v1/object/')) {
    const match = path.match(new RegExp(`${bucket}/(.+)`));
    if (match) {
      filePath = match[1];
    }
  } else if (path.includes(`${bucket}/`)) {
    // Partial URL with bucket name
    const match = path.match(new RegExp(`${bucket}/(.+)`));
    if (match) {
      filePath = match[1];
    }
  }
  // If it's already a relative path, use as-is

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      console.error(`Failed to download ${bucket}/${filePath}:`, error.message);
      return null;
    }

    const blobUrl = URL.createObjectURL(data);
    return {
      blobUrl,
      revoke: () => URL.revokeObjectURL(blobUrl),
    };
  } catch (err) {
    console.error('Error downloading file:', err);
    return null;
  }
}

/**
 * Get a signed URL for a certificate document
 */
export async function getCertificateDocumentUrl(documentUrl: string | null | undefined): Promise<string | null> {
  if (!documentUrl) return null;
  
  // Extract the path from the full URL if needed
  let path = documentUrl;
  if (documentUrl.includes('certificate-documents/')) {
    const match = documentUrl.match(/certificate-documents\/(.+)/);
    if (match) {
      path = match[1];
    }
  }
  
  return getSignedUrl('certificate-documents', path);
}

/**
 * Get a signed URL for a project document
 */
export async function getProjectDocumentUrl(documentUrl: string | null | undefined): Promise<string | null> {
  if (!documentUrl) return null;
  
  let path = documentUrl;
  if (documentUrl.includes('project-documents/')) {
    const match = documentUrl.match(/project-documents\/(.+)/);
    if (match) {
      path = match[1];
    }
  }
  
  return getSignedUrl('project-documents', path);
}

/**
 * Get a signed URL for a personnel document
 */
export async function getPersonnelDocumentUrl(documentUrl: string | null | undefined): Promise<string | null> {
  if (!documentUrl) return null;
  
  // Handle both legacy full URLs and new relative paths
  let path = documentUrl;
  
  // If it's a full URL, extract the path
  if (documentUrl.includes('/storage/v1/object/')) {
    const match = documentUrl.match(/personnel-documents\/(.+)/);
    if (match) {
      path = match[1];
    }
  } else if (documentUrl.includes('personnel-documents/')) {
    // Partial URL with bucket name
    const match = documentUrl.match(/personnel-documents\/(.+)/);
    if (match) {
      path = match[1];
    }
  }
  // If it's already a relative path (e.g., "uuid/filename.pdf"), use as-is
  
  return getSignedUrl('personnel-documents', path);
}
