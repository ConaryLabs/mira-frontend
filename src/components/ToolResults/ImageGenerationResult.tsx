// src/components/ToolResults/ImageGenerationResult.tsx
import React, { useState } from 'react';
import { Image, Download, Expand, X } from 'lucide-react';

interface ImageGenerationResultProps {
  prompt: string;
  imageUrl: string;
  size?: string;
  style?: string;
  isDark?: boolean;
}

export const ImageGenerationResult: React.FC<ImageGenerationResultProps> = ({ 
  prompt, 
  imageUrl,
  size = '1024x1024',
  style = 'vivid',
  isDark = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  return (
    <>
      <div className="my-3 p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-pink-700 dark:text-pink-300">
            <Image className="w-4 h-4" />
            Generated Image
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {size} • {style}
            </span>
          </div>
        </div>
        
        <div className="mb-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Prompt:</div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 italic">
            "{prompt}"
          </p>
        </div>

        {imageError ? (
          <div className="p-8 bg-gray-100 dark:bg-gray-800 rounded flex flex-col items-center justify-center">
            <Image className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Failed to load image</p>
          </div>
        ) : (
          <div className="relative group">
            <img 
              src={imageUrl}
              alt={prompt}
              className="w-full rounded cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => setIsExpanded(true)}
              onError={() => setImageError(true)}
            />
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsExpanded(true)}
                className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Expand image"
              >
                <Expand className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Download image"
              >
                <Download className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Image Modal */}
      {isExpanded && !imageError && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img 
              src={imageUrl}
              alt={prompt}
              className="max-w-full max-h-full object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="absolute bottom-4 right-4 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
