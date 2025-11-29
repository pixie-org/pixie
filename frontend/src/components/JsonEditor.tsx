import React, { useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string | null;
  minHeight?: string;
  maxHeight?: string;
  id?: string;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Enter JSON...',
  error,
  minHeight = '300px',
  maxHeight = '400px',
  id = 'json-editor',
}) => {
  // Inject CSS to remove background colors from Prism tokens
  useEffect(() => {
    const styleId = 'json-editor-prism-override';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .json-editor-wrapper .token,
        .json-editor-wrapper .token.punctuation,
        .json-editor-wrapper .token.operator,
        .json-editor-wrapper .token.property,
        .json-editor-wrapper .token.string,
        .json-editor-wrapper .token.number,
        .json-editor-wrapper .token.boolean,
        .json-editor-wrapper .token.null,
        .json-editor-wrapper .token.keyword {
          background: transparent !important;
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      const styleElement = document.getElementById(styleId);
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
      )}
      <div className="rounded-lg border bg-muted/50 overflow-auto w-full" style={{ minHeight, maxHeight }}>
        <div className="json-editor-wrapper">
          <Editor
            value={value}
            onValueChange={onChange}
            highlight={(code) => highlight(code, languages.json, 'json')}
            padding={12}
            style={{
              fontFamily: '"Fira Code", "Fira Mono", "Consolas", "Monaco", monospace',
              fontSize: '0.75rem',
              minHeight,
              outline: 'none',
              width: '100%',
            }}
            textareaClassName="outline-none resize-none"
            placeholder={placeholder}
          />
        </div>
      </div>
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

