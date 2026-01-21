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
  
  let path = documentUrl;
  if (documentUrl.includes('personnel-documents/')) {
    const match = documentUrl.match(/personnel-documents\/(.+)/);
    if (match) {
      path = match[1];
    }
  }
  
  return getSignedUrl('personnel-documents', path);
}
