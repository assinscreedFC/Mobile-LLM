# API Reference

All endpoints target the Pleiade API (Open WebUI compatible).

**Base URL**: `EXPO_PUBLIC_API_BASE_URL` (e.g. `https://pleiade.mi.parisdescartes.fr/api/v1`)

**Authentication**: Bearer token in `Authorization` header, injected automatically by `apiClient`.

---

## Authentication

### POST /auths/signin

Login with email and password.

```
Request:  { email: string, password: string }
Response: { token: string, ... }
```

Token is stored in SecureStore and injected in all subsequent requests.

---

## Models

### GET /models

List available LLM models.

```
Response: {
  data: [
    {
      id: string,
      name: string,
      size?: number,
      parameter_size?: string,
      info?: {
        meta?: {
          capabilities?: { vision: boolean }
        }
      }
    }
  ]
}
```

Client maps each model to `{ id, name, size, vision, _raw }`.

---

## Chats

### POST /chats/new

Create a new chat conversation.

```
Request: {
  chat: {
    id: "",
    title: "Nouvelle conversation",
    models: [string],
    params: {},
    history: {
      messages: Record<string, MessageObject>,
      currentId: string | null
    },
    messages: MessageObject[],
    tags: [],
    timestamp: number
  },
  folder_id: null
}
Response: { id: string, chat: {...}, ... }
```

### POST /chats/:id

Update an existing chat (sync history, title, etc.).

```
Request: { chat: { title?: string, history?: {...}, messages?: [...], ... } }
Response: { id: string, chat: {...}, ... }
```

### GET /chats/:id

Get full chat details.

```
Response: { id: string, chat: { title, models, messages, history, ... }, ... }
```

### GET /chats/?page=N

Get paginated chat history.

```
Query params: page (number), include_folders=true, include_pinned=true
Response: [{ id, title, updated_at, ... }, ...]
```

### DELETE /chats/:id

Delete a single chat.

```
Response: (empty on success)
```

### DELETE /chats/

Delete all chats.

```
Response: { ... }
```

---

## Archive

### GET /chats/archived?page=N

Get paginated archived chats.

```
Query params: page (number), order_by=updated_at, direction=desc
Response: [{ id, title, updated_at, ... }, ...]
```

### POST /chats/:id/archive

Toggle archive status of a chat.

```
Response: { ... }
```

### POST /chats/archive/all

Archive all chats.

```
Response: { ... }
```

### POST /chats/unarchive/all

Unarchive all chats.

```
Response: { ... }
```

---

## Import / Export

### GET /chats/all

Export all active chats.

```
Response: [{ id, chat: {...} }, ...]
```

### GET /chats/all/archived

Export all archived chats.

```
Response: [{ id, chat: {...} }, ...]
```

### POST /chats/import

Import chats from export data.

```
Request:  { chats: [{ ... }] }
Response: { ... }
```

---

## Files

### POST /files/?process=true

Upload a file with server-side processing. Uses `fetch` directly (not Axios) for FormData compatibility on React Native.

```
Request:  FormData with field "file" { uri, type, name }
Headers:  Authorization: Bearer <token>
Response: {
  id: string,
  filename: string,
  path: string,
  meta: { ... }
}
```

Client returns `{ id, name, url, meta, mimeType }`.

---

## Web Retrieval

### POST /retrieval/process/web

Attach a webpage for RAG retrieval.

```
Request:  { url: string, collection_name: string }
Response: { ... }
```

Client validates URL: only HTTP/HTTPS, no private/local network addresses (SSRF protection).

---

## Chat Completions (Streaming)

### POST /api/chat/completions

**Note**: Uses `/api` base path (not `/api/v1`).

Stream an LLM completion via Server-Sent Events (SSE).

```
Request: {
  model: string,
  stream: true,
  messages: [{ role: string, content: string | object[] }],
  chat_id: string,
  features?: {
    web_search?: boolean,
    code_interpreter?: boolean
  },
  params?: {
    temperature?: number,
    max_tokens?: number
  },
  files?: [{ type: string, id: string, name?: string, url?: string }],
  models?: [{ ... }]     // model capability metadata
}

SSE events:
  data: { choices: [{ delta: { content: string } }], task_id?: string }
  data: [DONE]            // stream complete
```

### POST /api/chat/completed

Mark a chat completion as finished (for server-side bookkeeping).

**Note**: Uses `/api` base path.

```
Request: {
  model: string,
  messages: [...],
  chat_id: string
}
Response: { ... }
```

### POST /api/chat/stop

Stop an active streaming task.

**Note**: Uses `/api` base path.

```
Request:  { task_id: string }
Response: (empty on success)
```

---

## Knowledge

### GET /knowledge/?page=N

Get knowledge items (documents, collections).

```
Query params: page (number)
Response: { items: [...], total: number }
```

---

## Title Generation

### POST /tasks/title/completions

Generate a title for a chat based on its messages.

```
Request: {
  model: string,
  messages: [{ role, content }],
  chat_id: string
}
Response: {
  choices: [{
    message: {
      content: string    // JSON with { title } or plain text
    }
  }]
}
```

On success, the client also calls `POST /chats/:id` to persist the generated title.

---

## ADE Consult (Separate Service)

**Base URL**: `EXPO_PUBLIC_ADE_API_URL` (default: `http://localhost:8001`)

These endpoints are called via `adeService.ts` for university schedule management:

| Method | Path | Purpose |
|--------|------|---------|
| POST | /ade/login | CAS login (username/password) |
| POST | /ade/login/cookies | Login via browser cookies |
| POST | /ade/ical-url | Set iCal URL |
| GET | /ade/status | Check connection status |
| GET | /ade/schedule | Get schedule events |
| GET | /ade/search?q=... | Search resources |
| GET | /ade/projects | List ADE projects |
| POST | /ade/project/:id | Set active project |
| POST | /ade/remember | Save a resource |
| GET | /ade/resources | List saved resources |
| DELETE | /ade/resources/:name | Remove a resource |
| GET | /ade/ical | Get iCal URL |
| POST | /ade/routines | Add a routine |
| GET | /ade/routines | List routines |
| DELETE | /ade/routines/:name | Remove a routine |
| POST | /ade/action | Execute interactive navigation action |
