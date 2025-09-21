// src/hooks/useMessageHandler.ts
import { useCallback } from 'react';
import type { Message } from '../types';

export const useMessageHandler = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsWaitingForResponse: React.Dispatch<React.SetStateAction<boolean>>
) => {
  
  const handleIncomingMessage = useCallback((message: any) => {
    if (!message || typeof message !== 'object') {
      console.warn('Received invalid message:', message);
      return;
    }

    console.log('Incoming message:', message.type, message);

    switch (message.type) {
      case 'response':
        console.log('Complete response received:', message.data);
        
        const responseData = message.data;
        
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: responseData.content,
          streaming: false,
          timestamp: Date.now(),
          metadata: {
            salience: responseData.analysis?.salience,
            topics: responseData.analysis?.topics,
            mood: responseData.analysis?.mood,
            contains_code: responseData.analysis?.contains_code,
            programming_lang: responseData.analysis?.programming_lang,
            routed_to_heads: responseData.analysis?.routed_to_heads,
            response_id: responseData.metadata?.response_id,
            total_tokens: responseData.metadata?.total_tokens,
            latency_ms: responseData.metadata?.latency_ms
          }
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setIsWaitingForResponse(false);
        break;
        
      case 'connection_ready':
        console.log('Backend ready:', message);
        break;
        
      case 'status':
        console.log('Status:', message.message);
        
        if (message.message && typeof message.message === 'string') {
          try {
            const parsed = JSON.parse(message.message);
            if (parsed.type === 'heartbeat') {
              console.log('Heartbeat filtered out');
              return;
            }
          } catch {
            // Not JSON, treat as regular status
          }
          
          if (message.message.includes('Connected to Mira') || 
              message.message.includes('Model:') ||
              message.message.includes('Tools:')) {
            console.log('Connection status filtered out');
            return;
          }
          
          setMessages(prev => [...prev, {
            id: `status-${Date.now()}`,
            role: 'system',
            content: message.message,
            timestamp: Date.now()
          }]);
        }
        break;
        
      case 'data':
        console.log('Data response:', message);
        break;
        
      case 'error':
        console.error('Backend error:', message);
        
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${message.message || 'Unknown error occurred'}`,
          timestamp: Date.now(),
          error: true
        }]);
        
        setIsWaitingForResponse(false);
        break;
        
      default:
        console.warn('Unknown message type:', message.type, message);
        break;
    }
  }, [setMessages, setIsWaitingForResponse]);

  return { handleIncomingMessage };
};
