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

    try {
      switch (message.type) {
        case 'response':
          console.log('Complete response received:', message.data);
          console.log('Full response object:', JSON.stringify(message, null, 2));
          
          const responseData = message.data;
          
          // Check if this is a memory command response with actual data
          if (responseData && (responseData.memories || responseData.stats || responseData.session_id)) {
            console.log('Memory command returned data in response format:', responseData);
            // Pass it to the memory handler
            if (responseData.memories || responseData.stats) {
              // This is memory data, handle it differently
              return; // Let the persistence handler deal with it
            }
          }
          
          // Handle the case where backend returns just { status: "success" }
          if (responseData && responseData.status === 'success' && !responseData.content) {
            console.log('Backend returned success status without content - probably memory command response');
            setIsWaitingForResponse(false);
            return;
          }
          
          // Handle normal chat responses
          if (responseData && responseData.content) {
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
            
            // TODO: Consider reloading history here to ensure persistence
            // This would ensure the conversation is properly saved and reloaded
          } else {
            console.warn('Response data missing content:', responseData);
          }
          
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
            
            if (message.message.includes('Connected to Mira')) {
              console.log('Connection status filtered out');
              return;
            }
          }
          break;
          
        case 'data':
          // This should contain memory results
          console.log('Data message received:', message.data);
          break;
          
        case 'error':
          console.error('Backend error:', message.error || message.message || 'Unknown error');
          setIsWaitingForResponse(false);
          break;
          
        default:
          console.log('Unhandled message type:', message.type);
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error, message);
      setIsWaitingForResponse(false);
    }
  }, [setMessages, setIsWaitingForResponse]);

  return { handleIncomingMessage };
};
