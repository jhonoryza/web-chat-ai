# DeepSea

A privacy-first AI chat client that runs entirely in your browser. Bring your own API key — no backend, no tracking, no data collection.

**Live site:** https://jhonoryza.github.io/web-chat-ai/

## Features

- Multiple custom providers (name, base URL, API key) — any OpenAI-compatible API
- Fetch models from `GET {baseURL}/models`, or type any model ID manually
- Streaming chat responses with a stop button
- Image attachments (vision) — resized client-side before sending
- Conversations saved in your browser (IndexedDB, localStorage fallback)
- Markdown rendering with code blocks + per-message copy buttons
- Dark mode by default, light mode toggle
- Mobile-first, app-like layout on phones
- Backup & restore everything as one JSON file
- Per-chat settings: system prompt, temperature, max tokens

## Privacy

All API requests go directly from your browser to your chosen provider. API keys and chat history never leave your device except to the provider's API. There is no server, no analytics, no account.

## Provider notes

Most cloud providers (OpenAI, DeepSeek, OpenRouter, Groq, Together, Mistral…) allow browser requests. For local models (Ollama/LM Studio), configure CORS first — e.g. `OLLAMA_ORIGINS=*` for Ollama.

Two gotchas: always include the scheme in the base URL (`http://` or `https://` — the app prepends `http://` if you forget it), and a page served over HTTPS cannot call `http://` endpoints (browsers block it as mixed content) — use an `https://` endpoint instead.
