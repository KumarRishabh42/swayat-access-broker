# Persona-Based Least-Privilege Policy Dashboard

MVP demo: deterministic capability enforcement with Evolve SDK and Claude as the agent.

## Architecture

```
Frontend (React Dashboard)
    ↓ HTTP
Backend (Express + Policy Engine)
    ↓ HTTP
MCP Server (Policy Gate)
    ↓ calls Claude
Evolve SDK (Claude in Sandbox)
```

## What It Does

1. **Dashboard** lets you create personas with capability ceilings (e.g., "Finance" can read/post to Slack, read SAP)
2. **Submit a task** (e.g., "Approve Q3 invoices")
3. **LLM proposes** what capabilities it needs for that task
4. **Policy engine** checks deterministically: is proposed ⊆ persona ceiling?
5. **Decision** is approved/denied based on the intersection
6. **Audit log** tracks all decisions

## Setup

### Prerequisites

- Node.js 18+
- Your Evolve API key in `.env` (see `.env.example`) — get one free at [dashboard.evolvingmachines.ai](https://dashboard.evolvingmachines.ai)
- Your Anthropic API key for the LLM proposer

### Install Dependencies

From the root `/my-evolve-app`:

```bash
cd backend && npm install && cd ..
cd dashboard && npm install && cd ..
cd mcp-server && npm install && cd ..
```

Or run the convenience script:
```bash
./install-all.sh
```

### Configure

1. **Backend** — edit `backend/.env`:
   ```bash
   PORT=3001
   ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
   ```

2. **MCP Server** — edit `mcp-server/.env`:
   ```bash
   BACKEND_URL=http://localhost:3001/api
   ```

3. **Dashboard** — queries `http://localhost:3001/api` by default (no config needed)

## Run

### Terminal 1: Backend (Policy Engine)

```bash
cd backend
npm run dev
```

Should print: `[Server] Policy backend listening on http://localhost:3001`

### Terminal 2: Dashboard (React)

```bash
cd dashboard
npm run dev
```

Should print: `Local: http://localhost:5173`

### Terminal 3: MCP Server (Optional, for Evolve integration later)

```bash
cd mcp-server
npm run dev
```

Should print: `[Policy MCP Server] Started on stdio`

## Quick Demo

1. **Open dashboard** at http://localhost:5173
2. **Go to "Personas"** tab → Create a persona:
   - Name: "Finance Manager"
   - Capabilities:
     - Service: `slack` | Actions: `read_message, post_message` | Resources: `#accounting`
     - Service: `sap` | Actions: `read_vendor, read_invoice` | Resources: (empty)

3. **Go to "Submit Task"** → Select the persona you just created, then enter:
   - Task: "Approve vendor invoices"
   - Prompt: "Read the latest invoices for vendor Acme Corp and approve payment for those under $10,000"

4. **Watch the decision**:
   - LLM proposes: `{slack: [post_message], sap: [read_vendor, read_invoice, post_payment]}`
   - Policy engine checks against ceiling
   - Decision: `Denied` — `sap:post_payment` not in persona's capabilities
   - Audit log shows why

5. **Go to "Audit Log"** to see the full history

## File Structure

```
my-evolve-app/
├── backend/                    # Express policy engine
│   ├── src/
│   │   ├── types.ts           # Shared types
│   │   ├── policyEngine.ts    # Deterministic subset check
│   │   ├── llmProposer.ts     # Claude proposes capabilities
│   │   ├── db.ts              # SQLite persistence
│   │   ├── routes.ts          # API routes
│   │   └── index.ts           # Server entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                   # ANTHROPIC_API_KEY
│
├── dashboard/                  # React Vite app
│   ├── src/
│   │   ├── components/        # PersonaForm, TaskSubmitter, PolicyHistory
│   │   ├── api.ts             # Axios client for backend
│   │   ├── App.tsx            # Main dashboard
│   │   └── App.css            # Styling
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
│
├── mcp-server/                 # MCP server (Claude calls this)
│   ├── src/
│   │   └── server.ts          # Stdio MCP server
│   ├── package.json
│   └── .env                   # BACKEND_URL
│
├── .env                       # Root: EVOLVE_API_KEY (already set)
├── .gitignore
└── README.md
```

## Key Data Shapes

### Persona
```typescript
{
  id: "abc123",
  name: "Finance Manager",
  description: "...",
  capabilities: [
    {
      service: "slack",
      actions: ["read_message", "post_message"],
      resources: ["#accounting"]
    },
    {
      service: "sap",
      actions: ["read_vendor", "read_invoice"]
    }
  ]
}
```

### PolicyDecision
```typescript
{
  taskId: "task-123",
  personaId: "persona-abc",
  status: "approved" | "denied" | "requires_review",
  proposedCapabilities: [...],  // What LLM asked for
  approvedCapabilities: [...],  // Intersection with persona ceiling
  deniedCapabilities: [...],    // Proposed but not allowed
  reasoning: "..."
}
```

## Evolve Integration (Next Phase)

When you're ready to plug in Evolve:

1. The **agent** (Claude) runs in an Evolve sandbox
2. Before executing ANY action, it calls the **MCP server**'s `check_capability` tool
3. MCP server queries the backend's decision database
4. If approved, agent proceeds; if denied, agent reports the denial

See `backend/src/routes.ts` and `mcp-server/src/server.ts` for the integration points.

## MVP Shortcuts

- **Database**: SQLite (in-process, no external DB)
- **LLM**: Claude Haiku (cheapest; swap to Opus in `llmProposer.ts`)
- **Composio**: Not wired yet; stub when ready
- **Evolve Agent**: Not running yet; wired in phase 2

## Next Steps

1. ✅ Policy engine & deterministic gates (done)
2. ✅ Dashboard for personas & decisions (done)
3. ⏳ Evolve agent integration (stub hooks in place)
4. ⏳ Real Composio execution (currently mocked)
5. ⏳ Aurora/Postgres backing (currently SQLite)

## Debugging

**Backend not responding?**
```bash
curl http://localhost:3001/api/health
# Should return { "status": "ok" }
```

**Dashboard can't reach backend?**
Check `dashboard/src/api.ts` — should be `http://localhost:3001/api`

**LLM proposer failing?**
Check `backend/.env` has a valid `ANTHROPIC_API_KEY`

**MCP server won't start?**
Make sure `mcp-server/.env` points to the running backend (`http://localhost:3001/api`)

## Questions?

This is an MVP. Some things might not work perfectly. If you hit blockers, let me know and we can patch them.
