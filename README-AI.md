# AllBarka AI Concierge Setup

This project uses a local **Ollama** instance to power the AllBarka AI Concierge, utilizing the `gemma3:4b` model to provide fast, privacy-first, offline-capable AI support directly from the browser to your local machine.

## Prerequisites & Installation

1. **Install Ollama**: Download from [ollama.com](https://ollama.com/) and install it on your Windows machine.
2. **Download Model**: Open Windows Terminal / PowerShell and run:
   ```bash
   ollama run gemma3:4b
   ```
   *Wait for the model to download and verify it answers interactively.*

## Local Host Configuration (Crucial for Web UI)

By default, Ollama blocks connection attempts from web browsers (CORS). You must explicitly allow your development origin.

1. Open PowerShell **as Administrator**.
2. Run:
   ```powershell
   setx OLLAMA_ORIGINS "*"
   ```
3. Restart the Ollama application entirely (Quit it from the Windows system tray in the bottom right, and relaunch it from the start menu).

## Production Setup (Scaling)

The current implementation in `src/services/aiConcierge.ts` points to `http://localhost:11434/api/chat`. 

When deploying AllBarka to production (e.g., Vercel / Cloudflare), the users' browsers will NOT be able to connect to `localhost:11434`.

To scale this:
1. **Option A (Hosted Endpoint)**: Point `OLLAMA_URL` to a cloud-hosted LLM endpoint (e.g., Groq, Together API, or a proxy server handling authentication).
2. **Option B (n8n Webhook)**: You can connect `src/services/aiConcierge.ts` to an n8n webhook, which then communicates with an LLM of your choice and returns the response. Note: Ensure `stream: false` if your webhook doesn't support NDJSON streaming.

## Known Limitations

- **CORS Handling**: `stream: true` utilizes `fetch` to read chunked NDJSON directly on the client. It relies heavily on proper headers.
- **Context Size**: Our current system injects ~2000 tokens of the absolute product catalog into the system prompt. Scaling the catalog further might require an intermediate retrieval layer (RAG) rather than full prompt stuffing.
- **Graceful degradation**: If Ollama goes offline or CORS blocks the request, the chat widget immediately switches to an offline fallback error state linking to human WhatsApp support.
