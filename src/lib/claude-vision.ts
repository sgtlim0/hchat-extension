// lib/claude-vision.ts — Bedrock Claude Vision API (이미지 분석)

import { signRequest } from './aws-sigv4'

export interface VisionOptions {
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsRegion?: string
  model?: string
  maxTokens?: number
  onChunk?: (text: string) => void
}

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-6'
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

/**
 * Claude Vision API 호출 — 이미지 + 텍스트 프롬프트
 */
export async function chatWithImage(
  imageBase64: string,
  prompt: string,
  opts: VisionOptions
): Promise<string> {
  const {
    awsAccessKeyId,
    awsSecretAccessKey,
    awsRegion = DEFAULT_REGION,
    model = DEFAULT_MODEL,
    maxTokens = 2048,
    onChunk,
  } = opts

  // data:image/png;base64, 접두사 제거
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')

  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: cleanBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  }

  const useStream = !!onChunk
  const encodedModel = encodeURIComponent(model)
  const endpoint = useStream ? 'invoke-with-response-stream' : 'invoke'
  const url = `https://bedrock-runtime.${awsRegion}.amazonaws.com/model/${encodedModel}/${endpoint}`
  const bodyStr = JSON.stringify(body)

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
    throw new Error(errMsg)
  }

  if (useStream && res.body) {
    return readBedrockStream(res.body, onChunk)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

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

    const merged = new Uint8Array(buffer.length + value.length)
    merged.set(buffer)
    merged.set(value, buffer.length)
    buffer = merged

    while (buffer.length >= 12) {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      const totalLength = view.getUint32(0)
      const headersLength = view.getUint32(4)

      if (buffer.length < totalLength) break

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
          // ignore non-JSON payloads
        }
      }

      buffer = buffer.slice(totalLength)
    }
  }

  return fullText
}
