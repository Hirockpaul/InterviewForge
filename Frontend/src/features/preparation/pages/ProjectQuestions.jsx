import { useState } from "react";
import { useNavigate } from "react-router";
import AppHeader from "../../../components/layout/AppHeader";
import { useInterview } from "../../interview/hooks/useInterview";
import SaveQuestionButton from "../components/SaveQuestionButton";
import {
  generateProjectQuestions,
  getProjects,
} from "../services/preparation.api";
import { startMockInterview } from "../../mockInterview/services/mockInterview.api";
import "../style/preparation.scss";

const levels = ["beginner", "intermediate", "advanced", "deep-dive"];

const ProjectQuestions = () => {
  const navigate = useNavigate();
  const { reports } = useInterview();
  const [planId, setPlanId] = useState("");
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [questionSet, setQuestionSet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const effectivePlanId = planId || reports[0]?._id || "";

  const detect = async () => {
    setLoading(true);
    setError("");
    setQuestionSet(null);
    try {
      const data = await getProjects(effectivePlanId);
      setProjects(data.projects);
      setSelected(data.projects[0] || null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to detect projects from this plan.",
      );
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      const data = await generateProjectQuestions({
        interviewPlanId: effectivePlanId,
        projectName: selected.name,
        projectContext: selected.context,
      });
      setQuestionSet(data.questionSet);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "AI could not create project questions. Try again.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const mock = async () => {
    try {
      const data = await startMockInterview(effectivePlanId, {
        projectName: selected?.name || "",
        projectContext: selected?.context || "",
      });
      navigate(`/mock-interview/${data.mockInterview._id}`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to start mock interview.",
      );
    }
  };
  return (
    <div className="prep-page">
      <AppHeader />
      <main className="prep-main">
        <header className="prep-heading">
          <p>Resume deep dive</p>
          <h1>Project interview</h1>
          <span>
            Generate role-relevant questions grounded only in projects found in
            your candidate information.
          </span>
        </header>
        {error && (
          <div className="prep-error">
            {error}
            <button className="prep-secondary" onClick={detect}>
              Retry
            </button>
          </div>
        )}
        <section className="prep-card prep-controls">
          <div className="prep-field">
            <label>Interview plan</label>
            <select
              value={effectivePlanId}
              onChange={(e) => {
                setPlanId(e.target.value);
                setProjects([]);
                setSelected(null);
                setQuestionSet(null);
              }}
            >
              <option value="">Select a plan</option>
              {reports.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
          <button
            className="prep-primary"
            disabled={!effectivePlanId || loading}
            onClick={detect}
          >
            {loading
              ? "Analyzing your resume for projects..."
              : "Find my projects"}
          </button>
        </section>
        {!loading && projects.length === 0 && (
          <div className="prep-card prep-state">
            <h2>No projects loaded</h2>
            <p>
              Select an interview plan to find projects explicitly present in
              its resume or self-description.
            </p>
          </div>
        )}
        {projects.length > 0 && (
          <section className="prep-card prep-controls">
            <div className="prep-field">
              <label>Project</label>
              <select
                value={selected?.name || ""}
                onChange={(e) => {
                  setSelected(projects.find((p) => p.name === e.target.value));
                  setQuestionSet(null);
                }}
              >
                {projects.map((p) => (
                  <option key={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <button
              className="prep-primary"
              disabled={!selected || generating}
              onClick={generate}
            >
              {generating
                ? "Analyzing your project and creating technical questions..."
                : "Generate questions"}
            </button>
            <button className="prep-secondary" onClick={mock}>
              Start mock interview
            </button>
          </section>
        )}
        {questionSet &&
          levels.map((level) => {
            const qs = questionSet.questions.filter(
              (q) => q.difficulty === level,
            );
            return qs.length ? (
              <section className="difficulty-group" key={level}>
                <h2>{level.replace("-", " ")}</h2>
                <div className="prep-list">
                  {qs.map((q, index) => (
                    <article className="prep-card prep-question" key={q._id}>
                      <span className="prep-question__number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{q.question}</h3>
                        <div className="prep-meta">
                          <span>{q.topic}</span>
                          <span>· {q.difficulty}</span>
                        </div>
                      </div>
                      <div className="prep-actions">
                        <button
                          className="prep-primary"
                          onClick={() =>
                            navigate("/focused-practice", {
                              state: { interviewPlanId: effectivePlanId },
                            })
                          }
                        >
                          Generate practice session
                        </button>
                        <SaveQuestionButton
                          question={{
                            questionText: q.question,
                            category: "project",
                            topic: q.topic,
                            difficulty: q.difficulty,
                            source: "project",
                            sourceId: q._id,
                          }}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null;
          })}
      </main>
    </div>
  );
};
export default ProjectQuestions;
