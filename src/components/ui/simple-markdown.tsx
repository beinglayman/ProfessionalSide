import React from 'react';
import { cn } from '../../lib/utils';

interface SimpleMarkdownProps {
  content: string;
  className?: string;
  /** Maximum lines to show before truncating. Default: no limit */
  maxLines?: number;
}

/**
 * Lightweight markdown renderer for activity descriptions.
 * Supports: headers, bullets, checkboxes, bold, italic, inline code, code blocks, links.
 * Does NOT support: tables, images, nested lists, blockquotes.
 */
export function SimpleMarkdown({ content, className, maxLines }: SimpleMarkdownProps) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';

  const processInlineFormatting = (text: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    // Process inline elements: links, code, bold, italic
    while (remaining.length > 0) {
      // Links: [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        result.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Inline code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        result.push(
          <code key={key++} className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-700">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*|^__([^_]+)__/);
      if (boldMatch) {
        result.push(
          <strong key={key++} className="font-semibold">
            {boldMatch[1] || boldMatch[2]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_ (but not ** or __)
      const italicMatch = remaining.match(/^\*([^*]+)\*|^_([^_]+)_/);
      if (italicMatch) {
        result.push(
          <em key={key++} className="italic">
            {italicMatch[1] || italicMatch[2]}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // No match - take next character as plain text
      const nextSpecial = remaining.slice(1).search(/[\[`*_]/);
      if (nextSpecial === -1) {
        result.push(remaining);
        break;
      } else {
        result.push(remaining.slice(0, nextSpecial + 1));
        remaining = remaining.slice(nextSpecial + 1);
      }
    }

    return result;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block start/end
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        codeBlockContent = [];
      } else {
        // End code block
        elements.push(
          <pre
            key={`code-${i}`}
            className="text-[10px] font-mono bg-gray-100 rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap"
          >
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockLang = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={`br-${i}`} className="h-1.5" />);
      continue;
    }

    // Headers: ## Header
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const headerClasses = {
        1: 'text-sm font-bold text-gray-900',
        2: 'text-xs font-bold text-gray-900',
        3: 'text-xs font-semibold text-gray-800',
        4: 'text-xs font-semibold text-gray-700',
        5: 'text-[11px] font-medium text-gray-700',
        6: 'text-[11px] font-medium text-gray-600',
      };
      elements.push(
        <div key={`h-${i}`} className={cn(headerClasses[level as keyof typeof headerClasses], 'mt-1')}>
          {processInlineFormatting(text)}
        </div>
      );
      continue;
    }

    // Checkbox: - [ ] or - [x]
    const checkboxMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (checkboxMatch) {
      const checked = checkboxMatch[1].toLowerCase() === 'x';
      const text = checkboxMatch[2];
      elements.push(
        <div key={`cb-${i}`} className="flex items-start gap-1.5 text-xs text-gray-600">
          <span className={cn('flex-shrink-0', checked ? 'text-green-500' : 'text-gray-400')}>
            {checked ? '☑' : '☐'}
          </span>
          <span className={checked ? 'line-through text-gray-400' : ''}>
            {processInlineFormatting(text)}
          </span>
        </div>
      );
      continue;
    }

    // Bullet: - item or * item
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-1.5 text-xs text-gray-600">
          <span className="text-gray-400 flex-shrink-0">•</span>
          <span>{processInlineFormatting(bulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <div key={`p-${i}`} className="text-xs text-gray-600">
        {processInlineFormatting(line)}
      </div>
    );
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <pre
        key="code-unclosed"
        className="text-[10px] font-mono bg-gray-100 rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap"
      >
        <code>{codeBlockContent.join('\n')}</code>
      </pre>
    );
  }

  // Apply max lines if specified
  const displayElements = maxLines ? elements.slice(0, maxLines * 2) : elements;
  const isTruncated = maxLines && elements.length > maxLines * 2;

  return (
    <div className={cn('space-y-0.5', className)}>
      {displayElements}
      {isTruncated && (
        <div className="text-[10px] text-gray-400 italic">...more</div>
      )}
    </div>
  );
}
