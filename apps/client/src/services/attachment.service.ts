import { supabase } from '../lib/supabase';
import { Attachment } from '@antigravity/shared';

const BUCKET_NAME = 'project-attachments';

export const AttachmentService = {
  /**
   * Uploads a file to Supabase Storage and records metadata.
   */
  async uploadAttachment(
    projectId: string,
    file: File,
    uploadedBy: string,
    taskId?: string | null
  ): Promise<Attachment> {
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = taskId ? `${projectId}/tasks/${taskId}` : `${projectId}/general`;
    const storagePath = `${folder}/${timestamp}_${cleanFileName}`;

    // 1. Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (storageError) {
      throw new Error(`Storage upload failed: ${storageError.message}`);
    }

    // 2. Insert metadata into public.attachments
    const attachmentPayload = {
      project_id: projectId,
      task_id: taskId || null,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || 'application/octet-stream',
      storage_path: storageData.path,
      uploaded_by: uploadedBy,
    };

    try {
      const { data: dbData, error: dbError } = await supabase
        .from('attachments')
        .insert([attachmentPayload])
        .select(`
          *,
          uploader:profiles(id, name, email, role)
        `)
        .single();

      if (dbError) {
        console.warn('Metadata insertion failed, using storage record:', dbError.message);
      } else if (dbData) {
        return dbData as Attachment;
      }
    } catch (e) {
      console.warn('Database attachments table query failed:', e);
    }

    // Fallback object if table is still synchronizing
    return {
      id: storageData.path,
      project_id: projectId,
      task_id: taskId || null,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || 'application/octet-stream',
      storage_path: storageData.path,
      uploaded_by: uploadedBy,
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Retrieves all attachments for a specific project.
   */
  async getProjectAttachments(projectId: string): Promise<Attachment[]> {
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select(`
          *,
          uploader:profiles(id, name, email, role)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as Attachment[];
      }
    } catch (err) {
      console.warn('Attachments table fetch error:', err);
    }

    return [];
  },

  /**
   * Retrieves attachments associated with a specific task.
   */
  async getTaskAttachments(taskId: string): Promise<Attachment[]> {
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select(`
          *,
          uploader:profiles(id, name, email, role)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as Attachment[];
      }
    } catch (err) {
      console.warn('Task attachments fetch error:', err);
    }

    return [];
  },

  /**
   * Generates a direct download/view URL.
   */
  getFileUrl(storagePath: string): string {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    return data.publicUrl;
  },

  /**
   * Downloads a file directly.
   */
  async downloadFile(storagePath: string, fileName: string): Promise<void> {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(storagePath);
    if (error || !data) {
      throw new Error(`Download failed: ${error?.message}`);
    }

    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Deletes an attachment from storage and database.
   */
  async deleteAttachment(id: string, storagePath: string): Promise<void> {
    // 1. Delete from Supabase Storage
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);

    // 2. Delete record from database
    try {
      await supabase.from('attachments').delete().eq('id', id);
    } catch (err) {
      console.warn('Failed to delete attachment row:', err);
    }
  },
};
