import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Label } from '@/components/ui/label';

interface JsonViewerProps {
  data: unknown;
  label?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  label
}) => {
  const jsonString = React.useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return String(data);
    }
  }, [data]);

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <div className="rounded-lg border bg-muted/50 overflow-auto" style={{ maxHeight: '12rem' }}>
        <SyntaxHighlighter
          language="json"
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.75rem',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'monospace',
            }
          }}
          PreTag="div"
        >
          {jsonString}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

