import React from 'react';
import { Upload, File, Image, FileText, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Step5Props } from '../types/newEntryTypes';
import { formatFileSize, isSupportedFileType, createArtifactFromFile } from '../utils/formUtils';

interface ArtifactItemProps {
  artifact: Step5Props['formData']['artifacts'][0];
  onRemove: (artifactId: string) => void;
}

const ArtifactItem: React.FC<ArtifactItemProps> = ({ artifact, onRemove }) => {
  const getFileIcon = () => {
    if (artifact.type.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-500" />;
    }
    if (artifact.type === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center space-x-3">
        {getFileIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {artifact.name}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(artifact.size)} • {artifact.type}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {artifact.preview && (
          <button
            type="button"
            onClick={() => window.open(artifact.preview, '_blank')}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Preview file"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(artifact.id)}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Remove file"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface FileDropZoneProps {
  onFileSelect: (files: FileList) => void;
  isDragOver: boolean;
  onDragOver: (isDragOver: boolean) => void;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFileSelect,
  isDragOver,
  onDragOver
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
        "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
        isDragOver
          ? "border-primary-400 bg-primary-50"
          : "border-gray-300 hover:border-gray-400"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-900">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-gray-500">
          Support for images, PDFs, documents, and more
        </p>
        <p className="text-xs text-gray-400">
          Maximum file size: 10MB
        </p>
      </div>
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

export const Step5Artifacts: React.FC<Step5Props> = ({
  formData,
  setFormData,
  handleFileUpload,
  handleRemoveArtifact
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const processFiles = (files: FileList) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        errors.push(`${file.name}: File too large (max 10MB)`);
      } else if (!isSupportedFileType(file)) {
        errors.push(`${file.name}: Unsupported file type`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      alert('Some files could not be uploaded:\n' + errors.join('\n'));
    }

    if (validFiles.length > 0) {
      const newArtifacts = validFiles.map(createArtifactFromFile);
      setFormData({
        ...formData,
        artifacts: [...formData.artifacts, ...newArtifacts]
      });
    }
  };

  const removeArtifact = (artifactId: string) => {
    const artifact = formData.artifacts.find(a => a.id === artifactId);
    if (artifact?.preview) {
      URL.revokeObjectURL(artifact.preview);
    }

    setFormData({
      ...formData,
      artifacts: formData.artifacts.filter(a => a.id !== artifactId)
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 5 of 7</h2>
        <p className="text-sm text-gray-600">
          Upload supporting files and documents (optional)
        </p>
      </div>

      {/* Current Artifacts */}
      {formData.artifacts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">
            Uploaded Files ({formData.artifacts.length})
          </h3>
          <div className="space-y-2">
            {formData.artifacts.map(artifact => (
              <ArtifactItem
                key={artifact.id}
                artifact={artifact}
                onRemove={removeArtifact}
              />
            ))}
          </div>
        </div>
      )}

      {/* File Upload Zone */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Add Files</h3>
        <div className="relative">
          <FileDropZone
            onFileSelect={processFiles}
            isDragOver={isDragOver}
            onDragOver={setIsDragOver}
          />
        </div>
      </div>

      {/* File Type Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          Supported File Types
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-medium mb-1">Images</p>
            <p className="text-xs">JPEG, PNG, GIF, WebP</p>
          </div>
          <div>
            <p className="font-medium mb-1">Documents</p>
            <p className="text-xs">PDF, Word, Text, Markdown</p>
          </div>
        </div>
        <div className="mt-3 text-xs text-blue-700">
          <p>• All files are stored securely and only accessible by you and your team</p>
          <p>• Maximum file size: 10MB per file</p>
          <p>• Images will be automatically optimized for web viewing</p>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Examples of Useful Artifacts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <p className="font-medium mb-1">For Achievements</p>
            <p className="text-xs">Certificates, awards, screenshots of recognition</p>
          </div>
          <div>
            <p className="font-medium mb-1">For Learning</p>
            <p className="text-xs">Course materials, notes, project screenshots</p>
          </div>
          <div>
            <p className="font-medium mb-1">For Challenges</p>
            <p className="text-xs">Before/after comparisons, solution diagrams</p>
          </div>
          <div>
            <p className="font-medium mb-1">For Reflections</p>
            <p className="text-xs">Mind maps, analysis documents, references</p>
          </div>
        </div>
      </div>
    </div>
  );
};