import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import AppHeader from "../../../components/layout/AppHeader";
import { useTimer } from "../../preparation/hooks/useTimer";
import { getMcqSession, submitMcqAnswer } from "../services/mcq.api";
import "../../preparation/style/preparation.scss";
import "../style/mcq.scss";

const Runner = ({ session, onSubmit, busy }) => {
  const question = session.currentQuestion;
  const [selected, setSelected] = useState(null);
  const expire = useCallback(
    () =>
      onSubmit({
        questionId: question._id,
        selectedOption: selected,
        submittedAutomatically: true,
      }),
    [onSubmit, question._id, selected],
  );
  const { remaining, progress, start } = useTimer({
    duration: question.remainingSeconds ?? question.timeLimit,
    onComplete: expire,
  });
  const answeredPercent =
    (session.currentQuestionIndex / session.questionCount) * 100;

  useEffect(() => {
    if (session.timerEnabled) start();
  }, [session.timerEnabled, start]);

  return (
    <div className="practice-runner">
      <section
        className="focused-progress"
        aria-label={`Question ${session.currentQuestionIndex + 1} of ${session.questionCount}`}
      >
        <div>
          <span>
            Question {session.currentQuestionIndex + 1} of{" "}
            {session.questionCount}
          </span>
          <strong>{Math.round(answeredPercent)}%</strong>
        </div>
        <div>
          <span style={{ width: `${answeredPercent}%` }} />
        </div>
      </section>
      <div className="practice-runner__body">
        {session.timerEnabled && (
          <section className="timer mcq-timer" aria-live="polite">
            <span>Time remaining</span>
            <strong>
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:
              {String(remaining % 60).padStart(2, "0")}
            </strong>
            <div className="timer__track">
              <span style={{ width: `${progress}%` }} />
            </div>
          </section>
        )}
        <section className="prep-card mcq-question">
          <div className="prep-meta">
            <span>{question.difficulty}</span>
            <span>· {question.topic}</span>
            <span>· {question.subtopic}</span>
          </div>
          <h1>{question.question}</h1>
          <div className="mcq-options">
            {question.options.map((option, index) => (
              <button
                type="button"
                className={selected === index ? "selected" : ""}
                aria-pressed={selected === index}
                key={option}
                onClick={() => setSelected(index)}
              >
                <b>{String.fromCharCode(65 + index)}</b>
                <span>{option}</span>
              </button>
            ))}
          </div>
          <div className="practice-actions">
            <span>Select one answer to continue</span>
            <button
              className="prep-primary"
              disabled={selected === null || busy}
              onClick={() =>
                onSubmit({
                  questionId: question._id,
                  selectedOption: selected,
                  submittedAutomatically: false,
                })
              }
            >
              {busy ? "Saving answer..." : "Submit answer"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

const McqSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      getMcqSession(id)
        .then(({ session: nextSession }) => {
          if (nextSession.status === "completed")
            navigate(`/mcq/${id}/result`, { replace: true });
          else setSession(nextSession);
        })
        .catch((requestError) =>
          setError(
            requestError.response?.data?.message ||
              "Unable to restore the MCQ test.",
          ),
        )
        .finally(() => setLoading(false)),
    [id, navigate],
  );

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(
    async (payload) => {
      if (busy) return;
      setBusy(true);
      setError("");
      try {
        const { session: nextSession } = await submitMcqAnswer(id, payload);
        if (nextSession.status === "completed") navigate(`/mcq/${id}/result`);
        else setSession(nextSession);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to submit the answer.",
        );
        if (requestError.response?.status === 409) load();
      } finally {
        setBusy(false);
      }
    },
    [busy, id, load, navigate],
  );

  return (
    <div className="prep-page mcq-session-page">
      <AppHeader />
      <main className="prep-main mcq-session">
        {loading ? (
          <div className="prep-state">Restoring your MCQ test...</div>
        ) : error && !session ? (
          <div className="prep-state">
            <h1>Test unavailable</h1>
            <p>{error}</p>
            <button className="prep-secondary" onClick={load}>
              Retry
            </button>
          </div>
        ) : session ? (
          <>
            <header className="prep-heading">
              <p>MCQ practice · {session.category}</p>
              <h2>{session.displayTopic}</h2>
            </header>
            {error && <div className="prep-error">{error}</div>}
            <Runner
              key={session.currentQuestion._id}
              session={session}
              onSubmit={submit}
              busy={busy}
            />
          </>
        ) : null}
      </main>
    </div>
  );
};

export default McqSession;
