// src/components/documents/DocumentSearch.tsx
import { useState, useEffect, useCallback } from 'react';
import { useWebSocketStore } from '../../stores/useWebSocketStore';
import { Search, FileText, Sparkles } from 'lucide-react';
import type { DocumentSearchResult } from '../../types';

interface DocumentSearchProps {
  projectId: string;
}

export function DocumentSearch({ projectId }: DocumentSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DocumentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { send, subscribe } = useWebSocketStore();

  useEffect(() => {
    const unsubscribe = subscribe('doc-search', (message) => {
      if (message.type === 'data' && message.data?.type === 'document_search_results') {
        setResults(message.data.results || []);
        setSearching(false);
        setHasSearched(true);
      }
      
      // Handle search errors
      if (message.type === 'error' && searching) {
        console.error('Search error:', message.message);
        setSearching(false);
        setHasSearched(true);
      }
    });
    
    return unsubscribe;
  }, [subscribe, searching]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setSearching(true);
    setHasSearched(false);
    
    try {
      await send({
        type: 'document_command',
        method: 'documents.search',
        params: {
          project_id: projectId,
          query: query.trim(),
          limit: 10,
        },
      });
    } catch (error) {
      console.error('Search failed:', error);
      setSearching(false);
      setHasSearched(true);
    }
  }, [projectId, query, send]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !searching && query.trim()) {
      handleSearch();
    }
  }, [handleSearch, searching, query]);

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-blue-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.8) return 'Excellent match';
    if (score >= 0.6) return 'Good match';
    if (score >= 0.4) return 'Fair match';
    return 'Weak match';
  };

  const highlightQuery = (content: string, query: string): React.ReactNode => {
    // Simple highlighting - split by query terms
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    if (terms.length === 0) {
      return content;
    }

    // Find all matches
    const parts: { text: string; highlight: boolean }[] = [];
    let lastIndex = 0;
    const lowerContent = content.toLowerCase();

    for (const term of terms) {
      let index = lowerContent.indexOf(term, lastIndex);
      while (index !== -1) {
        // Add non-matching part
        if (index > lastIndex) {
          parts.push({ text: content.slice(lastIndex, index), highlight: false });
        }
        // Add matching part
        parts.push({ text: content.slice(index, index + term.length), highlight: true });
        lastIndex = index + term.length;
        index = lowerContent.indexOf(term, lastIndex);
      }
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({ text: content.slice(lastIndex), highlight: false });
    }

    return (
      <>
        {parts.map((part, i) => 
          part.highlight ? (
            <mark key={i} className="bg-yellow-200 text-gray-900 px-0.5 rounded">
              {part.text}
            </mark>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search across all documents..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={searching}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {searching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Searching...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Search
            </>
          )}
        </button>
      </div>

      {/* Search Info */}
      {hasSearched && !searching && (
        <div className="text-sm text-gray-400">
          Found {results.length} {results.length === 1 ? 'result' : 'results'} 
          {results.length > 0 && ' (semantic search)'}
        </div>
      )}

      {/* Results */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {/* Empty state - no search yet */}
        {!hasSearched && !searching && (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Semantic search across your documents</p>
            <p className="text-gray-500 text-xs mt-1">
              Try searching for concepts, not just keywords
            </p>
          </div>
        )}

        {/* Empty state - no results found */}
        {hasSearched && !searching && results.length === 0 && query && (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No results found for "{query}"</p>
            <p className="text-gray-500 text-xs mt-1">
              Try different keywords or upload more documents
            </p>
          </div>
        )}

        {/* Loading state */}
        {searching && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Results list */}
        {results.map((result, i) => (
          <div 
            key={`${result.document_id}-${result.chunk_index}-${i}`}
            className="p-4 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors bg-gray-850"
          >
            {/* Result header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="font-medium text-sm text-blue-400 truncate" title={result.file_name}>
                  {result.file_name}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-gray-500 ml-4">
                <span className={`font-medium ${getScoreColor(result.score)}`}>
                  {(result.score * 100).toFixed(0)}%
                </span>
                <span className="text-gray-600">•</span>
                <span>Chunk {result.chunk_index + 1}</span>
              </div>
            </div>

            {/* Score indicator */}
            <div className="mb-3">
              <div className="flex items-center gap-2 text-xs">
                <div className="flex-1 bg-gray-700 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all ${
                      result.score >= 0.8 ? 'bg-green-500' :
                      result.score >= 0.6 ? 'bg-blue-500' :
                      result.score >= 0.4 ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}
                    style={{ width: `${result.score * 100}%` }}
                  />
                </div>
                <span className={`${getScoreColor(result.score)} font-medium`}>
                  {getScoreLabel(result.score)}
                </span>
              </div>
            </div>

            {/* Content preview with highlighting */}
            <div className="text-sm text-gray-300 leading-relaxed">
              {highlightQuery(result.content, query)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
