// widgets/voice-panel/VoicePanel.tsx — 음성 입출력 패널

import { useState, useCallback, useRef, useEffect } from 'react'

interface Props {
  onClose: () => void
}

type Lang = 'ko-KR' | 'en-US'

const LANG_LABELS: Record<Lang, string> = {
  'ko-KR': 'Korean',
  'en-US': 'English',
}

// SpeechRecognition 타입 선언
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
    SpeechRecognition: new () => SpeechRecognitionInstance
  }
}

export function VoicePanel({ onClose }: Props) {
  // STT state
  const [sttLang, setSttLang] = useState<Lang>('ko-KR')
  const [recording, setRecording] = useState(false)
  const [sttResult, setSttResult] = useState('')
  const [sttError, setSttError] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // TTS state
  const [ttsLang, setTtsLang] = useState<Lang>('ko-KR')
  const [ttsText, setTtsText] = useState('')
  const [ttsRate, setTtsRate] = useState(1)
  const [speaking, setSpeaking] = useState(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      speechSynthesis.cancel()
    }
  }, [])

  // STT
  const handleStartRecording = useCallback(() => {
    setSttError('')
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
    if (!SpeechRecognition) {
      setSttError('Speech recognition is not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = sttLang

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setSttResult(transcript)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setSttError(`Recognition error: ${event.error}`)
      setRecording(false)
    }

    recognition.onend = () => {
      setRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setRecording(true)
  }, [sttLang])

  const handleStopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setRecording(false)
  }, [])

  const handleSendToChat = useCallback(async () => {
    if (!sttResult.trim()) return
    try {
      await navigator.clipboard.writeText(sttResult)
    } catch {
      // fallback
    }
  }, [sttResult])

  // TTS
  const handleSpeak = useCallback(() => {
    if (!ttsText.trim()) return
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(ttsText)
    utterance.lang = ttsLang
    utterance.rate = ttsRate

    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    setSpeaking(true)
    speechSynthesis.speak(utterance)
  }, [ttsText, ttsLang, ttsRate])

  const handleStopSpeaking = useCallback(() => {
    speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-header">
        <button className="header-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="panel-icon panel-icon-purple">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <span className="panel-title">Voice I/O</span>
      </div>

      {/* STT Section */}
      <div className="voice-section">
        <div className="voice-section-title">Speech to Text (STT)</div>

        {/* Language selector */}
        <div className="voice-lang-row">
          <span className="voice-label">Language:</span>
          <div className="voice-lang-btns">
            {(Object.keys(LANG_LABELS) as Lang[]).map((lang) => (
              <button
                key={lang}
                className={`voice-lang-btn ${sttLang === lang ? 'voice-lang-active' : ''}`}
                onClick={() => setSttLang(lang)}
                disabled={recording}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>

        {/* Record button */}
        <div className="voice-record-area">
          {recording ? (
            <button className="voice-record-btn voice-record-active" onClick={handleStopRecording}>
              <span className="voice-record-dot" />
              <span>Stop Recording</span>
            </button>
          ) : (
            <button className="voice-record-btn" onClick={handleStartRecording}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              </svg>
              <span>Start Recording</span>
            </button>
          )}
        </div>

        {sttError && <div className="error-box">{sttError}</div>}

        {/* STT Result */}
        {sttResult && (
          <div className="voice-result-box">
            <div className="voice-result-header">
              <span className="voice-result-label">Recognized Text</span>
              <button className="btn-ghost btn-xs" onClick={handleSendToChat}>
                Copy
              </button>
            </div>
            <div className="voice-result-content">{sttResult}</div>
          </div>
        )}
      </div>

      <div className="voice-divider" />

      {/* TTS Section */}
      <div className="voice-section">
        <div className="voice-section-title">Text to Speech (TTS)</div>

        {/* Language selector */}
        <div className="voice-lang-row">
          <span className="voice-label">Language:</span>
          <div className="voice-lang-btns">
            {(Object.keys(LANG_LABELS) as Lang[]).map((lang) => (
              <button
                key={lang}
                className={`voice-lang-btn ${ttsLang === lang ? 'voice-lang-active' : ''}`}
                onClick={() => setTtsLang(lang)}
                disabled={speaking}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>

        {/* Speed control */}
        <div className="voice-speed-row">
          <span className="voice-label">Speed: {ttsRate}x</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.25"
            value={ttsRate}
            onChange={(e) => setTtsRate(parseFloat(e.target.value))}
            className="voice-speed-slider"
          />
        </div>

        {/* Text input */}
        <textarea
          className="field-textarea field-textarea-sm"
          value={ttsText}
          onChange={(e) => setTtsText(e.target.value)}
          placeholder="Enter text to speak..."
          rows={3}
        />

        {/* Play/Stop */}
        <div className="voice-tts-actions">
          {speaking ? (
            <button className="btn-primary btn-full" onClick={handleStopSpeaking}>
              Stop Speaking
            </button>
          ) : (
            <button
              className="btn-primary btn-full"
              onClick={handleSpeak}
              disabled={!ttsText.trim()}
            >
              Speak
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
