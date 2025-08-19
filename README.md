# Mira Frontend

A modern React + TypeScript frontend for the Mira AI Assistant, featuring real-time WebSocket communication, GPT-5 tool integration, and project management capabilities.

## Features

- 🤖 **AI Chat Interface** - Real-time streaming responses with mood indicators
- 🔧 **GPT-5 Tool Support** - Web search, code interpreter, file search, and image generation
- 📁 **Project Management** - Create and manage projects with Git integration
- 🎨 **Dark/Light Mode** - Automatic theme switching
- 📝 **Artifact System** - Create and manage code artifacts
- 🔄 **WebSocket Communication** - Real-time bidirectional messaging
- 📊 **Tool Result Display** - Rich UI components for various tool outputs

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **WebSocket**: Custom hook implementation
- **State Management**: React hooks

## Prerequisites

- Node.js 18+ and npm
- Mira backend running on `http://localhost:8080`

## Installation

```bash
# Clone the repository
git clone https://github.com/ConaryLabs/mira-frontend.git
cd mira-frontend

# Install dependencies
npm install

# Create environment file (if needed)
cp .env.example .env
```

## Development

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:3000
```

## Build

```bash
# Type check and build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/           # React components
│   ├── ChatContainer.tsx # Main chat interface
│   ├── MessageBubble.tsx # Message display
│   ├── ProjectSidebar.tsx # Project management
│   └── ToolResults/     # Tool result components
│       ├── WebSearchResult.tsx
│       ├── CodeInterpreterResult.tsx
│       ├── FileSearchResult.tsx
│       └── ImageGenerationResult.tsx
├── hooks/               # Custom React hooks
│   ├── useWebSocket.ts  # WebSocket connection
│   └── useTheme.ts      # Theme management
├── services/            # API services
│   ├── fileApi.ts       # File operations
│   ├── gitApi.ts        # Git operations
│   └── projectApi.ts    # Project management
├── types/               # TypeScript definitions
│   ├── messages.ts      # Message types
│   └── websocket.ts     # WebSocket types
└── utils/               # Utility functions
```

## Key Components

### ChatContainer
Main application container managing:
- WebSocket connection
- Message history
- Project selection
- Tool result handling

### MessageBubble
Displays individual messages with:
- Tool results integration
- Citation support
- Mood indicators
- Streaming animation

### Tool Results
Specialized components for displaying:
- Web search results with snippets
- Code execution with syntax highlighting
- File search with relevance scores
- Generated images with download options

## WebSocket Protocol

The app communicates with the backend using WebSocket messages:

### Client → Server
```typescript
{
  type: 'chat',
  content: string,
  project_id?: string,
  metadata?: {
    file_path?: string,
    attachment_id?: string,
    language?: string
  }
}
```

### Server → Client
- `chunk` - Streaming response content
- `complete` - Finalize message with metadata
- `status` - Status updates during processing
- `tool_result` - Tool execution results
- `citation` - Source citations
- `done` - End of response

## Configuration

### API Endpoints
Configure in `src/services/config.ts`:
```typescript
export const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8080/api';
```

### WebSocket URL
Automatically configured based on location:
- Development: `ws://localhost:8080/ws/chat`
- Production: Uses current host with WSS

## GPT-5 Tools

The frontend supports displaying results from:

- **Web Search** - Search results with titles, URLs, and snippets
- **Code Interpreter** - Code execution with output and generated files
- **File Search** - Document search with relevance scoring
- **Image Generation** - AI-generated images with download support

## Troubleshooting

### WebSocket Connection Issues
- Ensure backend is running on port 8080
- Check CORS settings if running on different ports
- Verify WebSocket upgrade headers

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Type Errors
```bash
# Run type checking
npm run type-check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

Proprietary - ConaryLabs

## Support

For issues and questions, please open an issue on GitHub or contact the development team.
