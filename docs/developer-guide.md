# Agent Protocol Developer Guide 📘

Welcome to the **Agent Protocol** documentation. This guide will help you build AI-powered blockchain applications using our modular SDKs.

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [Getting an API Key](#getting-an-api-key)
3. [Architecture Overview](#architecture-overview)
4. [Package: @agent-protocol/core](#package-agent-protocolcore)
5. [Package: @agent-protocol/ai](#package-agent-protocolai)
6. [Tutorial: Building a Chat App](#tutorial-building-a-chat-app)

---

## 🔑 Getting an API Key

To use the Agent Protocol, you'll need an API API key.
1.  Go to our website: [agentprotocol.ai](https://agentprotocol.ai)
2.  Sign in with your account.
3.  Navigate to the **Dashboard** and request a new API Key.
4.  Use this key in your `AgentProvider`.

---

## Introduction

**Agent Protocol** is a bridge that connects LLMs (like Gemini, GPT-4) to Blockchain (Solana, Ethereum). It solves the "execution gap" by providing:
1.  **Standardized Tool Definitions** (`core`): JSON schemas that LLMs understand.
2.  **React Integration** (`ai`): Hooks and Components to drop a chat interface into any dApp.
3.  **Client-Side Execution**: Securely execute transactions using the user's connected wallet (Phantom, MetaMask), so private keys never leave the browser.

---

## Architecture Overview

The protocol consists of three main parts:

1.  **Frontend (React/Next.js)**:
    *   Uses `@agent-protocol/ai` to display chat and manage state.
    *   Connects to the User's Wallet (e.g., via `@solana/wallet-adapter-react`).
    *   **Executes Tools**: When the AI suggests a transaction (e.g., "transfer SOL"), the frontend intercepts this and asks the user to sign it.

2.  **Backend (Node/Hono/Express)**:
    *   Forwards user messages to the LLM (Gemini/OpenAI).
    *   Injects **Tool Definitions** from `@agent-protocol/core` into the LLM prompt.
    *   Returns the LLM's response (text or tool call) to the frontend.

3.  **Blockchain**:
    *   The layer where the actual value transfer happens, initiated by the frontend.

---

## Package: @agent-protocol/core

**Installation**:
```bash
pnpm add @agent-protocol/core
```

This package contains the **JSON Schema definitions** for tools. It is chain-agnostic.

### Usage

**Importing Standard Tools:**
```typescript
import { ALL_TOOLS, transferSOLTool, swapTool } from "@agent-protocol/core";

// ALL_TOOLS is an array of all available definitions:
// [transferSOLTool, transferETHTool, getBalanceTool, swapTool]
```

**Defining a Custom Tool:**
You can define your own tools following the standard schema:
```typescript
export const myCustomTool = {
    name: "mintNFT",
    description: "Mint a new NFT for the user.",
    parameters: {
        type: "OBJECT",
        properties: {
            name: { type: "STRING", description: "Name of the NFT" }
        },
        required: ["name"]
    }
};
```

---

## Package: @agent-protocol/ai

**Installation**:
```bash
pnpm add @agent-protocol/ai
```

This package contains the **AI Agent** implementation and React integrations.

### Features
1.  **Standard Agent Implementation**: We provide a pre-built `Agent` class with **implemented support for regular functions** (like token transfers, balance checks). You don't need to write blockchain logic from scratch for standard `core` tools.
2.  **React Hooks**: Easily connect the Agent Protocol to your UI.

### Usage

**1. Using the Standard Agent:**
The protocol comes with built-in handlers for standard actions defined in `@agent-protocol/core`.

```typescript
import { Agent, ALL_TOOLS } from "@agent-protocol/ai";

// Initialize an agent with standard capabilities
const agent = new Agent({
    network: 'solana',
    rpcUrl: "https://api.mainnet-beta.solana.com"
});

// The agent knows how to execute 'transferSOL' and 'getBalance' automatically
```

**2. `ChatWidget` Integration:**
Drop a complete chat interface into your app.

```tsx
import { ChatWidget } from "@agent-protocol/ai";
import { ALL_TOOLS } from "@agent-protocol/core";

// Pass your custom handlers. 
// "tools" is OPTIONAL. If omitted, it defaults to the Standard Agent tools (ALL_TOOLS).
<ChatWidget 
    title="Solana Agent" 
    // tools={ALL_TOOLS}  <-- Optional: Defaults to standard set
    handlers={myHandlers} // Custom handlers for execution
/>
```

---

## Tutorial: Building a Chat App

### Step 1: Setup React App
Initialize a Next.js project and install dependencies.
```bash
npx create-next-app@latest my-agent-app
pnpm add @agent-protocol/core @agent-protocol/ai @solana/wallet-adapter-react @solana/web3.js
```

### Step 2: Configure Page with Handlers
In `app/page.tsx`, you can define custom logic or allow the Agent to handle standard tasks.

```tsx
const handlers = {
    // Custom tool implementation example
    transferSOL: async ({ toAddress, amount }) => {
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: new PublicKey(toAddress),
                lamports: amount * LAMPORTS_PER_SOL
            })
        );
        return await sendTransaction(transaction, connection);
    }
};

return (
    <AgentProvider apiKey={key}>
        <ChatWidget tools={ALL_TOOLS} handlers={handlers} />
    </AgentProvider>
);
```

### Step 3: Run It
Start your frontend.
1.  Connect Wallet.
2.  Type: "Send 0.1 SOL to [Address]".
3.  The AI plans the tool call.
4.  The Agent Protocol executes the transaction using your handler.
5.  Your wallet pops up to sign! 🚀
