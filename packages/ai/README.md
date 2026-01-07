# @agent-protocol/ai

**React SDK for the Agent Protocol.**

Build AI-powered blockchain applications with ease. This package provides React components and hooks to integrate Agent Protocol chat capabilities into your dApp.

## Installation

```bash
pnpm add @agent-protocol/ai @agent-protocol/core
# or
npm install @agent-protocol/ai @agent-protocol/core
```

## Usage

### 1. Wrap your app with `AgentProvider`

```tsx
import { AgentProvider } from "@agent-protocol/ai";

function App({ children }) {
    return (
        <AgentProvider apiKey="your_api_key">
            {children}
        </AgentProvider>
    );
}
```

### 2. use `ChatWidget`

The `ChatWidget` handles the UI and standard interactions. You just need to provide the **handlers** (actual implementations) for the tools.

```tsx
import { ChatWidget } from "@agent-protocol/ai";
import { ALL_TOOLS } from "@agent-protocol/core";

function MyPage(props) {
    // Define how to execute the tools (e.g., using Solana Wallet Adapter)
    const handlers = {
        transferSOL: async (args) => {
            console.log("Transferring", args.amount, "to", args.toAddress);
            // ... your wallet logic
            return "signature_abc123";
        }
    };

    return (
        <ChatWidget 
            title="My AI Agent"
            handlers={handlers} // Connects the AI intent to your code
        />
    );
}
```

### 3. Custom UI with `useAgent`

If you want to build your own UI instead of using the widget:

```tsx
import { useAgent } from "@agent-protocol/ai";

const { messages, sendMessage, isLoading } = useAgent({
    handlers: myHandlers
});
```
