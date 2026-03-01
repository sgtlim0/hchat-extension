// lib/claude.ts  –  AWS Bedrock Claude API 클라이언트 (스트리밍 지원)

import { signRequest } from './aws-sigv4'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsRegion?: string
  model?: string
  systemPrompt?: string
  maxTokens?: number
  onChunk?: (text: string) => void
}

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-6-v1:0'
const DEFAULT_REGION = 'us-east-1'

/** base64 → UTF-8 string (브라우저에서 한글 등 멀티바이트 안전) */
function b64toUtf8(b64: string): string {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder('utf-8').decode(bytes)
}

export async function chat(
  messages: Message[],
  opts: ChatOptions
): Promise<string> {
  const {
    awsAccessKeyId,
    awsSecretAccessKey,
    awsRegion = DEFAULT_REGION,
    model = DEFAULT_MODEL,
    systemPrompt,
    maxTokens = 2048,
    onChunk,
  } = opts

  const body: Record<string, unknown> = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    messages,
  }
  if (systemPrompt) body.system = systemPrompt

  const useStream = !!onChunk
  const encodedModel = encodeURIComponent(model)
  const endpoint = useStream ? 'invoke-with-response-stream' : 'invoke'
  const url = `https://bedrock-runtime.${awsRegion}.amazonaws.com/model/${encodedModel}/${endpoint}`

  const bodyStr = JSON.stringify(body)

  console.log('[HChat] Sending to Bedrock:', { model, region: awsRegion, streaming: useStream })

  const signedHeaders = await signRequest({
    method: 'POST',
    url,
    headers: { 'content-type': 'application/json' },
    body: bodyStr,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion,
    service: 'bedrock',
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: signedHeaders,
    body: bodyStr,
  })

  if (!res.ok) {
    const errText = await res.text()
    let errMsg = `HTTP ${res.status}`
    try {
      const errJson = JSON.parse(errText)
      errMsg = errJson.message ?? errJson.Message ?? errMsg
    } catch {
      errMsg = errText || errMsg
    }
    console.error('[HChat] Bedrock error:', errMsg)
    throw new Error(errMsg)
  }

  // 스트리밍 모드 (Bedrock event stream)
  if (useStream && res.body) {
    return readBedrockStream(res.body, onChunk)
  }

  // 일반 모드
  const data = await res.json()
  console.log('[HChat] Bedrock response:', { model: data.model, usage: data.usage })
  return data.content?.[0]?.text ?? ''
}

/**
 * AWS Event Stream 바이너리 프로토콜 파서
 * 각 메시지 구조:
 *   [4B totalLen][4B headersLen][4B preludeCRC][headers...][payload...][4B msgCRC]
 */
async function readBedrockStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void
): Promise<string> {
  const reader = body.getReader()
  let fullText = ''
  let buffer = new Uint8Array(0)

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // 버퍼에 새 데이터 병합
    const merged = new Uint8Array(buffer.length + value.length)
    merged.set(buffer)
    merged.set(value, buffer.length)
    buffer = merged

    // 완전한 이벤트 프레임 파싱
    while (buffer.length >= 12) {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      const totalLength = view.getUint32(0)
      const headersLength = view.getUint32(4)

      if (buffer.length < totalLength) break // 불완전한 프레임 — 다음 청크 대기

      // payload = totalLength - prelude(8) - preludeCRC(4) - headers - msgCRC(4)
      const payloadOffset = 12 + headersLength
      const payloadLength = totalLength - headersLength - 16

      if (payloadLength > 0) {
        const payload = buffer.slice(payloadOffset, payloadOffset + payloadLength)
        const payloadStr = new TextDecoder('utf-8').decode(payload)

        try {
          const event = JSON.parse(payloadStr)
          if (event.bytes) {
            const decoded = b64toUtf8(event.bytes)
            const inner = JSON.parse(decoded)
            if (inner.type === 'content_block_delta' && inner.delta?.text) {
              fullText += inner.delta.text
              onChunk(inner.delta.text)
            }
          }
        } catch {
          // 비-JSON 페이로드 (헤더 전용 프레임 등) — 무시
        }
      }

      // 다음 프레임으로 버퍼 이동
      buffer = buffer.slice(totalLength)
    }
  }

  console.log('[HChat] Stream complete, total length:', fullText.length)
  return fullText
}
