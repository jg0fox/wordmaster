'use client';

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

export function RichTextDisplay({ content, className = '' }: RichTextDisplayProps) {
  // If content doesn't contain HTML tags, wrap in paragraph
  const htmlContent = content.includes('<') ? content : `<p>${content}</p>`;

  return (
    <>
      <div
        className={`rich-text-display ${className}`}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      <style jsx global>{`
        .rich-text-display {
          font-family: var(--font-jetbrains-mono), monospace;
          line-height: 1.6;
          color: #FAFAF5;
        }
        .rich-text-display p {
          margin: 0.5em 0;
        }
        .rich-text-display p:first-child {
          margin-top: 0;
        }
        .rich-text-display p:last-child {
          margin-bottom: 0;
        }
        .rich-text-display strong {
          font-weight: 600;
        }
        .rich-text-display em {
          font-style: italic;
        }
        .rich-text-display u {
          text-decoration: underline;
        }
        .rich-text-display s {
          text-decoration: line-through;
        }
        .rich-text-display ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .rich-text-display ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .rich-text-display li {
          margin: 0.25em 0;
        }
        .rich-text-display blockquote {
          border-left: 2px solid rgba(255, 229, 0, 0.5);
          padding-left: 0.75em;
          font-style: italic;
          margin: 0.5em 0;
        }
        .rich-text-display code {
          background: rgba(250, 250, 245, 0.1);
          padding: 0.125em 0.25em;
          border-radius: 0.25em;
          font-family: var(--font-jetbrains-mono), monospace;
          font-size: 0.875em;
        }
        .rich-text-display pre {
          background: #0A0A0F;
          padding: 0.75em;
          border-radius: 0.5em;
          overflow-x: auto;
          margin: 0.5em 0;
        }
        .rich-text-display pre code {
          background: none;
          padding: 0;
        }
      `}</style>
    </>
  );
}
