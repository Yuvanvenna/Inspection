import React, { useState, useEffect, useRef } from 'react';
import {
  Paperclip,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileCode,
  FileArchive,
  Download,
  Trash2,
  ExternalLink,
  Layers,
  File,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { AttachmentService } from '../../services/attachment.service';
import { useAuth } from '../../context/AuthContext';
import { Attachment } from '@antigravity/shared';

interface AttachmentListProps {
  projectId: string;
  taskId?: string | null;
  readOnly?: boolean;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({
  projectId,
  taskId,
  readOnly = false,
}) => {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAttachments = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      if (taskId) {
        const data = await AttachmentService.getTaskAttachments(taskId);
        setAttachments(data);
      } else {
        const data = await AttachmentService.getProjectAttachments(projectId);
        setAttachments(data);
      }
    } catch (err) {
      console.error('Failed to load attachments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAttachments();

    const handleSync = () => {
      loadAttachments();
    };
    window.addEventListener('inspection:attachment-change', handleSync);
    return () => {
      window.removeEventListener('inspection:attachment-change', handleSync);
    };
  }, [projectId, taskId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await AttachmentService.uploadAttachment(projectId, file, user.id, taskId);
      }
      setUploadSuccess(`Successfully uploaded and saved ${files.length} file(s) to cloud!`);
      window.dispatchEvent(new CustomEvent('inspection:attachment-change'));
      setTimeout(() => setUploadSuccess(null), 4000);
      await loadAttachments();
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadError(err.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (att: Attachment) => {
    if (!window.confirm(`Are you sure you want to delete "${att.file_name}"?`)) return;

    try {
      await AttachmentService.deleteAttachment(att.id, att.storage_path);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      alert('Could not delete attachment');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string, fileType: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext) || fileType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-indigo-600" />;
    }
    if (['stl', 'obj', 'step', 'stp', 'iges', 'fbx', 'gltf', 'glb'].includes(ext)) {
      return <Layers className="w-5 h-5 text-purple-600" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'go', 'rs', 'html', 'css'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-emerald-600" />;
    }
    if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
      return <FileArchive className="w-5 h-5 text-amber-600" />;
    }
    return <File className="w-5 h-5 text-slate-600" />;
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-2">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400">Loading attachments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone (if not read-only) */}
      {!readOnly && (
        <div className="p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id={`file-upload-${projectId}-${taskId || 'general'}`}
          />
          <label
            htmlFor={`file-upload-${projectId}-${taskId || 'general'}`}
            className="cursor-pointer flex flex-col items-center justify-center space-y-2 text-center"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
              <UploadCloud className={`w-5 h-5 ${uploading ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {uploading ? 'Uploading and saving to cloud...' : 'Click or Drag to Upload Documents & Deliverables'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports PDF, CAD/3D Models (.stl, .obj), Images, Code, and Archives (up to 50MB)
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-semibold">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Auto-Saved: Files are saved to the project instantly upon selection — no save button needed.</span>
              </div>
            </div>
          </label>

          {uploadError && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {uploadSuccess}
            </div>
          )}
        </div>
      )}

      {/* Attachments List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1">
          <span className="flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
            Attached Documents ({attachments.length})
          </span>
          <button
            type="button"
            onClick={() => loadAttachments(true)}
            disabled={refreshing}
            className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
            title="Refresh attached documents from cloud"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {attachments.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-1">
            <Paperclip className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No attachments uploaded</p>
            <p className="text-[11px] text-slate-400">
              {readOnly
                ? 'No deliverables or specifications attached yet.'
                : 'Upload specifications, architecture diagrams, or CAD models above.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {attachments.map((att) => {
              const fileUrl = AttachmentService.getFileUrl(att.storage_path);
              const uploaderName = att.uploader?.name || 'Team Member';
              const canDelete =
                !readOnly && (user?.role === 'MANAGER' || user?.id === att.uploaded_by);

              return (
                <div
                  key={att.id}
                  className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      {getFileIcon(att.file_name, att.file_type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate" title={att.file_name}>
                        {att.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{formatFileSize(att.file_size)}</span>
                        <span>•</span>
                        <span>Uploaded by {uploaderName}</span>
                        <span>•</span>
                        <span>{new Date(att.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                      title="Open / Preview in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => AttachmentService.downloadFile(att.storage_path, att.file_name)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(att)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        title="Delete attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
