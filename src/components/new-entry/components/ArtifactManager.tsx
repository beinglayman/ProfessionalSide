import React, { useState } from 'react';
import { Upload, File, Image, FileText, Trash2, ExternalLink, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { FormData } from '../types/newEntryTypes';
import { formatFileSize, isSupportedFileType, createArtifactFromFile } from '../utils/formUtils';

interface ArtifactManagerProps {
  artifacts: FormData['artifacts'];
  onArtifactsChange: (artifacts: FormData['artifacts']) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
}

interface ArtifactItemProps {
  artifact: FormData['artifacts'][0];
  onRemove: (artifactId: string) => void;
}

const ArtifactItem: React.FC<ArtifactItemProps> = ({ artifact, onRemove }) => {
  const getFileIcon = () => {
    if (artifact.type.startsWith('image/')) {
      return <Image className="w-4 h-4 text-blue-500" />;
    }
    if (artifact.type === 'application/pdf') {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    return <File className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        {getFileIcon()}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {artifact.name}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(artifact.size)}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        {artifact.preview && (
          <button
            type="button"
            onClick={() => window.open(artifact.preview, '_blank')}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Preview file"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(artifact.id)}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Remove file"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

interface FileDropZoneProps {
  onFileSelect: (files: FileList) => void;
  isDragOver: boolean;
  onDragOver: (isDragOver: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFileSelect,
  isDragOver,
  onDragOver,
  className,
  children
}) => {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg transition-colors",
        isDragOver
          ? "border-primary-400 bg-primary-50"
          : "border-gray-300 hover:border-gray-400",
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {children}
      <input
        type="file"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        accept="image/*,.pdf,.doc,.docx,.txt,.md"
      />
    </div>
  );
};

export const ArtifactManager: React.FC<ArtifactManagerProps> = ({
  artifacts,
  onArtifactsChange,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024 // 10MB
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const processFiles = (files: FileList) => {
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    // Check if adding these files would exceed the limit
    if (artifacts.length + files.length > maxFiles) {
      newErrors.push(`Cannot upload more than ${maxFiles} files total`);
      setErrors(newErrors);
      return;
    }

    Array.from(files).forEach(file => {
      if (file.size > maxFileSize) {
        newErrors.push(`${file.name}: File too large (max ${formatFileSize(maxFileSize)})`);
      } else if (!isSupportedFileType(file)) {
        newErrors.push(`${file.name}: Unsupported file type`);
      } else {
        validFiles.push(file);
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
    } else {
      setErrors([]);
    }

    if (validFiles.length > 0) {
      const newArtifacts = validFiles.map(createArtifactFromFile);
      onArtifactsChange([...artifacts, ...newArtifacts]);
    }
  };

  const removeArtifact = (artifactId: string) => {
    const artifact = artifacts.find(a => a.id === artifactId);
    if (artifact?.preview) {
      URL.revokeObjectURL(artifact.preview);
    }

    onArtifactsChange(artifacts.filter(a => a.id !== artifactId));
    setErrors([]); // Clear errors when removing files
  };

  const clearAllArtifacts = () => {
    // Clean up preview URLs
    artifacts.forEach(artifact => {
      if (artifact.preview) {
        URL.revokeObjectURL(artifact.preview);
      }
    });
    onArtifactsChange([]);
    setErrors([]);
  };

  return (
    <div className="space-y-4">
      {/* Current Artifacts */}
      {artifacts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Uploaded Files ({artifacts.length}/{maxFiles})
            </h4>
            {artifacts.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllArtifacts}
                className="text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {artifacts.map(artifact => (
              <ArtifactItem
                key={artifact.id}
                artifact={artifact}
                onRemove={removeArtifact}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-red-800 mb-1">Upload Errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* File Upload Zone */}
      {artifacts.length < maxFiles && (
        <FileDropZone
          onFileSelect={processFiles}
          isDragOver={isDragOver}
          onDragOver={setIsDragOver}
          className="p-6 text-center"
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-gray-500">
              {maxFiles - artifacts.length} files remaining • Max {formatFileSize(maxFileSize)} each
            </p>
          </div>
        </FileDropZone>
      )}

      {/* Add More Button (alternative to drop zone) */}
      {artifacts.length > 0 && artifacts.length < maxFiles && (
        <FileDropZone
          onFileSelect={processFiles}
          isDragOver={isDragOver}
          onDragOver={setIsDragOver}
          className="p-3"
        >
          <div className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add More Files</span>
          </div>
        </FileDropZone>
      )}
    </div>
  );
};