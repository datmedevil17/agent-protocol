import { useState, useCallback } from 'react';
import { useAgentClient } from './AgentContext';
import { Message } from '../client';
import { ALL_TOOLS } from '@agent-protocol/core';

interface UseAgentOptions {
    tools?: any[];
    handlers?: Record<string, (args: any) => Promise<any>>;
}

/**
 * React hook to interact with the Agent Protocol.
 * Manages chat state, loading state, and tool execution.
 * 
 * @param options Configuration options for the agent.
 * @returns Object containing `messages`, `sendMessage` function, `isLoading` flag, and `error` object.
 */
export const useAgent = (options: UseAgentOptions = {}) => {
    const client = useAgentClient();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Default to ALL_TOOLS if not provided
    const tools = options.tools || ALL_TOOLS;

    const sendMessage = useCallback(async (content: string) => {
        setIsLoading(true);
        setError(null);

        const newMessages: Message[] = [...messages, { role: 'user', content }];
        setMessages(newMessages);

        try {
            let currentMessages = newMessages;
            let response = await client.chat({
                messages: currentMessages,
                tools: tools
            });

            setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);

            // Handle Tool Calls
            if (response.toolCalls && response.toolCalls.length > 0) {
                for (const toolCall of response.toolCalls) {
                    console.log("Executing Tool:", toolCall.name);

                    const handler = options.handlers?.[toolCall.name];

                    if (!handler) {
                        setMessages(prev => [...prev, { role: 'assistant', content: `Error: No handler for tool ${toolCall.name}` }]);
                        continue;
                    }

                    // Display a temporary message that we are executing
                    setMessages(prev => [...prev, { role: 'assistant', content: `Executing ${toolCall.name}...` }]);

                    try {
                        const result = await handler(toolCall.args);

                        // Show result
                        setMessages(prev => [
                            ...prev.filter(m => m.content !== `Executing ${toolCall.name}...`),
                            { role: 'assistant', content: `Tool Result (${toolCall.name}): ${JSON.stringify(result)}` }
                        ]);

                        // Optional: Send result back to LLM for final summary (omitted for brevity in this step if not requested)
                    } catch (toolErr: any) {
                        setMessages(prev => [
                            ...prev.filter(m => m.content !== `Executing ${toolCall.name}...`),
                            { role: 'assistant', content: `Tool Error: ${toolErr.message}` }
                        ]);
                    }
                }
            }

            return response;

        } catch (err: any) {
            setError(err);
            console.error("Chat Error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [client, messages, tools, options]);

    return {
        messages,
        sendMessage,
        isLoading,
        error
    };
};
