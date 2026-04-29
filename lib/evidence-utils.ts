// Evidence file handling utilities

export interface EvidenceFile {
    id: string;
    name: string;
    type: string; // MIME type
    size: number;
    data: string; // base64 encoded data
    uploadedAt: string;
}

// Maximum file size: 5MB (to stay within localStorage limits)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/json'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

export function isImageFile(type: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(type);
}

export function isAllowedFileType(type: string): boolean {
    return ALLOWED_TYPES.includes(type);
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Convert file to base64
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to read file'));
            }
        };
        reader.onerror = (error) => reject(error);
    });
}

// Compress image if needed (basic quality reduction)
export async function compressImage(base64: string, maxSizeKB: number = 500): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions if image is too large
            const maxDimension = 1920;
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = (height / width) * maxDimension;
                    width = maxDimension;
                } else {
                    width = (width / height) * maxDimension;
                    height = maxDimension;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Try different quality levels
            let quality = 0.8;
            let result = canvas.toDataURL('image/jpeg', quality);

            // If still too large, reduce quality further
            while (result.length > maxSizeKB * 1024 && quality > 0.1) {
                quality -= 0.1;
                result = canvas.toDataURL('image/jpeg', quality);
            }

            resolve(result);
        };
        img.onerror = () => resolve(base64);
    });
}

// Validate and process file upload
export async function processFileUpload(file: File): Promise<EvidenceFile> {
    // Validate file type
    if (!isAllowedFileType(file.type)) {
        throw new Error(
            `File type not allowed. Allowed types: Images (PNG, JPEG, GIF, WebP), PDF, TXT, JSON`
        );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed size of ${formatFileSize(MAX_FILE_SIZE)}`);
    }

    // Convert to base64
    let base64Data = await fileToBase64(file);

    // Compress images if needed
    if (isImageFile(file.type) && file.size > 500 * 1024) {
        base64Data = await compressImage(base64Data);
    }

    return {
        id: `evidence-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64Data,
        uploadedAt: new Date().toISOString(),
    };
}

// Get file extension from name
export function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

// Get icon for file type
export function getFileIcon(type: string): string {
    if (isImageFile(type)) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type === 'text/plain') return '📝';
    if (type === 'application/json') return '{ }';
    return '📎';
}

// Calculate total size of evidence files
export function calculateTotalEvidenceSize(files: EvidenceFile[]): number {
    return files.reduce((total, file) => total + file.data.length, 0);
}

// Warn if approaching localStorage limit
export function checkStorageLimit(files: EvidenceFile[]): { warning: boolean; message?: string } {
    const totalSize = calculateTotalEvidenceSize(files);
    const limitMB = 5; // Conservative limit for localStorage
    const limitBytes = limitMB * 1024 * 1024;

    if (totalSize > limitBytes * 0.8) {
        return {
            warning: true,
            message: `Evidence files are using ${formatFileSize(totalSize)} of ~${limitMB}MB available. Consider using external file hosting for large files.`,
        };
    }

    return { warning: false };
}
