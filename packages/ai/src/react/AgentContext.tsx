import React, { createContext, useContext, ReactNode } from 'react';
import { AgentClient } from '../client';

interface AgentContextType {
    client: AgentClient | null;
}

const AgentContext = createContext<AgentContextType>({ client: null });

interface AgentProviderProps {
    /** The API Key (Session Key) obtained from your backend or the Agent Protocol dashboard. */
    apiKey: string;
    /** The base URL of the Agent Protocol API. Defaults to the public API if not specified. */
    baseUrl?: string;
    children: ReactNode;
}

export const AgentProvider: React.FC<AgentProviderProps> = ({ apiKey, baseUrl, children }) => {
    // Memoize client to prevent recreation on every render
    const client = React.useMemo(() => new AgentClient(apiKey, baseUrl), [apiKey, baseUrl]);

    return (
        <AgentContext.Provider value={{ client }}>
            {children}
        </AgentContext.Provider>
    );
};

export const useAgentClient = () => {
    const context = useContext(AgentContext);
    if (!context.client) {
        throw new Error("useAgentClient must be used within an AgentProvider");
    }
    return context.client;
};
