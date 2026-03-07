// shared/lib/message-bus.ts — 타입 안전 chrome.runtime 메시지 통신

import type { ExtensionMessage, MessageResponseMap } from '@/shared/types/chrome-messages'

export async function sendMessage<T extends ExtensionMessage>(
  message: T
): Promise<MessageResponseMap[T['type']]> {
  return chrome.runtime.sendMessage(message)
}
