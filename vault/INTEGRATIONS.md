# Integrations Setup Guide

Your Execution-OS connects to external services via MCP (Model Context Protocol). Each integration gives your AI assistant access to real data.

## Quick Start

1. Copy the MCP template: `cp .mcp.json.template .mcp.json`
2. Edit `.mcp.json` with your credentials (see below)
3. Restart Claude Code

> `.mcp.json` is in `.gitignore` — your credentials are never committed.

---

## Gmail

**What it does**: Search emails, read threads, create drafts. Powers `/email` and `/prep`.

**Setup**: Gmail connects automatically through Claude's built-in integration.
1. The Gmail MCP URL is pre-configured in `.mcp.json.template`
2. When Claude Code first tries to access Gmail, it will prompt you to authenticate
3. Approve the OAuth flow in your browser
4. Done — your AI assistant can now search and draft emails

---

## Google Calendar

**What it does**: View schedule, create events, find free time. Powers `/calendar` and `/prep`.

**Setup**: Same as Gmail — built-in Claude integration.
1. Pre-configured in `.mcp.json.template`
2. Authenticate when prompted
3. Done

---

## NotebookLM

**What it does**: Grounded AI synthesis across your documents. Zero hallucination. Powers `/notebook` and enriches `/today`, `/review`, `/war-room-close`.

**Setup**:
1. Install the NotebookLM CLI: `npm install -g notebooklm-mcp-cli`
2. Authenticate: `nlm login`
3. Create your first notebook at [notebooklm.google.com](https://notebooklm.google.com)
4. The MCP server is pre-configured in `.mcp.json.template`

**Recommended notebooks**:
- **Operating Brain**: Ingest your vault files for cross-document queries
- **Industry Research**: External articles, reports, competitor analysis

---

## QuickBooks

**What it does**: Search invoices, read accounts, financial data. Powers Oracle agent and `/cfo-finance`.

**Setup**:
1. Create a QuickBooks Developer account at [developer.intuit.com](https://developer.intuit.com)
2. Create an app and get your Client ID + Secret
3. Update `.mcp.json` with your credentials:
   - `QB_CLIENT_ID`: Your app's client ID
   - `QB_CLIENT_SECRET`: Your app's client secret
   - `QB_REDIRECT_URI`: Your redirect URI
   - `QB_ENVIRONMENT`: "sandbox" or "production"

> Skip this if you don't use QuickBooks. Remove the `quickbooks` section from `.mcp.json`.

---

## YouTube (yt-dlp)

**What it does**: Search videos, download transcripts, get metadata. Great for research and content creation.

**Setup**:
1. Pre-configured in `.mcp.json.template` — no credentials needed
2. Requires `yt-dlp` installed: `brew install yt-dlp` (macOS) or `pip install yt-dlp`

---

## Adding More Integrations

MCP is extensible. You can add any MCP-compatible server to `.mcp.json`. Browse available servers at [modelcontextprotocol.io](https://modelcontextprotocol.io).

When adding new MCP configs:
- Use the `env` block for secrets — never pass credentials as CLI arguments
- Keep `.mcp.json` in `.gitignore`
