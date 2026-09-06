import { supabase } from '../lib/supabase';
import { Attachment } from '@antigravity/shared';

const BUCKET_NAME = 'project-attachments';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Converts a browser File object to Base64 data string.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Strip off "data:*/*;base64," prefix
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export const AttachmentService = {
  /**
   * Uploads a file to Supabase Storage and records metadata.
   * Primary pathway: Express API with Supabase Service Role Key (bypasses RLS).
   * Secondary fallback: Direct Supabase client upload.
   */
  async uploadAttachment(
    projectId: string,
    file: File,
    uploadedBy: string,
    taskId?: string | null
  ): Promise<Attachment> {
    // 1. Primary: Upload via backend server (bypasses RLS restrictions completely)
    try {
      const base64Data = await fileToBase64(file);
      const res = await fetch(`${API_URL}/attachments/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': uploadedBy,
        },
        body: JSON.stringify({
          projectId,
          taskId: taskId || null,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          fileData: base64Data,
          uploadedBy,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data as Attachment;
        }
      }
      const errJson = await res.json().catch(() => null);
      if (errJson?.error) {
        console.warn('Backend upload returned error, falling back to direct storage:', errJson.error);
      }
    } catch (apiErr) {
      console.warn('Backend attachment route unreachable, attempting direct storage upload:', apiErr);
    }

    // 2. Direct Supabase Storage fallback
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = taskId ? `${projectId}/tasks/${taskId}` : `${projectId}/general`;
    const storagePath = `${folder}/${timestamp}_${cleanFileName}`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (storageError) {
      throw new Error(`Storage upload failed: ${storageError.message}`);
    }

    // Insert metadata into public.attachments
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

      if (!dbError && dbData) {
        return dbData as Attachment;
      }
    } catch (e) {
      console.warn('Database attachments table query failed:', e);
    }

    // Fallback object
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
    // 1. Try server API
    try {
      const res = await fetch(`${API_URL}/attachments?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data as Attachment[];
        }
      }
    } catch (err) {
      console.warn('API getProjectAttachments failed, using direct client:', err);
    }

    // 2. Direct Supabase query
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
    // 1. Try server API
    try {
      const res = await fetch(`${API_URL}/attachments?taskId=${encodeURIComponent(taskId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data as Attachment[];
        }
      }
    } catch (err) {
      console.warn('API getTaskAttachments failed, using direct client:', err);
    }

    // 2. Direct Supabase query
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
    try {
      await fetch(`${API_URL}/attachments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath }),
      });
    } catch (apiErr) {
      console.warn('API delete failed, using direct client:', apiErr);
    }

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
