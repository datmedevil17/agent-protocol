# Agent Protocol Monorepo

A modular system for AI Agents that can transact on Solana and Ethereum.

## 📂 Structure

- **`packages/core`**: The Agent SDK (`@agent-protocol/core`). Contains all business logic, tools, and session management.
- **`examples/web`**: A Next.js Web Application demonstrating a Chat UI where you can fund an agent and ask it to move money.

## 🚀 Quick Start

### Prerequisites
- Node.js > 18
- `pnpm` installed

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Build Packages
Build the core library first.
```bash
pnpm -r build
```

### 3. Run Web Example
Start the Next.js development server.
```bash
pnpm dev:web
```
Open [http://localhost:3000](http://localhost:3000).

## 🔑 Configuration
Create a `.env` file in `examples/web` with your Gemini API key:
```bash
NEXT_PUBLIC_GEMINI_API_KEY=your_key_here
```

## ARCHITECTURE NOTE
This monorepo uses a **Hybrid Import Strategy** to ensure stability:
- **Logic**: All logic is imported from `@agent-protocol/core`.
- **Context**: Wallet Contexts (Solana Adapter) are imported directly from `@solana/wallet-adapter-react` in the UI to prevent React Context duplication issues.

## 🏛️ Architecture

```mermaid
graph LR
    %% Styles
    classDef provider fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    classDef platform fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
    classDef user fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000
    classDef runtime fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef billing fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#000

    subgraph Onboarding
        SP[Service Provider]:::provider -->|1. Create Project| Platform[Platform API]:::platform
        Platform -->|Issue API Key| SP
    end

    subgraph Integration
        SP -->|Option A: Install SDK| SDK[Agent SDK]:::platform
        SP -->|Option B: Embed Modal| Modal[Pre-Built Modal]:::platform
    end

    subgraph "User Interaction"
        User[End User]:::user -->|Interacts| SDK
        User -->|Interacts| Modal
    end

    subgraph "Autonomous Execution"
        SDK -->|Inject Instructions| AgentRuntime[Agent Runtime]:::runtime
        Modal -->|Preloaded Instructions| AgentRuntime
        AgentRuntime -->|Validate & Simulate| Safety[Safety Layer]:::runtime
        Safety -->|Sign w/ Session Key| Signing[Signing Service]:::runtime
    end

    subgraph "Billing & Settlement"
        Signing -->|Execute| Solana:::billing
        Signing -->|Execute| Ethereum:::billing
        AgentRuntime -->|Trigger Payment| X402[X402 Billing]:::billing
        X402 -->|Pay-per-Request| Platform
    end
```

