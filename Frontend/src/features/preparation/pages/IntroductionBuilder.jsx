import { useEffect, useState } from "react";
import AppHeader from "../../../components/layout/AppHeader";
import { useInterview } from "../../interview/hooks/useInterview";
import {
  deleteIntroduction,
  generateIntroduction,
  getIntroductions,
  recordIntroductionPractice,
  updateIntroduction,
} from "../services/preparation.api";
import "../style/preparation.scss";

const IntroductionBuilder = () => {
  const { reports } = useInterview();
  const [items, setItems] = useState([]);
  const [planId, setPlanId] = useState("");
  const [role, setRole] = useState("");
  const [duration, setDuration] = useState(60);
  const [tone, setTone] = useState("natural");
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getIntroductions()
      .then((data) => setItems(data.introductions))
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message ||
            "Unable to load introductions.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const effectivePlanId = planId || reports[0]?._id || "";
  const effectiveRole =
    role ||
    reports.find((report) => report._id === effectivePlanId)?.title ||
    "";
  const select = (item) => {
    setSelected(item);
    setContent(item.content);
    setPlanId(item.interviewPlan);
    setRole(item.targetRole);
    setDuration(item.duration);
    setTone(item.tone);
    setSuccess("");
  };
  const generate = async () => {
    setGenerating(true);
    setError("");
    setSuccess("");
    try {
      const { introduction } = await generateIntroduction({
        interviewPlanId: effectivePlanId,
        targetRole: effectiveRole,
        duration,
        tone,
      });
      setItems((currentItems) => [introduction, ...currentItems]);
      select(introduction);
      setSuccess("Introduction generated and saved.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "AI could not generate an introduction. Try again.",
      );
    } finally {
      setGenerating(false);
    }
  };
  const save = async () => {
    try {
      const { introduction } = await updateIntroduction(selected._id, content);
      setItems((currentItems) =>
        currentItems.map((item) =>
          item._id === introduction._id ? introduction : item,
        ),
      );
      setSelected(introduction);
      setSuccess("Changes saved.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to save changes.",
      );
    }
  };
  const remove = async (item) => {
    try {
      await deleteIntroduction(item._id);
      setItems((currentItems) =>
        currentItems.filter((current) => current._id !== item._id),
      );
      if (selected?._id === item._id) {
        setSelected(null);
        setContent("");
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to delete introduction.",
      );
    }
  };
  const practiced = async () => {
    try {
      await recordIntroductionPractice(selected._id);
      setSuccess("Practice completed and added to your activity.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to record practice.",
      );
    }
  };
  return (
    <div className="prep-page">
      <AppHeader />
      <main className="prep-main">
        <header className="prep-heading">
          <p>Your opening story</p>
          <h1>Tell me about yourself</h1>
          <span>
            Build a truthful introduction using only the candidate information
            already in an interview plan.
          </span>
        </header>
        {error && (
          <div className="prep-error">
            {error}
            <button className="prep-secondary" onClick={() => setError("")}>
              Dismiss
            </button>
          </div>
        )}
        {success && <div className="prep-success">{success}</div>}
        <section className="prep-card prep-controls">
          <div className="prep-field">
            <label>Interview plan</label>
            <select
              value={effectivePlanId}
              onChange={(e) => {
                setPlanId(e.target.value);
                setRole(
                  reports.find((r) => r._id === e.target.value)?.title || "",
                );
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
          <div className="prep-field">
            <label>Target role</label>
            <input
              value={effectiveRole}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div className="prep-field">
            <label>Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={120}>2 minutes</option>
            </select>
          </div>
          <div className="prep-field">
            <label>Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)}>
              {["professional", "confident", "natural"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <button
            className="prep-primary"
            disabled={
              !effectivePlanId || effectiveRole.trim().length < 2 || generating
            }
            onClick={generate}
          >
            {generating
              ? "Analyzing your profile and preparing your introduction..."
              : selected
                ? "Regenerate as new version"
                : "Generate introduction"}
          </button>
        </section>
        {selected && (
          <section className="prep-card prep-list">
            <div className="prep-field">
              <label>Introduction</label>
              <textarea
                className="intro-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="prep-actions">
              <button className="prep-primary" onClick={save}>
                Save edits
              </button>
              <button
                className="prep-secondary"
                onClick={() => navigator.clipboard.writeText(content)}
              >
                Copy
              </button>
              <button className="prep-secondary" onClick={practiced}>
                Mark practice complete
              </button>
            </div>
            <div className="prep-grid">
              <div>
                <h3>Why this works</h3>
                <ul>
                  {selected.whyItWorks.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Key points to remember</h3>
                <ul>
                  {selected.keyPoints.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
        <section>
          <div className="prep-heading">
            <p>Saved versions</p>
            <h2>My introductions</h2>
          </div>
          {loading ? (
            <div className="prep-state">
              Opening your saved introductions...
            </div>
          ) : items.length === 0 ? (
            <div className="prep-card prep-state">
              No introductions saved yet.
            </div>
          ) : (
            <div className="prep-grid">
              {items.map((i) => (
                <article className="prep-card" key={i._id}>
                  <h3>
                    {i.targetRole} —{" "}
                    {i.duration === 120 ? "2 min" : `${i.duration} sec`}
                  </h3>
                  <div className="prep-meta">
                    <span>{i.tone}</span>
                    <span>
                      · Updated {new Date(i.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="prep-actions">
                    <button className="prep-primary" onClick={() => select(i)}>
                      Open
                    </button>
                    <button
                      className="prep-secondary"
                      onClick={() => remove(i)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
export default IntroductionBuilder;
