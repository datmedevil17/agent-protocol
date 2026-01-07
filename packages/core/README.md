# @agent-protocol/core

**The Core definitions for the Agent Protocol.**

This package provides the standardized JSON Schema definitions for tools that LLMs (like Gemini, GPT-4) can understand to interact with blockchains.

## Installation

```bash
pnpm add @agent-protocol/core
# or
npm install @agent-protocol/core
```

## Usage

Import standard tools to pass to your LLM configuration or the `@agent-protocol/ai` components.

```typescript
import { ALL_TOOLS, transferSOLTool, swapTool } from "@agent-protocol/core";

// ALL_TOOLS contains: [transferSOLTool, transferETHTool, getBalanceTool, swapTool]

// Example: Passing to an LLM
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    tools: [
        {
            functionDeclarations: ALL_TOOLS
        }
    ]
});
```
