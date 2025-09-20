#!/bin/bash

# cleanup.sh - Remove old/unused files from frontend refactor

echo "🧹 Cleaning up old frontend files..."

# Remove old components that we're replacing
rm -f src/components/ProjectSidebar.tsx
rm -f src/components/AsideOverlay.tsx
rm -f src/components/MoodBackground.tsx

# Remove old hooks that we're replacing with Zustand
rm -f src/hooks/useChatState.ts
rm -f src/hooks/useFileContext.ts
rm -f src/hooks/useTheme.ts
rm -f src/hooks/useToolHandlers.ts

# Remove old services (we have BackendCommands now)
rm -rf src/services/fileApi.ts
rm -rf src/services/gitApi.ts
rm -rf src/services/projectApi.ts
rm -rf src/services/config.ts

# Remove old types that we're consolidating
rm -f src/types/messages.ts
rm -f src/types/websocket.ts

# Remove old ToolResults directory (we'll rebuild this)
rm -rf src/components/ToolResults/

# Remove any utilities we're not using
rm -rf src/utils/

# Create new directories if they don't exist
mkdir -p src/components/ToolResults
mkdir -p src/utils

echo "✅ Cleanup complete!"
echo ""
echo "📝 Files you need to create:"
echo "  - All the artifacts I provided"
echo "  - Update package.json dependencies"
echo "  - Create .env file"
echo ""
echo "🚀 After cleanup, run:"
echo "  npm install zustand @monaco-editor/react"
echo "  npm run dev"
