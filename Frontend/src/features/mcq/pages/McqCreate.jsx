import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import AppHeader from "../../../components/layout/AppHeader";
import {
  createMcqSession,
  getMcqHistory,
  getMcqPoolStatus,
  getMcqTopics,
} from "../services/mcq.api";
import "../../preparation/style/preparation.scss";
import "../style/mcq.scss";

const suggestedTopics = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Express.js",
  "MongoDB",
  "PostgreSQL",
  "DBMS",
  "Operating Systems",
  "Computer Networks",
  "Data Structures",
  "Algorithms",
  "System Design",
  "Python",
  "Java",
  "C++",
  "Git",
  "Docker",
  "AWS",
  "Aptitude",
  "Logical Reasoning",
  "Verbal Ability",
];
const categories = [
  "programming",
  "technical",
  "computer-science",
  "aptitude",
  "logical-reasoning",
  "verbal-ability",
  "system-design",
  "interview-preparation",
];

const McqCreate = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("JavaScript");
  const [category, setCategory] = useState("programming");
  const [difficulty, setDifficulty] = useState("mixed");
  const [questionCount, setQuestionCount] = useState(20);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(null);
  const [topics, setTopics] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    Promise.all([getMcqTopics(), getMcqHistory()])
      .then(([topicData, historyData]) => {
        setTopics(topicData.topics);
        setHistory(historyData.sessions);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!preparing) {
      return undefined;
    }
    const interval = setInterval(() => {
      getMcqPoolStatus(topic, category)
        .then((data) => {
          setPreparing(data);
          if (data.generation.state === "ready") {
            clearInterval(interval);
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [preparing, topic, category]);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await createMcqSession({
        topic,
        category,
        difficulty,
        questionCount,
        timerEnabled,
      });
      if (data.status === "preparing") {
        setPreparing(data);
      } else {
        navigate(`/mcq/${data.session._id}`);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to prepare your MCQ test.",
      );
    } finally {
      setBusy(false);
    }
  };

  const topicSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const available = topics
    .filter((item) => item.canonicalTopic.includes(topicSlug))
    .reduce((sum, item) => sum + item.count, 0);
  const topicOptions = [
    ...new Set([
      ...suggestedTopics,
      ...topics.map((item) => item.canonicalTopic),
    ]),
  ];

  return (
    <div className="prep-page">
      <AppHeader />
      <main className="prep-main mcq-create">
        <header className="prep-heading">
          <p>Fast database-backed assessment</p>
          <h1>MCQ practice</h1>
          <span>
            Test your knowledge and identify the areas you need to improve.
          </span>
        </header>
        {error && <div className="prep-error">{error}</div>}

        {preparing && (
          <section className="prep-card mcq-preparing">
            <h2>
              {preparing.generation?.state === "ready"
                ? "Practice is ready"
                : "Preparing question pool..."}
            </h2>
            <p>
              {preparing.message ||
                `${topic} questions are being prepared in the background.`}
            </p>
            <div className="prep-actions">
              <button
                className="prep-primary"
                disabled={preparing.generation?.state !== "ready" || busy}
                onClick={start}
              >
                Start practice
              </button>
              <button
                className="prep-secondary"
                onClick={() => setPreparing(null)}
              >
                Change topic
              </button>
            </div>
          </section>
        )}

        {!preparing && (
          <section className="prep-card prep-list">
            <div className="prep-field">
              <label htmlFor="mcq-topic">Topic</label>
              <input
                id="mcq-topic"
                list="mcq-topics"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
              />
              <datalist id="mcq-topics">
                {topicOptions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <small>
                {available
                  ? `${available} approved questions available`
                  : "A new pool can be prepared in the background"}
              </small>
            </div>
            <div className="prep-grid">
              <div className="prep-field">
                <label>Category</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="prep-field">
                <label>Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                >
                  {["mixed", "easy", "medium", "hard"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="prep-field">
                <label>Questions</label>
                <select
                  value={questionCount}
                  onChange={(event) =>
                    setQuestionCount(Number(event.target.value))
                  }
                >
                  {[10, 20, 30].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <label className="mcq-toggle">
                <input
                  type="checkbox"
                  checked={timerEnabled}
                  onChange={(event) => setTimerEnabled(event.target.checked)}
                />{" "}
                Per-question timer
              </label>
            </div>
            <button
              className="prep-primary"
              disabled={busy || !topic.trim()}
              onClick={start}
            >
              {busy ? "Preparing your test..." : "Start practice"}
            </button>
          </section>
        )}

        {history.length > 0 && (
          <section>
            <div className="prep-heading">
              <p>Your assessments</p>
              <h2>Recent MCQ tests</h2>
            </div>
            <div className="prep-grid">
              {history.slice(0, 6).map((item) => (
                <button
                  className="prep-card mcq-history"
                  key={item._id}
                  onClick={() =>
                    navigate(
                      item.status === "completed"
                        ? `/mcq/${item._id}/result`
                        : `/mcq/${item._id}`,
                    )
                  }
                >
                  <strong>{item.displayTopic}</strong>
                  <span>
                    {item.difficulty} · {item.status}
                  </span>
                  {item.status === "completed" && <b>{item.score}%</b>}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default McqCreate;
