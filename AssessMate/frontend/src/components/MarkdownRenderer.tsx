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
  const processedContent = React.useMemo(() => {
    if (!content) return '';
    
    let text = content;

    // 1. Safely fix over-escaped LaTeX backslashes (e.g. \\Delta -> \Delta, \\frac -> \frac)
    text = text.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

    // 2. Fix unclosed inline '$' delimiters in a single paragraph so math mode doesn't swallow prose
    const lines = text.split('\n');
    const processedLines = lines.map(line => {
      let l = line;
      // Count non-escaped inline $ (excluding $$ block math)
      const count = (l.replace(/\$\$/g, '').match(/(?<!\$)\$(?!\$)/g) || []).length;
      if (count % 2 !== 0) {
        // Close trailing unclosed dollar at end of line
        l += ' $';
      }
      return l;
    });
    text = processedLines.join('\n');

    // 3. Prevent plain prose/sentences from getting trapped inside $...$
    // If $...$ contains sentence ending (. ! ?) followed by capitalized prose, close math block before sentence
    text = text.replace(/\$([^\$\n]+)\$/g, (match, mathContent) => {
      // Check if mathContent has sentence punctuation followed by plain English prose
      const sentenceMatch = mathContent.match(/^([\s\S]*?)([\.\!\?]\s+[A-Z][\s\S]*)$/);
      if (sentenceMatch) {
        const mathPart = sentenceMatch[1].trim();
        const prosePart = sentenceMatch[2].trim();
        return `$${mathPart}$ ${prosePart}`;
      }
      return match;
    });

    // 4. Wrap standalone LaTeX symbols (like \Delta G^0, \Lambda_m, E_{cell}, E^0, \frac{a}{b}) if not already wrapped in $
    text = text.replace(/(?<!\$)([\\][a-zA-Z]+(?:_{[^{}\s]+}|\^{[{}\S]+})?|[A-Z]_(?:cell|m|s|eq|f|g|r|net|[0-9]+)|[A-Z]\^{0|[0-9\+-]+})(?!\$)/g, (match) => {
      if (match.startsWith('\\') || match.includes('_') || match.includes('^')) {
        return `$${match}$`;
      }
      return match;
    });

    return text;
  }, [content]);

  return (
    <div className={`prose prose-sm max-w-none break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({node, ...props}) => <div className="mb-2 leading-relaxed" {...props} />,
          code: ({node, ...props}) => <code className="bg-slate-100 px-1 py-0.5 rounded text-pink-600 text-sm font-mono" {...props} />
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
