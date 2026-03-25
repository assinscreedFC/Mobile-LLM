# Architecture L3T1

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native | 0.81.5 |
| Platform | Expo | ~54.0 |
| State | Zustand | ^5.0.11 |
| HTTP | Axios | ^1.13.5 |
| Streaming | react-native-sse | ^1.2.1 |
| Styling | NativeWind (Tailwind CSS) | ^2.0.11 |
| i18n | i18next + react-i18next | ^25.8 / ^16.5 |
| Icons | lucide-react-native | ^0.564.0 |
| Markdown | react-native-markdown-display | ^7.0.2 |
| Math | react-native-math-view | ^3.9.5 |
| Secure storage | expo-secure-store | ~15.0.8 |

## Routing

Expo Router v6 file-based routing. All screens live under `app/`.

```
app/
  _layout.tsx        # RootLayout: SafeAreaProvider, StatusBar, theme, i18n init
  index.tsx          # Auth gate: checks SecureStore token, redirects to /chat or /sign-in
  sign-in.tsx        # Login form
  sign-up.tsx        # Registration
  pending.tsx        # Pending approval screen
  chat.tsx           # Main chat screen (messages, input, sidebar)
  accountScreen.tsx  # User account / settings hub
  general.tsx        # General settings (theme, language, notifications)
  personnalization.tsx # Memory management (experimental)
  interfaceScreen.tsx # Interface settings (UI toggles)
  data_controls.tsx  # Data management (export, import, delete)
  archivedChats.tsx  # Archived conversations list
  about.tsx          # About screen
```

Auth flow: `index.tsx` calls `checkAuthStatus()` -> if token valid -> `/chat`, else -> `/sign-in`.

## State Management

Three Zustand stores:

### 1. `chatStore` (`store/chatStore.ts`)

The core store. Manages:

- `userMessages: Message[]` -- ordered user messages in current chat
- `modelResponses: Record<modelName, Record<userMsgId, string>>` -- assistant responses per model per user message
- `activeModels: string[]` -- currently selected models (up to 4)
- `currentChatId: string | null` -- active chat ID
- `isTyping: boolean` -- streaming in progress
- `attachments: Attachment[]` -- pending file/image attachments
- `history: any[]` -- chat history list
- `archivedChats: any[]` -- archived chats list
- `currentEventSources: EventSource[]` -- active SSE connections
- `currentTaskIds: string[]` -- active task IDs for stop/cancel
- Chat parameters: `systemPrompt`, `temperature`, `maxTokens`, `webSearchEnabled`, `codeInterpreterEnabled`

Key actions: `sendMessage()`, `startNewChat()`, `stopGeneration()`, `regenerateResponse()`, `editAndResend()`, `setCurrentChatId()`, `fetchHistory()`, `fetchArchivedChats()`.

### 2. `useSettingsStore` (`store/useSettingsStore.ts`)

Persisted via AsyncStorage (`l3t1-settings-v1`):

- `themeMode: "systeme" | "clair" | "sombre"`
- `language: "systeme" | "zh" | "en" | "fr"`
- `notificationsEnabled: boolean`

### 3. `interfaceSettingsStore` (`store/interfaceSettingsStore.ts`)

In-memory store for UI preferences (40 options): UI scale, high contrast, haptics, chat direction, title generation, code collapse, voice settings, etc. Each option has a `textKey`, `type` (switch/NumberInput/action-sheet/separator), and `value`.

## Service Layer

### `apiClient` (`services/apiClient.ts`)

Axios instance configured with:
- `baseURL`: `EXPO_PUBLIC_API_BASE_URL`
- Request interceptor: injects `Authorization: Bearer <token>` from SecureStore
- Response interceptor: on 401, deletes token and redirects to `/sign-in`
- Timeout: 10s

### `chatService` (`services/chatService.ts`)

All Pleiade API calls: models, chat CRUD, file upload, web search, SSE streaming, title generation, knowledge. See `docs/API.md` for full endpoint list.

