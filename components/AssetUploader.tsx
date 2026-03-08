import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface AssetUploaderProps {
  onUploadSuccess: (url: string) => void;
  currentUrl?: string;
  label?: string;
  className?: string;
}

const AssetUploader: React.FC<AssetUploaderProps> = ({ 
  onUploadSuccess, 
  currentUrl, 
  label = "Upload Image",
  className = ""
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive full server URL for the asset (assuming dev server is on 3001 if not same origin)
  // In production with Tauri/bundled, it might be same-origin, but we need to handle dev.
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  const getFullUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${baseUrl}${url}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (PNG, JPG, SVG).');
        return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File is too large. Maximum size is 5MB.');
        return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('asset', file);

    try {
      const response = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (data.url) {
        onUploadSuccess(data.url);
      } else {
        throw new Error('No URL returned from server');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset input
      }
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</label>}
      
      <div className="flex items-center gap-4">
        {/* Preview Bubble */}
        <div className="w-16 h-16 rounded-xl border border-slate-700 bg-slate-800/50 flex items-center justify-center overflow-hidden shrink-0">
            {currentUrl ? (
                <img src={getFullUrl(currentUrl)} alt="Asset Preview" className="w-full h-full object-contain" />
            ) : (
                <ImageIcon className="text-slate-600" size={24} />
            )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 flex flex-col gap-2">
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
            
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {isUploading ? 'Uploading...' : 'Choose File'}
                </button>
                
                {currentUrl && (
                    <button
                        type="button"
                        onClick={() => onUploadSuccess('')} // Clear via empty string
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Remove Asset"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
            
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default AssetUploader;
