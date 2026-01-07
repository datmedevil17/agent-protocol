export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface ChatRequest {
    messages: Message[];
    tools?: any[]; // JSON Schema for tools
}

export interface ChatResponse {
    content: string;
    toolCalls?: any[];
}

export class AgentClient {
    private baseUrl: string;

    constructor(private apiKey: string, baseUrl?: string) {
        this.baseUrl = baseUrl || "https://api.axiosiiitl.dev";
    }

    /**
     * Send a chat request to the Agent API.
     */
    async chat(request: ChatRequest): Promise<ChatResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/v1/chat`, { // Assumed endpoint
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.apiKey, // Authenticate via header
                    // Origin handling is done by the browser/client automatically
                },
                body: JSON.stringify({
                    messages: request.messages,
                    tools: request.tools
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Agent API Error (${response.status}): ${errorText}`);
            }

            const data = await response.json();

            // Assume standard response format, map to clean interface
            return {
                content: data.content || data.message?.content || "",
                toolCalls: data.toolCalls || data.function_calls || undefined
            };

        } catch (error) {
            console.error("Agent Client Error:", error);
            throw error;
        }
    }
}
