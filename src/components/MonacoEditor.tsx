// src/components/MonacoEditor.tsx
import React from 'react';
import Editor from '@monaco-editor/react';

interface MonacoEditorProps {
  value: string;
  language: string;
  onChange?: (value: string | undefined) => void;
  options?: any;
  height?: string;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  language,
  onChange,
  options = {},
  height = '100%'
}) => {
  const defaultOptions = {
    minimap: { enabled: false },
    lineNumbers: 'on',
    fontSize: 14,
    fontFamily: 'JetBrains Mono, Consolas, "Courier New", monospace',
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    ...options
  };

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={onChange}
      options={defaultOptions}
      theme="vs-dark" // TODO: respect system theme
      loading={<div className="flex items-center justify-center h-full">Loading editor...</div>}
    />
  );
};
