// lib/autopilot.ts — AI Web Autopilot: DOM 액션 시퀀스 파싱 및 실행

export interface AutoAction {
  action: 'click' | 'type' | 'scroll' | 'wait' | 'navigate'
  selector?: string
  value?: string
  delay?: number
}

export interface SavedMacro {
  id: string
  name: string
  actions: AutoAction[]
  createdAt: number
}

export interface ActionLog {
  index: number
  action: AutoAction
  status: 'pending' | 'success' | 'fail'
  message?: string
}

const MACRO_STORAGE_KEY = 'hchat:autopilot:macros'

/** AI 응답에서 JSON 액션 배열 파싱 */
export function parseActions(aiResponse: string): AutoAction[] {
  // JSON 배열 추출 (코드블록 또는 직접 JSON)
  const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/m)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown[]
    return parsed.filter(isValidAction)
  } catch {
    return []
  }
}

function isValidAction(item: unknown): item is AutoAction {
  if (typeof item !== 'object' || item === null) return false
  const obj = item as Record<string, unknown>
  const validActions = ['click', 'type', 'scroll', 'wait', 'navigate']
  return typeof obj.action === 'string' && validActions.includes(obj.action)
}

/** 매크로 목록 로드 */
export async function loadMacros(): Promise<SavedMacro[]> {
  const result = await chrome.storage.local.get(MACRO_STORAGE_KEY)
  return (result[MACRO_STORAGE_KEY] as SavedMacro[] | undefined) ?? []
}

/** 매크로 저장 */
export async function saveMacro(name: string, actions: AutoAction[]): Promise<SavedMacro> {
  const macros = await loadMacros()
  const macro: SavedMacro = {
    id: `macro-${Date.now()}`,
    name,
    actions,
    createdAt: Date.now(),
  }
  const updated = [macro, ...macros].slice(0, 50)
  await chrome.storage.local.set({ [MACRO_STORAGE_KEY]: updated })
  return macro
}

/** 매크로 삭제 */
export async function deleteMacro(id: string): Promise<void> {
  const macros = await loadMacros()
  const updated = macros.filter((m) => m.id !== id)
  await chrome.storage.local.set({ [MACRO_STORAGE_KEY]: updated })
}

/** DOM 액션을 content script에서 실행하는 함수 (chrome.scripting.executeScript 에 전달) */
export function buildExecuteFunction(action: AutoAction): () => { success: boolean; message: string } {
  // 이 함수는 직접 호출하지 않고, action 데이터를 background에 전달
  // background가 chrome.scripting.executeScript를 호출
  void action
  return () => ({ success: true, message: 'ok' })
}

/** 시스템 프롬프트 — AI에게 DOM 액션 생성을 지시 */
export const AUTOPILOT_SYSTEM_PROMPT = `You are a web automation assistant. The user will describe what they want to do on a web page.
You must respond with a JSON array of actions. Each action has:
- action: "click" | "type" | "scroll" | "wait" | "navigate"
- selector: CSS selector for the target element (for click, type)
- value: text to type (for type), URL (for navigate), direction "up"/"down" (for scroll)
- delay: milliseconds to wait (for wait, default 500)

Example response:
[
  {"action":"click","selector":"#search-input"},
  {"action":"type","selector":"#search-input","value":"AI"},
  {"action":"wait","delay":300},
  {"action":"click","selector":"#search-btn"}
]

IMPORTANT: Only respond with the JSON array, no other text. Use precise CSS selectors.`
