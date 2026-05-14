import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Pre-process content to fix common LaTeX issues in history data
  const processedContent = React.useMemo(() => {
    if (!content) return '';
    
    let text = content;
    
    // 1. Fix over-escaped backslashes (often seen in history data)
    // If we see \\frac, change to \frac
    text = text.replace(/\\\\/g, '\\');
    
    // 2. Wrap potential chemistry/math blocks that missing delimiters
    // Pattern for common LaTeX commands: \text, \frac, \begin, \alpha, \beta, etc.
    // If they are not already inside $ or $$, we should wrap them.
    // This is a bit risky but helps with 'history' tests that were generated before standardizing delimiters.
    const latexPatterns = [
      /\\text\{[^{}]+\}/g,
      /\\frac\{[^{}]+\}\{[^{}]+\}/g,
      /\\ce\{[^{}]+\}/g, // Chemistry notation
      /\\mathrm\{[^{}]+\}/g,
      /\^[0-9+-]+/g,    // Superscripts
      /_[0-9]+/g        // Subscripts
    ];
    
    // For now, let's just ensure standard board-exam symbols like →, ∆, etc. are handled
    // or if the AI used plain text for chemistry formulas like H2SO4, 
    // we don't want to over-complicate, so we focus on fixing the LaTeX.
    
    return text;
  }, [content]);

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({node, ...props}) => <div className="mb-2" {...props} />,
          code: ({node, ...props}) => <code className="bg-slate-100 px-1 rounded text-pink-600" {...props} />
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
