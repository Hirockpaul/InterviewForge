import { useState } from "react";
import { saveQuestion, removeQuestion } from "../services/preparation.api";

const SaveQuestionButton = ({ question, initialId = null, onChange }) => {
  const [savedId, setSavedId] = useState(initialId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toggle = async () => {
    setBusy(true);
    setError("");
    try {
      if (savedId) {
        await removeQuestion(savedId);
        setSavedId(null);
        onChange?.(null);
      } else {
        const data = await saveQuestion(question);
        setSavedId(data.question._id);
        onChange?.(data.question);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update saved question.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="save-question-wrap">
      <button
        type="button"
        className="prep-secondary"
        onClick={toggle}
        disabled={busy}
      >
        {savedId ? "★ Saved" : "☆ Save question"}
      </button>
      {error && <small role="alert">{error}</small>}
    </span>
  );
};

export default SaveQuestionButton;
