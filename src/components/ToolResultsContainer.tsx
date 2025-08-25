// src/components/ToolResultsContainer.tsx
// PHASE 2: Enhanced ToolResultsContainer with download functionality and improved formatting
// Key additions:
// 1. Enhanced image generation results with download/view functionality
// 2. Improved file search results display
// 3. Better error handling and status display
// 4. Support for new tool result data formats

import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Code, 
  File, 
  Image, 
  ExternalLink, 
  Download,
  Eye,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import clsx from 'clsx';
import type { ToolResult, Citation } from '../types/messages';

interface ToolResultsContainerProps {
  toolResults: ToolResult[];
  citations: Citation[];
  isDark: boolean;
}

export function ToolResultsContainer({ toolResults, citations, isDark }: ToolResultsContainerProps) {
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [showAllCitations, setShowAllCitations] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const toggleResult = (index: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  const getToolIcon = (type: string) => {
    switch (type) {
      case 'web_search':
        return <Search className="w-4 h-4" />;
      case 'code_interpreter':
        return <Code className="w-4 h-4" />;
      case 'file_search':
        return <File className="w-4 h-4" />;
      case 'image_generation':
        return <Image className="w-4 h-4" />;
      default:
        return <Code className="w-4 h-4" />;
    }
  };

  const getToolLabel = (type: string) => {
    switch (type) {
      case 'web_search':
        return 'Web Search';
      case 'code_interpreter':
        return 'Code Interpreter';
      case 'file_search':
        return 'File Search';
      case 'image_generation':
        return 'Image Generation';
      default:
        return 'Tool Result';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const downloadImage = (url: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderFileSearchResult = (data: any) => {
    if (!data) return null;

    const results = data.results || data.files || [];
    const query = data.query || '';

    return (
      <div className="space-y-3">
        {query && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Query:</strong> "{query}"
          </div>
        )}
        
        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((result: any, idx: number) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-sm">{result.filename || result.name || `File ${idx + 1}`}</span>
                      {result.file_extension && (
                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                          {result.file_extension}
                        </span>
                      )}
                    </div>
                    
                    {result.snippet && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-3">
                        {result.snippet}
                      </p>
                    )}
                    
                    {result.matches && result.matches.length > 0 && (
                      <div className="space-y-1">
                        {result.matches.slice(0, 3).map((match: any, matchIdx: number) => (
                          <div key={matchIdx} className="text-xs bg-gray-100 dark:bg-gray-800 rounded p-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-gray-500">Line {match.line_number}</span>
                              {match.confidence && (
                                <span className="text-green-600">{Math.round(match.confidence * 100)}%</span>
                              )}
                            </div>
                            <code className="text-gray-700 dark:text-gray-300">{match.content}</code>
                          </div>
                        ))}
                        {result.matches.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{result.matches.length - 3} more matches
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                      title="Open file"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            No files found matching the search criteria
          </div>
        )}
      </div>
    );
  };

  const renderImageGenerationResult = (data: any) => {
    if (!data) return null;

    const images = data.images || [];
    const prompt = data.prompt || data.original_prompt || '';
    const revisedPrompt = data.revised_prompt;

    return (
      <div className="space-y-3">
        {prompt && (
          <div className="text-sm">
            <div className="text-gray-600 dark:text-gray-400 mb-1">
              <strong>Prompt:</strong>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-gray-700 dark:text-gray-300">
              "{prompt}"
            </div>
            {revisedPrompt && revisedPrompt !== prompt && (
              <div className="mt-2">
                <div className="text-gray-600 dark:text-gray-400 mb-1">
                  <strong>Revised prompt:</strong>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 text-blue-700 dark:text-blue-300 text-sm">
                  "{revisedPrompt}"
                </div>
              </div>
            )}
          </div>
        )}

        {images.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {images.map((image: any, idx: number) => {
              const imageUrl = typeof image === 'string' ? image : image.url;
              const description = typeof image === 'object' ? image.description : '';
              
              return (
                <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden group">
                  <div className="relative">
                    <img 
                      src={imageUrl} 
                      alt={description || `Generated image ${idx + 1}`}
                      className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setFullScreenImage(imageUrl)}
                      loading="lazy"
                    />
                    
                    {/* Image overlay controls */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setFullScreenImage(imageUrl)}
                        className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                        title="View full size"
                      >
                        <Eye className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => downloadImage(imageUrl, `generated-image-${idx + 1}.png`)}
                        className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                        title="Download image"
                      >
                        <Download className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                  
                  {description && (
                    <div className="p-2">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : data.image_url ? (
          // Handle legacy single image format
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden group">
            <div className="relative">
              <img 
                src={data.image_url} 
                alt="Generated image"
                className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setFullScreenImage(data.image_url)}
                loading="lazy"
              />
              
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setFullScreenImage(data.image_url)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title="View full size"
                >
                  <Eye className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => downloadImage(data.image_url, 'generated-image.png')}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title="Download image"
                >
                  <Download className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-red-500">
            No image data available
          </div>
        )}
      </div>
    );
  };

  const renderWebSearchResult = (data: any) => {
    if (!data) return null;

    return (
      <div className="space-y-2">
        {data.results?.map((result: any, idx: number) => (
          <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <a 
              href={result.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium block mb-1"
            >
              {result.title}
            </a>
            {result.snippet && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                {result.snippet}
              </p>
            )}
            {result.url && (
              <p className="text-xs text-green-600 dark:text-green-400">
                {result.url}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderCodeInterpreterResult = (data: any) => {
    if (!data) return null;

    return (
      <div className="space-y-3">
        {data.code && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Code:</h4>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
              <code>{data.code}</code>
            </pre>
          </div>
        )}
        
        {data.output && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Output:</h4>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
              <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{data.output}</pre>
            </div>
          </div>
        )}

        {data.result && data.result !== data.output && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Result:</h4>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded text-sm">
              <pre className="whitespace-pre-wrap text-green-700 dark:text-green-300">{data.result}</pre>
            </div>
          </div>
        )}

        {data.files && data.files.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Generated Files:</h4>
            <div className="space-y-1">
              {data.files.map((file: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>{file.name || `File ${idx + 1}`}</span>
                  {file.url && (
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderToolData = (data: any, type: string, status?: string, error?: string) => {
    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Tool Error</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          No data available
        </div>
      );
    }

    switch (type) {
      case 'web_search':
        return renderWebSearchResult(data);
      case 'code_interpreter':
        return renderCodeInterpreterResult(data);
      case 'file_search':
        return renderFileSearchResult(data);
      case 'image_generation':
        return renderImageGenerationResult(data);
      default:
        return (
          <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        );
    }
  };

  if (toolResults.length === 0 && citations.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-3">
        {/* Tool Results */}
        {toolResults.length > 0 && (
          <div className="space-y-2">
            {toolResults.map((result, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleResult(index)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    {getToolIcon(result.type)}
                    <span className="font-medium text-sm">{result.tool_name || getToolLabel(result.type)}</span>
                    {getStatusIcon(result.status)}
                    {result.metadata?.execution_time_ms && (
                      <span className="text-xs text-gray-500">
                        ({result.metadata.execution_time_ms}ms)
                      </span>
                    )}
                  </div>
                  {expandedResults.has(index) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {expandedResults.has(index) && (
                  <div className="p-3 border-t border-gray-200 dark:border-gray-600">
                    {renderToolData(result.data, result.type, result.status, result.error)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Citations */}
        {citations.length > 0 && (
          <div className="border border-blue-200 dark:border-blue-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowAllCitations(!showAllCitations)}
              className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <ExternalLink className="w-4 h-4" />
                <span className="font-medium text-sm">
                  Sources ({citations.length})
                </span>
              </div>
              {showAllCitations ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {showAllCitations && (
              <div className="p-3 border-t border-blue-200 dark:border-blue-700">
                <div className="space-y-2">
                  {citations.map((citation, index) => (
                    <div key={index} className="flex items-start justify-between p-2 border border-gray-200 dark:border-gray-600 rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-sm">{citation.filename}</span>
                          {citation.confidence_score && (
                            <span className="text-xs text-green-600">
                              {Math.round(citation.confidence_score * 100)}%
                            </span>
                          )}
                        </div>
                        {citation.snippet && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                            {citation.snippet}
                          </p>
                        )}
                        {(citation.page_number || citation.line_number) && (
                          <div className="text-xs text-gray-500">
                            {citation.page_number && `Page ${citation.page_number}`}
                            {citation.page_number && citation.line_number && ' • '}
                            {citation.line_number && `Line ${citation.line_number}`}
                          </div>
                        )}
                      </div>
                      {citation.url && (
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                          title="Open source"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-screen image modal */}
      {fullScreenImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setFullScreenImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors z-10"
              title="Close"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <div className="relative">
              <img 
                src={fullScreenImage} 
                alt="Full size generated image"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              
              {/* Download button in full screen */}
              <button
                onClick={() => {
                  downloadImage(fullScreenImage, 'generated-image-fullsize.png');
                  setFullScreenImage(null);
                }}
                className="absolute bottom-4 right-4 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
                title="Download image"
              >
                <Download className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
          
          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={() => setFullScreenImage(null)}
          />
        </div>
      )}
    </>
  );
}
