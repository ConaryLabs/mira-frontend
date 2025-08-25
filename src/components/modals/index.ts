// src/components/modals/index.ts
// Export all modal components for easy importing

export { FileSearchModal } from './FileSearchModal';
export { ImageGenerationModal } from './ImageGenerationModal';

export { FileSearchModal } from './FileSearchModal';
export { ImageGenerationModal } from './ImageGenerationModal';

// Re-export types for convenience
export type { 
  FileSearchModalProps, 
  FileSearchFilters 
} from './FileSearchModal';

export type { 
  ImageGenerationModalProps, 
  ImageGenerationOptions 
} from './ImageGenerationModal';

// Add interface exports for TypeScript
interface FileSearchModalProps {
  onSubmit: (query: string, filters?: FileSearchFilters) => void;
  onClose: () => void;
  isDark: boolean;
}

interface FileSearchFilters {
  file_extensions?: string[];
  date_range?: {
    start?: string;
    end?: string;
  };
  max_results?: number;
  include_content?: boolean;
}

interface ImageGenerationModalProps {
  onSubmit: (prompt: string, options?: ImageGenerationOptions) => void;
  onClose: () => void;
  isDark: boolean;
}

interface ImageGenerationOptions {
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  style?: 'vivid' | 'natural';
  quality?: 'standard' | 'hd';
  n?: number;
}
