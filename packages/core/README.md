# @agent-protocol/core

The core logic library for the Agent Protocol. This package acts as the "Brain" and "Muscle" of the AI Agent, providing session management, wallet tools, and transaction execution logic.

It is designed to be **framework-agnostic**: it contains pure TypeScript logic and can be used in a Node.js server, a React frontend, or any JavaScript environment.

## 🧠 Architecture

The library separates **Intent (AI)** from **Execution (Code)**.

1.  **Definitions (The Menu)**: `transferSOLTool`, `transferETHTool`
    *   JSON descriptions fed to LLMs (like Gemini/GPT) so they know what actions are possible.
2.  **Execution (The Muscle)**: `transferSOL`, `transferETH`
    *   Actual functions that sign and send transactions using the Agent's session keys.
3.  **Session Management**: `AgentSession`
    *   Generates ephemeral keys for the agent to use, keeping the user's main wallet secure.

## 📦 Installation
```bash
pnpm add @agent-protocol/core
```

## 🚀 Usage

### 1. Generate a Session
Create a temporary wallet for the agent.
```typescript
import { generateSessionKeys } from "@agent-protocol/core";

const session = generateSessionKeys();
console.log(session.solAddress); // Agent's SOL address
console.log(session.ethAddress); // Agent's ETH address
```

### 2. Define Tools for AI
Pass these to your LLM (e.g., Gemini API).
```typescript
import { transferSOLTool, transferETHTool, getBalanceTool } from "@agent-protocol/core";

const tools = [transferSOLTool, transferETHTool, getBalanceTool];
// Send `tools` to Gemini...
```

### 3. Execute Actions
When the AI decides to call a tool, execute the corresponding function.
```typescript
import { transferSOL, restoreSolanaKeypair, Connection } from "@agent-protocol/core";

// 1. Restore key
const agentKey = restoreSolanaKeypair(session.solSecret);

// 2. Connect
const connection = new Connection("https://api.devnet.solana.com");

// 3. Execute
const signature = await transferSOL(connection, agentKey, "DestinationAddr...", 0.1);
console.log("Tx Signature:", signature);
```

## 🛠️ Exports

- **Global**: `generateSessionKeys`, `fetchSessionBalances`
- **Solana**: `transferSOL`, `transferSOLTool`, `createSolanaFundTransaction`
- **Ethereum**: `transferETH`, `transferETHTool`, `getEthAddress`
- **React**: Includes re-exports of `useConnection`, `useWallet` (Solana) and `wagmi` hooks for convenience.
