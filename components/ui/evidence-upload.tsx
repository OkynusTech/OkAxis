'use client';

import { useState } from 'react';
import { X, Upload, Image as ImageIcon, File } from 'lucide-react';
import { Button } from './button';
import { EvidenceFile, processFileUpload, isImageFile, formatFileSize, getFileIcon } from '@/lib/evidence-utils';

interface EvidenceUploadProps {
    files: EvidenceFile[];
    onChange: (files: EvidenceFile[]) => void;
    maxFiles?: number;
}

export function EvidenceUpload({ files, onChange, maxFiles = 10 }: EvidenceUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFileSelect = async (selectedFiles: FileList | null) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        setError(null);
        setUploading(true);

        try {
            const newFiles: EvidenceFile[] = [];

            for (let i = 0; i < selectedFiles.length; i++) {
                if (files.length + newFiles.length >= maxFiles) {
                    setError(`Maximum ${maxFiles} files allowed`);
                    break;
                }

                try {
                    const evidenceFile = await processFileUpload(selectedFiles[i]);
                    newFiles.push(evidenceFile);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to upload file');
                    break;
                }
            }

            if (newFiles.length > 0) {
                onChange([...files, ...newFiles]);
            }
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    const handleRemove = (fileId: string) => {
        onChange(files.filter((f) => f.id !== fileId));
    };

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div
                className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    id="evidence-upload"
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.txt,.json"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    disabled={uploading || files.length >= maxFiles}
                />

                <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <div>
                        <label
                            htmlFor="evidence-upload"
                            className="cursor-pointer font-medium text-primary hover:underline"
                        >
                            Click to upload
                        </label>
                        <span className="text-muted-foreground"> or drag and drop</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        PNG, JPEG, GIF, WebP, PDF, TXT, JSON (max 5MB per file)
                    </p>
                    {files.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            {files.length} / {maxFiles} files uploaded
                        </p>
                    )}
                </div>

                {uploading && (
                    <div className="mt-4">
                        <div className="mx-auto h-2 w-32 overflow-hidden rounded-full bg-muted">
                            <div className="h-full w-1/2 animate-pulse bg-primary"></div>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                    <p>{error}</p>
                </div>
            )}

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium">Uploaded Evidence ({files.length})</p>
                    <div className="space-y-2">
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center gap-3 rounded-md border bg-card p-3"
                            >
                                {/* File Icon/Preview */}
                                <div className="flex-shrink-0">
                                    {isImageFile(file.type) ? (
                                        <div className="relative h-12 w-12 overflow-hidden rounded border">
                                            <img
                                                src={file.data}
                                                alt={file.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex h-12 w-12 items-center justify-center rounded border bg-muted text-2xl">
                                            {getFileIcon(file.type)}
                                        </div>
                                    )}
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-sm font-medium">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>

                                {/* Remove Button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemove(file.id)}
                                    className="flex-shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Storage Warning */}
            {files.length > 5 && (
                <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                    <p>
                        ⚠️ You have {files.length} evidence files. Large numbers of files may impact
                        performance. Consider using external file hosting for production use.
                    </p>
                </div>
            )}
        </div>
    );
}
