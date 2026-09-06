import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export const attachmentRouter = Router();

const BUCKET_NAME = 'project-attachments';

/**
 * Helper to ensure the storage bucket exists in Supabase.
 */
async function ensureBucketExists() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!exists) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
      console.log(`[Storage] Created bucket "${BUCKET_NAME}"`);
    }
  } catch (err: any) {
    console.warn('[Storage] Bucket ensure error:', err.message);
  }
}

// Ensure bucket on initialization
ensureBucketExists().catch(() => {});

/**
 * POST /api/attachments/upload
 * Securely uploads file to Supabase Storage using admin service role,
 * completely bypassing client RLS restrictions.
 */
attachmentRouter.post('/attachments/upload', async (req: Request, res: Response) => {
  try {
    const { projectId, taskId, fileName, fileType, fileSize, fileData, uploadedBy } = req.body;

    if (!projectId || !fileName || !fileData || !uploadedBy) {
      return res.status(400).json({
        success: false,
        error: 'projectId, fileName, fileData (base64), and uploadedBy are required.',
      });
    }

    await ensureBucketExists();

    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = taskId ? `${projectId}/tasks/${taskId}` : `${projectId}/general`;
    const storagePath = `${folder}/${timestamp}_${cleanFileName}`;

    // Convert Base64 payload into Buffer
    const buffer = Buffer.from(fileData, 'base64');

    // 1. Upload to Supabase Storage via admin client (bypasses RLS)
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: fileType || 'application/octet-stream',
        upsert: true,
      });

    if (storageError) {
      console.error('[Storage Error] Admin upload failed:', storageError);
      return res.status(500).json({
        success: false,
        error: `Storage upload failed: ${storageError.message}`,
      });
    }

    // 2. Insert metadata into public.attachments table
    const attachmentPayload = {
      project_id: projectId,
      task_id: taskId || null,
      file_name: fileName,
      file_size: fileSize || buffer.length,
      file_type: fileType || 'application/octet-stream',
      storage_path: storageData.path,
      uploaded_by: uploadedBy,
    };

    const { data: dbData, error: dbError } = await supabaseAdmin
      .from('attachments')
      .insert([attachmentPayload])
      .select(`
        *,
        uploader:profiles(id, name, email, role)
      `)
      .single();

    if (dbError) {
      console.warn('[DB Warning] Attachments table record insert warning:', dbError.message);
      // Fallback response with storage path if attachments table schema isn't created yet
      return res.status(201).json({
        success: true,
        data: {
          id: storageData.path,
          project_id: projectId,
          task_id: taskId || null,
          file_name: fileName,
          file_size: fileSize || buffer.length,
          file_type: fileType || 'application/octet-stream',
          storage_path: storageData.path,
          uploaded_by: uploadedBy,
          created_at: new Date().toISOString(),
        },
      });
    }

    return res.status(201).json({
      success: true,
      data: dbData,
    });
  } catch (err: any) {
    console.error('[Attachment Upload Exception]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while processing attachment upload',
    });
  }
});

/**
 * GET /api/attachments
 * Retrieves attachments for a project or task.
 */
attachmentRouter.get('/attachments', async (req: Request, res: Response) => {
  try {
    const { projectId, taskId } = req.query;

    if (!projectId && !taskId) {
      return res.status(400).json({
        success: false,
        error: 'Either projectId or taskId is required',
      });
    }

    let query = supabaseAdmin
      .from('attachments')
      .select(`
        *,
        uploader:profiles(id, name, email, role)
      `)
      .order('created_at', { ascending: false });

    if (taskId) {
      query = query.eq('task_id', String(taskId));
    } else if (projectId) {
      query = query.eq('project_id', String(projectId));
    }

    const { data, error } = await query;
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/attachments/:id
 * Deletes attachment from storage bucket and database.
 */
attachmentRouter.delete('/attachments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { storagePath } = req.body;

    if (storagePath) {
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([storagePath]);
    }

    await supabaseAdmin.from('attachments').delete().eq('id', id);

    return res.json({ success: true, message: 'Attachment deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
