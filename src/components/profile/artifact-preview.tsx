import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight, FileText, Image, Code, FileJson } from 'lucide-react';
import { Button } from '../ui/button';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ArtifactPreviewProps {
  artifacts: Array<{
    type: 'image' | 'code' | 'pdf' | 'html' | 'json';
    name: string;
    url: string;
    content?: string;
    language?: string;
  }>;
  currentIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function ArtifactPreview({ artifacts, currentIndex, onClose, onPrevious, onNext }: ArtifactPreviewProps) {
  const currentArtifact = artifacts[currentIndex];

  const renderContent = () => {
    switch (currentArtifact.type) {
      case 'image':
        return (
          <img
            src={currentArtifact.url}
            alt={currentArtifact.name}
            className="max-h-[80vh] w-auto rounded-lg object-contain"
          />
        );
      case 'code':
      case 'json':
        return (
          <div className="max-h-[80vh] w-full overflow-auto rounded-lg">
            <SyntaxHighlighter
              language={currentArtifact.language || 'typescript'}
              style={tomorrow}
              className="rounded-lg"
            >
              {currentArtifact.content || ''}
            </SyntaxHighlighter>
          </div>
        );
      case 'pdf':
        return (
          <iframe
            src={currentArtifact.url}
            className="h-[80vh] w-full rounded-lg"
            title={currentArtifact.name}
          />
        );
      case 'html':
        return (
          <iframe
            src={currentArtifact.url}
            className="h-[80vh] w-full rounded-lg"
            title={currentArtifact.name}
          />
        );
      default:
        return null;
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'code':
        return <Code className="h-5 w-5" />;
      case 'json':
        return <FileJson className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={() => onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-8 z-50 flex flex-col rounded-lg bg-white p-8 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getFileIcon(currentArtifact.type)}
              <Dialog.Title className="text-xl font-semibold">
                {currentArtifact.name}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-5 w-5" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            {renderContent()}

            <div className="absolute inset-x-0 bottom-4 flex justify-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                onClick={onPrevious}
                disabled={currentIndex === 0}
                className="rounded-full bg-white/90 backdrop-blur-sm"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onNext}
                disabled={currentIndex === artifacts.length - 1}
                className="rounded-full bg-white/90 backdrop-blur-sm"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <p className="text-sm text-gray-500">
              {currentIndex + 1} of {artifacts.length}
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}