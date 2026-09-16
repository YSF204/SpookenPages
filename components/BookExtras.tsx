'use client';

import { BookOpen, ChevronDown, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { generateQuiz, generateSummary } from '@/lib/actions/ai.actions';
import { IBook, QuizQuestion } from '@/types';

const BookExtras = ({ book }: { book: IBook }) => {
  const [summary, setSummary] = useState(book.summary ?? '');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const loadSummary = async () => {
    if (summary || summaryLoading) return;

    setSummaryLoading(true);
    const result = await generateSummary(book._id);
    setSummaryLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setSummary(result.summary);
  };

  const loadQuiz = async () => {
    if (quizLoading) return;

    setQuizLoading(true);
    const result = await generateQuiz(book._id);
    setQuizLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setQuestions(result.questions);
    setAnswers({});
    setSubmitted(false);
  };

  const score = questions
    ? questions.filter((question, index) => answers[index] === question.answerIndex).length
    : 0;

  return (
    <div className="book-extras">
      <details className="book-extras-panel" onToggle={(event) => event.currentTarget.open && void loadSummary()}>
        <summary className="book-extras-summary-btn">
          <BookOpen className="size-4" aria-hidden="true" />
          Summary
          <ChevronDown className="book-extras-chevron size-4" aria-hidden="true" />
        </summary>

        <div className="book-extras-body">
          {summaryLoading && (
            <p className="book-extras-loading">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Reading the book...
            </p>
          )}
          {summary && <p className="whitespace-pre-wrap">{summary}</p>}
        </div>
      </details>

      <details className="book-extras-panel">
        <summary className="book-extras-summary-btn">
          <Sparkles className="size-4" aria-hidden="true" />
          Quiz me
          <ChevronDown className="book-extras-chevron size-4" aria-hidden="true" />
        </summary>

        <div className="book-extras-body">
          {!questions && (
            <button type="button" className="book-extras-action" onClick={() => void loadQuiz()} disabled={quizLoading}>
              {quizLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Writing questions...
                </>
              ) : (
                'Start quiz'
              )}
            </button>
          )}

          {questions?.map((question, questionIndex) => (
            <fieldset key={questionIndex} className="quiz-question">
              <legend className="quiz-legend">
                {questionIndex + 1}. {question.question}
              </legend>

              {question.options.map((option, optionIndex) => {
                const isPicked = answers[questionIndex] === optionIndex;
                const isAnswer = question.answerIndex === optionIndex;

                return (
                  <label
                    key={optionIndex}
                    className={`quiz-option ${
                      submitted && isAnswer
                        ? 'quiz-option-correct'
                        : submitted && isPicked
                          ? 'quiz-option-wrong'
                          : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${questionIndex}`}
                      checked={isPicked}
                      disabled={submitted}
                      onChange={() => setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))}
                    />
                    {option}
                  </label>
                );
              })}

              {submitted && question.explanation && (
                <p className="quiz-explanation">{question.explanation}</p>
              )}
            </fieldset>
          ))}

          {questions && !submitted && (
            <button
              type="button"
              className="book-extras-action"
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(answers).length < questions.length}
            >
              Check answers
            </button>
          )}

          {questions && submitted && (
            <div className="quiz-result">
              <p className="font-bold">
                You scored {score}/{questions.length}
              </p>
              <button type="button" className="book-extras-action" onClick={() => void loadQuiz()} disabled={quizLoading}>
                {quizLoading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="size-4" aria-hidden="true" />
                )}
                New questions
              </button>
            </div>
          )}
        </div>
      </details>
    </div>
  );
};

export default BookExtras;
