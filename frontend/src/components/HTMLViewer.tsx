import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useEffect, useState } from 'react';

interface HTMLViewerProps {
  html: string;
  className?: string;
}

export const HTMLViewer: React.FC<HTMLViewerProps> = ({ html, className = '' }) => {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Ensure component is mounted and detect theme
  useEffect(() => {
    setMounted(true);
    // Check if dark mode is active
    const isDarkMode = document.documentElement.classList.contains('dark') ||
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(isDarkMode);

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      setIsDark(dark);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-muted-foreground text-sm">Loading code...</p>
      </div>
    );
  }

  const formattedHtml = html.replace(/>\s+</g, '><').replace(/></g, '>\n<');
  const style = isDark ? vscDarkPlus : oneLight;

  return (
    <div className={`h-full w-full ${className}`}>
      <SyntaxHighlighter
        language="html"
        style={style}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.75rem',
          lineHeight: '1.5',
          height: '100%',
          overflow: 'auto',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'monospace',
          },
        }}
        showLineNumbers={false}
        wrapLines={true}
        wrapLongLines={true}
      >
        {formattedHtml}
      </SyntaxHighlighter>
    </div>
  );
};
