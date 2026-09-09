import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import AppHeader from "../../../components/layout/AppHeader";
import SaveQuestionButton from "../../preparation/components/SaveQuestionButton";
import { getMcqResult } from "../services/mcq.api";
import "../../preparation/style/preparation.scss";
import "../style/mcq.scss";

function savedQuestionFrom(item) {
  const question = item.question;
  const selectedAnswer =
    item.selectedOption == null
      ? "No answer"
      : question.options[item.selectedOption];
  const category = ["aptitude", "logical-reasoning", "verbal-ability"].includes(
    question.category,
  )
    ? "hr"
    : question.category === "system-design"
      ? "system-design"
      : "technical";
  const difficulty =
    question.difficulty === "easy"
      ? "beginner"
      : question.difficulty === "hard"
        ? "advanced"
        : "intermediate";

  return {
    questionText: question.question,
    source: "other",
    category,
    topic: question.topic,
    difficulty,
    sourceId: question._id,
    personalAnswer: `Selected: ${selectedAnswer}\nCorrect: ${question.options[question.correctOption]}`,
    evaluationSnapshot: {
      score: item.correct ? 100 : 0,
      feedback: question.explanation,
      recommendedImprovement: item.correct
        ? "Review periodically to retain this concept."
        : "Review the explanation and retry a question from this subtopic.",
    },
  };
}

const McqResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openQuestion, setOpenQuestion] = useState(null);

  const load = () => {
    setLoading(true);
    getMcqResult(id)
      .then(({ result }) => setData(result))
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message || "Unable to load this result.",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getMcqResult(id)
      .then(({ result }) => setData(result))
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message || "Unable to load this result.",
        ),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="prep-page prep-state">
        Calculating your MCQ result...
      </main>
    );
  }
  if (!data) {
    return (
      <main className="prep-page prep-state">
        <h1>Result unavailable</h1>
        <p>{error}</p>
        <button className="prep-secondary" onClick={load}>
          Retry
        </button>
      </main>
    );
  }

  const incorrect = data.questionCount - data.correctCount;

  return (
    <div className="prep-page">
      <AppHeader />
      <main className="prep-main mcq-result">
        <header className="prep-heading">
          <p>MCQ practice complete</p>
          <h1>{data.displayTopic}</h1>
          <span>
            {data.category} · {data.difficulty}
          </span>
        </header>

        <section className="prep-card mcq-score">
          <div>
            <span>Score</span>
            <strong>
              {data.correctCount} / {data.questionCount}
            </strong>
            <b>{data.score}%</b>
          </div>
          <div className="metric-grid">
            <article>
              <span>Correct</span>
              <strong>{data.correctCount}</strong>
            </article>
            <article>
              <span>Incorrect</span>
              <strong>{incorrect}</strong>
            </article>
            <article>
              <span>Accuracy</span>
              <strong>{data.score}%</strong>
            </article>
          </div>
        </section>

        <section>
          <div className="prep-heading">
            <p>Difficulty breakdown</p>
            <h2>Performance</h2>
          </div>
          <div className="metric-grid">
            {Object.entries(data.result.difficultyPerformance).map(
              ([key, value]) => (
                <article key={key}>
                  <span>{key}</span>
                  <strong>{value == null ? "--" : `${value}%`}</strong>
                </article>
              ),
            )}
          </div>
        </section>

        <section className="prep-grid">
          <article className="prep-card">
            <h2>Strong areas</h2>
            {data.result.strongAreas.length ? (
              <ul>
                {data.result.strongAreas.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
            ) : (
              <p>Complete more tests to establish strong areas.</p>
            )}
          </article>
          <article className="prep-card">
            <h2>Weak areas</h2>
            {data.result.weakAreas.length ? (
              <>
                <ul>
                  {data.result.weakAreas.map((area) => (
                    <li key={area}>{area}</li>
                  ))}
                </ul>
                <p>
                  Recommended: practice 10 questions from your lowest-scoring
                  area.
                </p>
              </>
            ) : (
              <p>No subtopic scored below 60%.</p>
            )}
          </article>
        </section>

        <section>
          <div className="prep-heading">
            <p>Answer review</p>
            <h2>Questions</h2>
          </div>
          <div className="prep-list">
            {data.review.map((item, index) => {
              const question = item.question;
              const expanded = openQuestion === index;
              const selectedAnswer =
                item.selectedOption == null
                  ? "No answer"
                  : question.options[item.selectedOption];

              return (
                <article
                  className={`prep-card mcq-review ${item.correct ? "correct" : "incorrect"}`}
                  key={question._id}
                >
                  <button
                    className="mcq-review__head"
                    onClick={() => setOpenQuestion(expanded ? null : index)}
                  >
                    <span>
                      Q{index + 1} {item.correct ? "✓" : "✕"}
                    </span>
                    <strong>{question.question}</strong>
                  </button>
                  {expanded && (
                    <div className="mcq-review__body">
                      <div className="prep-meta">
                        <span>{question.difficulty}</span>
                        <span>· {question.subtopic}</span>
                      </div>
                      <p>
                        <b>Your answer:</b> {selectedAnswer}
                      </p>
                      <p>
                        <b>Correct answer:</b>{" "}
                        {question.options[question.correctOption]}
                      </p>
                      <p>
                        <b>Explanation:</b> {question.explanation}
                      </p>
                      <SaveQuestionButton question={savedQuestionFrom(item)} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <div className="prep-actions">
          <button className="prep-primary" onClick={() => navigate("/mcq")}>
            Start another test
          </button>
          <button
            className="prep-secondary"
            onClick={() => navigate("/progress")}
          >
            View progress
          </button>
        </div>
      </main>
    </div>
  );
};

export default McqResult;
