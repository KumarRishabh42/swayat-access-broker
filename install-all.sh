#!/bin/bash

echo "Installing dependencies for all apps..."

echo "📦 Backend..."
cd backend && npm install && cd .. || exit 1

echo "📦 Dashboard..."
cd dashboard && npm install && cd .. || exit 1

echo "📦 MCP Server..."
cd mcp-server && npm install && cd .. || exit 1

echo "✅ All dependencies installed!"
echo ""
echo "Next, run in separate terminals:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd dashboard && npm run dev"
echo "  Terminal 3: cd mcp-server && npm run dev"
echo ""
echo "Then open http://localhost:5173"
