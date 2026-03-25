# Onboarding Guide

## Prerequisites

- **Node.js** >= 18
- **npm** (bundled with Node.js)
- **Expo CLI**: `npm install -g expo-cli` (or use `npx expo` directly)
- **Android**: Android Studio + emulator, or a physical device with Expo Go
- **iOS** (macOS only): Xcode + iOS Simulator
- **Web**: Any modern browser

## Clone & Install

```bash
git clone <repository-url>
cd L3T1
npm install
```

## Environment Variables

Create a `.env` file at the project root:

```
EXPO_PUBLIC_API_BASE_URL=https://pleiade.mi.parisdescartes.fr/api/v1
```

The `EXPO_PUBLIC_` prefix is required by Expo to expose the variable to the React Native bundler.

Optional (for ADE Consult integration):

```
EXPO_PUBLIC_ADE_API_URL=http://localhost:8001
```

## Running the App

```bash
npm run start       # Expo dev server (choose platform interactively)
npm run android     # Launch on Android emulator/device
npm run ios         # Launch on iOS simulator (macOS only)
npm run web         # Launch in browser
```

## Project Structure

```
L3T1/
  app/                  # Screens (Expo Router file-based routing)
    _layout.tsx         #   Root layout (theme, i18n, providers)
    index.tsx           #   Auth gate (entry point)
    sign-in.tsx         #   Login screen
    chat.tsx            #   Main chat screen
    accountScreen.tsx   #   Account/settings hub
    general.tsx         #   General settings
    data_controls.tsx   #   Data management
    archivedChats.tsx   #   Archived chats
    ...
  components/           # Reusable UI components
    Header.tsx          #   App header with menu toggle
    Sidebar.tsx         #   Chat history sidebar
    InputBar.tsx        #   Message input with attachments
    MessageBubble.tsx   #   Chat message display (memoized)
    ModelSelector.tsx   #   Model picker (multi-model)
    ChatControlsPanel.tsx # System prompt, temperature, etc.
    ActionMenu.tsx      #   Long-press actions on messages
    IntegrationsMenu.tsx #  ADE/web integrations menu
    ...
  services/             # API communication layer
    apiClient.ts        #   Axios instance with auth interceptors
    chatService.ts      #   All Pleiade API calls
    authService.ts      #   Login/logout/auth check
    adeService.ts       #   ADE Consult schedule service
  store/                # Zustand state management
    chatStore.ts        #   Core chat state (messages, models, streaming)
    useSettingsStore.ts #   User settings (theme, language, notifications)
    interfaceSettingsStore.ts # UI preferences (40+ options)
  i18n/                 # Internationalization
    i18n.ts             #   i18next configuration
    translations.ts     #   FR/EN/ZH translation strings
    useI18n.ts          #   Translation hook
  utils/                # Shared utilities
    theme.ts            #   Theme resolution and color tokens
    uuid.ts             #   UUID generation
    messageHelpers.ts   #   Message formatting
    mathParser.ts       #   LaTeX/math parsing
  assets/               # Icons, splash screen, images
  __tests__/            # Jest test suites
  scripts/              # Dev scripts (API testing)
  docs/                 # Documentation
```

## Key Concepts

### Multi-Model Streaming

L3T1 can stream responses from up to 4 LLM models simultaneously. Each model gets its own SSE (Server-Sent Events) connection. Responses are stored in a nested structure: `modelResponses[modelName][userMessageId] = "response text"`.

Users can switch between model responses for each message. Streaming can be stopped mid-generation via `stopGeneration()`.

### ADE Consult Integration

ADE Consult is a bot-driven system for accessing university schedules (Paris Cite). The LLM emits structured `<<ADE:action(params)>>` tags, which the client intercepts and executes against a backend Playwright-powered browser session.

Typical flow: search -> select resource -> read schedule.

### File Uploads

Files and images can be attached to messages. The upload process:
1. Pick file via `expo-document-picker` or `expo-image-picker`
2. Upload to server via `POST /files/?process=true` (FormData)
3. Server returns file ID
4. File ID is included in the chat completion request

### Authentication

Token-based auth stored in `expo-secure-store` (encrypted device storage). On 401 responses, the token is cleared and the user is redirected to the login screen automatically.

## Development Workflow

1. Start the dev server: `npm run start`
2. Make changes -- Expo hot-reloads automatically
3. Test API calls: `npx ts-node scripts/test-api.ts`
4. Run tests: `npx jest`

## Testing

Jest is configured in `jest.config.js`:

```bash
npx jest                    # Run all tests
npx jest --coverage         # Run with coverage report
npx jest --watch            # Watch mode
```

Test structure mirrors the source:

```
__tests__/
  store/       # chatStore tests
  services/    # apiClient, chatService, authService tests
  components/  # Component tests
  utils/       # Utility tests
  i18n/        # Translation tests
  __mocks__/   # react-native mock, etc.
  setup.ts     # Global test setup
```

Coverage targets: `store/`, `services/`, `utils/`, `i18n/translations.ts`.
