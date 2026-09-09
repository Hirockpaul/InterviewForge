import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import AppHeader from "../../../components/layout/AppHeader";
import { useInterview } from "../../interview/hooks/useInterview";
import {
  createFocusedSession,
  listFocusedSessions,
} from "../services/focusedPractice.api";
import "../../preparation/style/preparation.scss";
import "../style/focused-practice.scss";

const sourceOptions = [
  {
    value: "resume",
    label: "Upload Resume",
    detail: "Skills, experience and projects",
  },
  {
    value: "project",
    label: "Project Description",
    detail: "Architecture and trade-offs",
  },
  {
    value: "job-description",
    label: "Job Description",
    detail: "Role skills and expectations",
  },
  { value: "topic", label: "Custom Topic", detail: "A technology or concept" },
  {
    value: "interview-plan",
    label: "Existing Plan",
    detail: "Reuse context you already added",
  },
];
const modeOptions = [
  {
    value: "technical",
    label: "Technical",
    detail: "Knowledge and problem solving",
  },
  {
    value: "behavioral",
    label: "Behavioral",
    detail: "Communication and experience",
  },
  {
    value: "project",
    label: "Project",
    detail: "Decisions, ownership and trade-offs",
  },
  {
    value: "mixed",
    label: "Mixed",
    detail: "Technical, behavioral and project",
  },
];
const timing = [
  ["Easy", "8 questions", "60 sec each"],
  ["Medium", "8 questions", "90 sec each"],
  ["Hard", "8 questions", "120 sec each"],
  ["Total", "24 AI-generated", "one at a time"],
];

const FocusedPracticeCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { reports } = useInterview();
  const incomingPlanId = location.state?.interviewPlanId || "";
  const [sourceType, setSourceType] = useState(
    incomingPlanId ? "interview-plan" : "topic",
  );
  const [sourceText, setSourceText] = useState("");
  const [resume, setResume] = useState(null);
  const [planId, setPlanId] = useState(incomingPlanId);
  const [mode, setMode] = useState("technical");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    listFocusedSessions()
      .then((data) => setSessions(data.sessions))
      .catch(() => {});
  }, []);

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const { session } = await createFocusedSession({
        sourceType,
        sourceText,
        mode,
        interviewPlanId: planId,
        resume,
      });
      navigate(`/focused-practice/${session._id}`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to generate your technical questions.",
      );
    } finally {
      setBusy(false);
    }
  };
  const valid =
    sourceType === "resume"
      ? resume
      : sourceType === "interview-plan"
        ? planId
        : sourceText.trim().length >= 2;
  const currentSource = sourceOptions.find(
    (option) => option.value === sourceType,
  );
  const placeholder =
    sourceType === "topic"
      ? "e.g. Node.js, JavaScript event loop, system design, SQL joins…"
      : sourceType === "project"
        ? "Describe the project, architecture, technologies, challenges and your role…"
        : "Paste the job description, responsibilities and requirements…";

  return (
    <div className="prep-page">
      <AppHeader />
      <main className="prep-main focused-create">
        <header className="prep-heading">
          <p>Personalized practice</p>
          <h1>Technical Questions</h1>
          <span>
            Practice interview questions tailored to your resume, projects, job
            description, topic, or existing interview plan.
          </span>
        </header>
        {error && (
          <div className="prep-error" role="alert">
            {error}
            <button className="prep-secondary" onClick={() => setError("")}>
              Dismiss
            </button>
          </div>
        )}

        <section
          className="prep-card focused-section"
          aria-labelledby="source-title"
        >
          <div className="focused-section__heading">
            <span>01</span>
            <div>
              <h2 id="source-title">Choose your source</h2>
              <p>
                This gives InterviewForge the context for relevant, non-generic
                questions.
              </p>
            </div>
          </div>
          <div className="focused-choice-grid">
            {sourceOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={sourceType === option.value ? "selected" : ""}
                aria-pressed={sourceType === option.value}
                onClick={() => {
                  setSourceType(option.value);
                  setError("");
                }}
              >
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </button>
            ))}
          </div>
          {sourceType === "resume" ? (
            <div className="prep-field focused-input">
              <label htmlFor="focused-resume">
                Resume PDF <span>Maximum 3 MB</span>
              </label>
              <input
                id="focused-resume"
                type="file"
                accept="application/pdf"
                onChange={(event) => setResume(event.target.files?.[0] || null)}
              />
              {resume && (
                <small className="focused-file">✓ {resume.name}</small>
              )}
            </div>
          ) : sourceType === "interview-plan" ? (
            <div className="prep-field focused-input">
              <label htmlFor="focused-plan">Existing interview plan</label>
              <select
                id="focused-plan"
                value={planId}
                onChange={(event) => setPlanId(event.target.value)}
              >
                <option value="">Select a plan</option>
                {reports.map((report) => (
                  <option key={report._id} value={report._id}>
                    {report.title}
                  </option>
                ))}
              </select>
              {reports.length > 0 && (
                <small>
                  Your saved resume, candidate details and job description will
                  be reused.
                </small>
              )}
            </div>
          ) : (
            <div className="prep-field focused-input">
              <label htmlFor="focused-source">{currentSource.label}</label>
              <textarea
                id="focused-source"
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder={placeholder}
              />
              <small>
                Provide context, not an individual interview question.
                InterviewForge generates the questions.
              </small>
            </div>
          )}
        </section>

        <section
          className="prep-card focused-section"
          aria-labelledby="mode-title"
        >
          <div className="focused-section__heading">
            <span>02</span>
            <div>
              <h2 id="mode-title">Choose a practice mode</h2>
              <p>
                Technical is selected by default. Change it to shape the
                interview skills being tested.
              </p>
            </div>
          </div>
          <div className="focused-choice-grid focused-choice-grid--modes">
            {modeOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={mode === option.value ? "selected" : ""}
                aria-pressed={mode === option.value}
                onClick={() => setMode(option.value)}
              >
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </button>
            ))}
          </div>
        </section>

        <section
          className="prep-card focused-section"
          aria-labelledby="structure-title"
        >
          <div className="focused-section__heading">
            <span>03</span>
            <div>
              <h2 id="structure-title">Difficulty &amp; timing</h2>
              <p>
                Your session contains 24 AI-generated questions, progressing
                from foundational to challenging.
              </p>
            </div>
          </div>
          <div className="focused-distribution">
            {timing.map(([label, count, limit]) => (
              <div key={label} className={label === "Total" ? "is-total" : ""}>
                <span>{label}</span>
                <strong>{count}</strong>
                <small>{limit}</small>
              </div>
            ))}
          </div>
          <div className="focused-flow" aria-label="Session generation flow">
            <span>Source</span>
            <i>→</i>
            <span>
              {modeOptions.find((option) => option.value === mode)?.label}
            </span>
            <i>→</i>
            <span>Generate 24 questions</span>
            <i>→</i>
            <span>Timed practice</span>
          </div>
          <button
            className="prep-primary focused-generate"
            disabled={!valid || busy}
            onClick={create}
          >
            {busy
              ? "Generating your personalized questions…"
              : "Generate Practice Session"}
          </button>
        </section>

        {sessions.length > 0 && (
          <section>
            <div className="prep-heading focused-recent-heading">
              <p>Continue where you left off</p>
              <h2>Recent technical sessions</h2>
            </div>
            <div className="prep-grid">
              {sessions.slice(0, 6).map((session) => (
                <button
                  className="prep-card focused-session-link"
                  key={session._id}
                  onClick={() =>
                    navigate(
                      session.status === "completed"
                        ? `/focused-practice/${session._id}/report`
                        : `/focused-practice/${session._id}`,
                    )
                  }
                >
                  <strong>{session.displayTopic}</strong>
                  <span>
                    {session.mode} · {session.status} ·{" "}
                    {session.currentQuestionIndex}/24
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default FocusedPracticeCreate;