### `authService` (`services/authService.ts`)

- `login(email, password)` -- POST `/auths/signin`, stores token in SecureStore
- `logout()` -- deletes token from SecureStore
- `checkAuthStatus()` -- verifies stored token validity via GET `/models`

### `adeService` (`services/adeService.ts`)

ADE Consult integration (university schedule system). Separate Axios client (`EXPO_PUBLIC_ADE_API_URL`). Provides:
- CAS login / cookie-based login
- iCal URL management
- Schedule retrieval
- Resource search and management
- Interactive navigation actions (Playwright-backed)
- Routines (scheduled actions)

## Multi-Model Streaming

```
sendMessage(text)
  |
  +-- Upload attachments (if any) via chatService.uploadFile()
  +-- Create or update chat via chatService.createNewChat() / updateChat()
  |
  +-- For each activeModel (parallel):
  |     chatService.streamCompletion(payload, onChunk, onError)
  |       -> SSE via EventSource to POST /api/chat/completions
  |       -> onChunk updates modelResponses[model][userMsgId]
  |       -> on [DONE]: close EventSource
  |
  +-- chatService.chatCompleted(payload)
  +-- chatService.generateTitle() (first message only)
  +-- chatService.updateChat() (persist history)
```

`modelResponses` structure: `Record<modelName, Record<userMsgId, string>>`. Each model streams independently. `stopGeneration()` closes all EventSources and calls `stopTask()` per active task ID.

## ADE Integration

Bot-driven university schedule system. The LLM receives an `ADE_SYSTEM_PROMPT` that teaches it to emit `<<ADE:action(params)>>` tags. The client-side `processADECalls()` function:

1. Parses `<<ADE:action(param=value)>>` patterns from assistant output
2. Executes each action via `adeService.adeAction()`
3. Replaces the tag with the result
4. Loops up to 5 iterations (ADE_MAX_ITERATIONS) for multi-step workflows

Available actions: `browse`, `expand`, `select`, `search`, `read`, `status`.

## Styling

NativeWind (Tailwind CSS for React Native). Theme resolved via `utils/theme.ts`:

- `useResolvedTheme(themeMode)` returns `{ resolved, colors }` based on system preference or explicit choice
- Dark theme: `#0B0B0F` background, `#15151C` card
- Light theme: `#F6F6F6` background

## i18n

i18next with `expo-localization`. Three languages: `fr`, `en`, `zh`.

- `i18n/i18n.ts` -- i18next configuration
- `i18n/translations.ts` -- all translation strings
- `i18n/useI18n.ts` -- hook returning `{ t, language }`
- `_layout.tsx` -- syncs i18n language with settings store

## Component Hierarchy

```
RootLayout (_layout.tsx)
  |
  +-- Stack (Expo Router)
       |
       +-- index.tsx (auth gate)
       +-- sign-in.tsx / sign-up.tsx / pending.tsx
       +-- chat.tsx
       |     +-- Header
       |     +-- Sidebar
       |     +-- MessageBubble (list, React.memo)
       |     +-- InputBar
       |     +-- ModelSelector
       |     +-- ChatControlsPanel
       |     +-- ActionMenu
       |     +-- IntegrationsMenu
       |     +-- AdeLoginWebView
       |
       +-- accountScreen.tsx
       +-- general.tsx
       +-- personnalization.tsx
       +-- interfaceScreen.tsx
       +-- data_controls.tsx
       +-- archivedChats.tsx
       +-- about.tsx
```

## Key Utilities

| File | Purpose |
|------|---------|
| `utils/theme.ts` | Theme resolution, color tokens |
| `utils/uuid.ts` | UUID generation (`generateUUID()`) |
| `utils/messageHelpers.ts` | Message formatting helpers |
| `utils/mathParser.ts` | LaTeX/math parsing for rendering |
| `utils/useHaptics.ts` | Haptic feedback hook |
| `utils/useUIScale.ts` | UI scaling hook |
