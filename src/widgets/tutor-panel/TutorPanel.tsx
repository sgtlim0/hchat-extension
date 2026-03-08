// widgets/tutor-panel/TutorPanel.tsx — AI Tutor (Learning Mode)

import { useState, useCallback } from 'react'
import { useConfigStore } from '@/entities/config/config.store'
import { chat } from '@/lib/claude'

interface Props {
  onClose: () => void
}

interface Flashcard {
  front: string
  back: string
  flipped: boolean
}

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  selectedIndex?: number
}

type TutorTab = 'flashcards' | 'quiz'

export function TutorPanel({ onClose }: Props) {
  const [tab, setTab] = useState<TutorTab>('flashcards')
  const [pageText, setPageText] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Flashcards
  const [cards, setCards] = useState<Flashcard[]>([])
  const [currentCard, setCurrentCard] = useState(0)

  // Quiz
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [quizDone, setQuizDone] = useState(false)
  const [score, setScore] = useState(0)

  const config = useConfigStore((s) => ({
    awsAccessKeyId: s.awsAccessKeyId,
    awsSecretAccessKey: s.awsSecretAccessKey,
    awsRegion: s.awsRegion,
    model: s.model,
  }))

  const fetchPageText = useCallback((): Promise<{ text: string; title: string }> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'get-page-text' }, (resp) => {
        resolve({ text: resp?.text ?? '', title: resp?.title ?? '' })
      })
    })
  }, [])

  const handleLearnFromPage = useCallback(async () => {
    if (!config.awsAccessKeyId) {
      setError('AWS credentials required')
      return
    }

    setLoading(true)
    setError('')
    setCards([])
    setQuestions([])

    try {
      const { text, title } = await fetchPageText()
      if (!text) {
        setError('Could not extract page text')
        setLoading(false)
        return
      }

      setPageText(text)
      setPageTitle(title)

      const result = await chat(
        [{
          role: 'user',
          content: `Extract key concepts from the following text and create exactly 5 flashcards.

Text title: "${title}"
Text content (truncated):
${text.slice(0, 4000)}

Respond ONLY with a valid JSON array in this exact format (no markdown, no explanation):
[{"front":"Concept/Term","back":"Explanation/Definition"}]

Create 5 flashcards. Front should be a concept or term, back should be a clear explanation in Korean.`,
        }],
        { ...config, maxTokens: 1024 }
      )

      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        setError('AI returned invalid format')
        setLoading(false)
        return
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{ front: string; back: string }>
      setCards(parsed.map((c) => ({ ...c, flipped: false })))
      setCurrentCard(0)
      setTab('flashcards')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract concepts')
    } finally {
      setLoading(false)
    }
  }, [config, fetchPageText])

  const handleGenerateQuiz = useCallback(async () => {
    if (!config.awsAccessKeyId || !pageText) {
      setError(pageText ? 'AWS credentials required' : 'Load a page first')
      return
    }

    setLoading(true)
    setError('')
    setQuestions([])
    setQuizDone(false)
    setScore(0)

    try {
      const result = await chat(
        [{
          role: 'user',
          content: `Based on the following text, create exactly 5 multiple-choice quiz questions (4 options each).

Text title: "${pageTitle}"
Text content (truncated):
${pageText.slice(0, 4000)}

Respond ONLY with a valid JSON array (no markdown, no explanation):
[{"question":"Question text in Korean","options":["A","B","C","D"],"correctIndex":0}]

correctIndex is 0-based. Create 5 questions in Korean.`,
        }],
        { ...config, maxTokens: 1024 }
      )

      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        setError('AI returned invalid format')
        setLoading(false)
        return
      }

      const parsed = JSON.parse(jsonMatch[0]) as QuizQuestion[]
      setQuestions(parsed.map((q) => ({ ...q, selectedIndex: undefined })))
      setTab('quiz')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }, [config, pageText, pageTitle])

  const flipCard = (index: number) => {
    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, flipped: !c.flipped } : c))
    )
  }

  const selectAnswer = (qIndex: number, optIndex: number) => {
    if (quizDone) return
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, selectedIndex: optIndex } : q))
    )
  }

  const submitQuiz = () => {
    const correct = questions.filter((q) => q.selectedIndex === q.correctIndex).length
    setScore(correct)
    setQuizDone(true)
  }

  const allAnswered = questions.every((q) => q.selectedIndex !== undefined)

  return (
    <div className="tutor-panel">
      {/* Header */}
      <div className="tutor-header">
        <button className="tutor-back" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="tutor-title">AI Tutor</span>
      </div>

      {/* Action buttons */}
      <div className="tutor-actions">
        <button className="tutor-action-btn" onClick={handleLearnFromPage} disabled={loading}>
          {loading && cards.length === 0 ? 'Extracting...' : 'Learn from Page'}
        </button>
        <button className="tutor-action-btn tutor-action-btn-secondary" onClick={handleGenerateQuiz} disabled={loading || !pageText}>
          {loading && questions.length === 0 ? 'Generating...' : 'Generate Quiz'}
        </button>
      </div>

      {error && <div className="tutor-error">{error}</div>}
      {pageTitle && <div className="tutor-page-title">{pageTitle}</div>}

      {/* Tab switch */}
      {(cards.length > 0 || questions.length > 0) && (
        <div className="tutor-tabs">
          <button className={`tutor-tab ${tab === 'flashcards' ? 'tutor-tab-active' : ''}`} onClick={() => setTab('flashcards')}>
            Flashcards {cards.length > 0 ? `(${cards.length})` : ''}
          </button>
          <button className={`tutor-tab ${tab === 'quiz' ? 'tutor-tab-active' : ''}`} onClick={() => setTab('quiz')}>
            Quiz {questions.length > 0 ? `(${questions.length})` : ''}
          </button>
        </div>
      )}

      {/* Flashcards */}
      {tab === 'flashcards' && cards.length > 0 && (
        <div className="tutor-flashcards">
          <div className="tutor-card" onClick={() => flipCard(currentCard)}>
            <div className={`tutor-card-inner ${cards[currentCard].flipped ? 'tutor-card-flipped' : ''}`}>
              <div className="tutor-card-front">
                <div className="tutor-card-label">Q</div>
                <div className="tutor-card-text">{cards[currentCard].front}</div>
                <div className="tutor-card-hint">Click to flip</div>
              </div>
              <div className="tutor-card-back">
                <div className="tutor-card-label">A</div>
                <div className="tutor-card-text">{cards[currentCard].back}</div>
                <div className="tutor-card-hint">Click to flip back</div>
              </div>
            </div>
          </div>
          <div className="tutor-card-nav">
            <button
              className="tutor-nav-btn"
              onClick={() => setCurrentCard((p) => Math.max(0, p - 1))}
              disabled={currentCard === 0}
            >
              Prev
            </button>
            <span className="tutor-card-counter">{currentCard + 1} / {cards.length}</span>
            <button
              className="tutor-nav-btn"
              onClick={() => setCurrentCard((p) => Math.min(cards.length - 1, p + 1))}
              disabled={currentCard === cards.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Quiz */}
      {tab === 'quiz' && questions.length > 0 && (
        <div className="tutor-quiz">
          {quizDone && (
            <div className="tutor-score">
              Score: {score} / {questions.length} ({Math.round((score / questions.length) * 100)}%)
            </div>
          )}
          {questions.map((q, qi) => (
            <div key={qi} className="tutor-question">
              <div className="tutor-question-text">{qi + 1}. {q.question}</div>
              <div className="tutor-options">
                {q.options.map((opt, oi) => {
                  let cls = 'tutor-option'
                  if (quizDone) {
                    if (oi === q.correctIndex) cls += ' tutor-option-correct'
                    else if (oi === q.selectedIndex) cls += ' tutor-option-wrong'
                  } else if (oi === q.selectedIndex) {
                    cls += ' tutor-option-selected'
                  }
                  return (
                    <button key={oi} className={cls} onClick={() => selectAnswer(qi, oi)} disabled={quizDone}>
                      {String.fromCharCode(65 + oi)}. {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {!quizDone && (
            <button className="tutor-submit-btn" onClick={submitQuiz} disabled={!allAnswered}>
              Submit Answers
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {cards.length === 0 && questions.length === 0 && !loading && !error && (
        <div className="tutor-empty">
          Click "Learn from Page" to extract concepts from the current webpage and create flashcards.
        </div>
      )}
    </div>
  )
}
