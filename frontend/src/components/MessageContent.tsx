import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageContentProps {
  content: string;
  contentFormat?: 'markdown' | 'plain';
  className?: string;
}

export const MessageContent: React.FC<MessageContentProps> = ({
  content,
  contentFormat = 'markdown',
  className = ''
}) => {
  // Default to markdown if format is undefined or explicitly markdown
  const shouldRenderMarkdown = contentFormat === 'markdown' || contentFormat === undefined;

  if (shouldRenderMarkdown) {
    return (
      <div className={`markdown-content ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Code blocks (pre > code)
            pre: ({ children }) => {
              const codeElement = (children as any)?.props?.children || children;
              return (
                <pre className="bg-black/20 dark:bg-white/20 rounded-md p-3 my-2 overflow-x-auto">
                  {children}
                </pre>
              );
            },
            // Code (both inline and block)
            code: ({ node, className: codeClassName, children, ...props }: any) => {
              const inline = Boolean(props.inline);
              if (inline) {
                return (
                  <code className="bg-black/20 dark:bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono break-words" {...props}>
                    {children}
                  </code>
                );
              }
              // Block code (inside pre)
              return (
                <code className="block text-xs font-mono whitespace-pre break-all" {...props}>
                  {children}
                </code>
              );
            },
            // Lists
            ul: ({ children }) => (
              <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed">{children}</li>
            ),
            // Paragraphs
            p: ({ children }) => (
              <p className="my-1.5 last:my-0 leading-relaxed">{children}</p>
            ),
            // Headings
            h1: ({ children }) => (
              <h1 className="text-base font-bold mt-3 mb-2 first:mt-0">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-sm font-bold mt-3 mb-2 first:mt-0">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm font-semibold mt-2 mb-1.5 first:mt-0">{children}</h3>
            ),
            // Strong/Bold
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),
            // Emphasis/Italic
            em: ({ children }) => (
              <em className="italic">{children}</em>
            ),
            // Links
            a: ({ href, children }) => (
              <a href={href} className="underline hover:opacity-80" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // Fallback to plain text
  return <div className={className}>{content}</div>;
};

