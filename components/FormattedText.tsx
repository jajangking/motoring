'use client';

import { memo } from 'react';

interface FormattedTextProps {
  text: string;
}

const FormattedText = ({ text }: FormattedTextProps) => {
  // Split text by newlines to handle paragraphs
  const paragraphs = text.split(/\n\s*\n/);

  // Process each paragraph
  return (
    <>
      {paragraphs.map((paragraph, pIndex) => {
        // Process markdown within each paragraph
        const lines = paragraph.split('\n');

        return (
          <div key={pIndex} className="mb-2">
            {lines.map((line, lIndex) => {
              // Handle list items
              if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                return (
                  <div key={`${pIndex}-${lIndex}`} className="flex items-start mb-1">
                    <span className="mr-2">•</span>
                    <span>{processInlineMarkdown(line.substring(2))}</span>
                  </div>
                );
              }
              // Handle numbered lists
              else if (/^\d+\.\s/.test(line.trim())) {
                return (
                  <div key={`${pIndex}-${lIndex}`} className="flex items-start mb-1">
                    <span className="mr-2">{line.match(/^\d+\./)?.[0]}</span>
                    <span>{processInlineMarkdown(line.substring(line.match(/^\d+\.\s/)?.[0].length || 0))}</span>
                  </div>
                );
              }
              // Handle regular paragraph lines
              else {
                return (
                  <div key={`${pIndex}-${lIndex}`} className="mb-1">
                    {processInlineMarkdown(line)}
                  </div>
                );
              }
            })}
          </div>
        );
      })}
    </>
  );
};

// Helper function to process inline markdown
const processInlineMarkdown = (text: string) => {
  // Split text by markdown patterns
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|~[^~]+~|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, index) => {
        // Bold: **text** or __text__
        if (/^\*\*.*\*\*$/.test(part) || /^__.*__$/.test(part)) {
          return (
            <strong key={index} className="font-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        // Italic: *text* or _text_
        if (/^\*.*\*$/.test(part) || /^_.*_$/.test(part)) {
          return (
            <em key={index} className="italic">
              {part.slice(1, -1)}
            </em>
          );
        }
        // Strikethrough: ~text~
        if (/^~.*~$/.test(part)) {
          return (
            <span key={index} className="line-through">
              {part.slice(1, -1)}
            </span>
          );
        }
        // Code: `text`
        if (/^`.*`$/.test(part)) {
          return (
            <code key={index} className="bg-redbull-darker px-1 rounded text-redbull-red font-mono">
              {part.slice(1, -1)}
            </code>
          );
        }
        // If it's a plain text part
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

export default memo(FormattedText);