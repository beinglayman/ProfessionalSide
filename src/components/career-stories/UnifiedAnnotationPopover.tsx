/**
 * UnifiedAnnotationPopover Component
 *
 * Single popover for creating and editing annotations.
 * Combines style picker, color picker, and rich text note editor.
 *
 * Create mode: style + color + note → Apply
 * Edit mode:   pre-populated style/color/note → Save
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Highlighter,
  Underline,
  Square,
  Circle,
  Strikethrough,
  Brackets,
  X,
  Trash2,
  Bold,
  Italic,
  List,
  Check,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '../../lib/utils';
import { isEmptyNoteHtml } from '../../lib/sanitize-html';
import type { StoryAnnotation, AnnotationStyle } from '../../types/career-stories';
import {
  ANNOTATION_COLORS,
  DEFAULT_COLOR_ID,
  type AnnotationColorId,
} from './annotation-colors';

// =============================================================================
// STYLE DEFINITIONS
// =============================================================================

const STYLES: { style: AnnotationStyle; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { style: 'highlight', label: 'Highlight', Icon: Highlighter },
  { style: 'underline', label: 'Underline', Icon: Underline },
  { style: 'box', label: 'Box', Icon: Square },
  { style: 'circle', label: 'Circle', Icon: Circle },
  { style: 'strike-through', label: 'Strike-through', Icon: Strikethrough },
  { style: 'bracket', label: 'Bracket', Icon: Brackets },
];

// =============================================================================
// PROPS
// =============================================================================

interface PopoverBaseProps {
  position: { x: number; y: number };
  onClose: () => void;
}

interface CreateModeProps extends PopoverBaseProps {
  mode: 'create';
  annotation?: undefined;
  onApply: (style: AnnotationStyle, color: AnnotationColorId, note: string | null) => void;
  onSave?: undefined;
  onRemove?: undefined;
}

interface EditModeProps extends PopoverBaseProps {
  mode: 'edit';
  annotation: StoryAnnotation;
  onApply?: undefined;
  onSave: (updates: { style?: AnnotationStyle; color?: string | null; note?: string | null }) => void;
  onRemove: () => void;
}

type UnifiedAnnotationPopoverProps = CreateModeProps | EditModeProps;

// =============================================================================
// COMPONENT
// =============================================================================

export const UnifiedAnnotationPopover: React.FC<UnifiedAnnotationPopoverProps> = ({
  position,
  mode,
  annotation,
  onApply,
  onSave,
  onRemove,
  onClose,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<AnnotationStyle>(
    annotation?.style ?? 'highlight'
  );
  const [selectedColor, setSelectedColor] = useState<AnnotationColorId>(
    (annotation?.color as AnnotationColorId) ?? DEFAULT_COLOR_ID
  );

  // Tiptap editor for rich text notes
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
      }),
    ],
    content: annotation?.note ?? '',
    editorProps: {
      attributes: {
        class: 'prose-micro min-h-[3rem] max-h-[6rem] overflow-y-auto text-sm px-2.5 py-1.5 focus:outline-none',
      },
    },
  });

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = useCallback(() => {
    const noteHtml = editor?.getHTML() ?? '';
    const note = isEmptyNoteHtml(noteHtml) ? null : noteHtml;

    if (mode === 'create') {
      onApply?.(selectedStyle, selectedColor, note);
    } else {
      onSave?.({ style: selectedStyle, color: selectedColor, note });
    }
  }, [editor, mode, selectedStyle, selectedColor, onApply, onSave]);

  return (
    <>
      {/* Backdrop to close on click-outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-md w-80"
        style={{ left: position.x, top: position.y, transform: 'translate(-50%, 8px)' }}
      >
        {/* Header — edit mode shows truncated text */}
        {mode === 'edit' && annotation && (
          <div className="flex items-start justify-between px-3 pt-3 pb-1">
            <p className="text-[11px] text-gray-400 line-clamp-2 flex-1 pr-2 italic">
              &ldquo;{annotation.annotatedText.slice(0, 80)}
              {annotation.annotatedText.length > 80 ? '...' : ''}&rdquo;
            </p>
            <button
              onClick={onClose}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Create mode close button */}
        {mode === 'create' && (
          <div className="flex justify-end px-3 pt-2">
            <button
              onClick={onClose}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Style picker row */}
        <div className="flex items-center gap-0.5 px-3 pb-2 border-b border-gray-100">
          {STYLES.map(({ style, label, Icon }) => {
            const isActive = selectedStyle === style;
            return (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={cn(
                  'relative w-7 h-7 flex items-center justify-center rounded transition-colors',
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50',
                )}
                title={label}
                aria-label={`Mark as ${label}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {isActive && (
                  <Check className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-primary-600" />
                )}
              </button>
            );
          })}
        </div>

        {/* Color picker row */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100">
          {ANNOTATION_COLORS.map((color) => {
            const isActive = selectedColor === color.id;
            return (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color.id)}
                className={cn(
                  'relative w-5 h-5 rounded-full transition-transform',
                  isActive && 'ring-2 ring-offset-1 ring-gray-400 scale-110',
                )}
                style={{ backgroundColor: color.dot }}
                title={color.id}
                aria-label={`Color: ${color.id}`}
              >
                {isActive && (
                  <Check className="absolute inset-0 m-auto w-3 h-3 text-white drop-shadow-sm" />
                )}
              </button>
            );
          })}
        </div>

        {/* Rich text note editor */}
        <div className="px-3 py-2">
          {/* Mini toolbar */}
          {editor && (
            <div className="flex items-center gap-0.5 mb-1">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(
                  'w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors',
                  editor.isActive('bold') && 'bg-gray-100 text-gray-800',
                )}
                title="Bold"
                aria-label="Bold"
              >
                <Bold className="w-3 h-3" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(
                  'w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors',
                  editor.isActive('italic') && 'bg-gray-100 text-gray-800',
                )}
                title="Italic"
                aria-label="Italic"
              >
                <Italic className="w-3 h-3" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn(
                  'w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors',
                  editor.isActive('bulletList') && 'bg-gray-100 text-gray-800',
                )}
                title="Bullet list"
                aria-label="Bullet list"
              >
                <List className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Editor area */}
          <div className="border border-gray-200 rounded focus-within:ring-1 focus-within:ring-primary-300 focus-within:border-primary-300">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between px-3 pb-3">
          {mode === 'edit' ? (
            <button
              onClick={onRemove}
              className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </button>
          ) : (
            <div /> /* spacer */
          )}

          <button
            onClick={handleSubmit}
            className="text-[11px] font-medium bg-primary-500 hover:bg-primary-600 text-white px-3 py-1 rounded transition-colors"
          >
            {mode === 'create' ? 'Apply' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
};
