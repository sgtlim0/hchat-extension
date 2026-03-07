// shared/lib/storage-keys.ts — 모든 chrome.storage 키 상수

export const STORAGE_KEYS = {
  CONFIG: 'hchat:config',
  CONFIG_AWS: 'hchat:config:aws',
  CONFIG_DARK_MODE: 'hchat:config:darkMode',
  SESSIONS: 'hchat:sessions',
  MEMORY_PREFIX: 'hchat:memory:',
  SCHEDULER_TASKS: 'hchat:scheduler:tasks',
  SCHEDULED_RESULTS_PREFIX: 'hchat:scheduled-results:',
  PENDING_PROMPT: 'hchat:fab-pending',
  FOCUS_INPUT: 'hchat:focus-input',
  SCHEMA_VERSION: 'hchat:schema-version',
  CONTEXT_STACK: 'hchat:context-stack',
  HIGHLIGHTS_PREFIX: 'hchat:highlights:',
  CLIPBOARD_HISTORY: 'hchat:clipboard-history',
  KNOWLEDGE: 'hchat:knowledge',
} as const
