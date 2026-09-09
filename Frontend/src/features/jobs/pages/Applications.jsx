import { Link } from "react-router";
import AppHeader from "../../../components/layout/AppHeader";
import "../style/jobs.scss";

const Applications = () => (
  <div className="jobs-page">
    <AppHeader />
    <main className="jobs-main jobs-library">
      <header className="jobs-page-heading">
        <p className="jobs-eyebrow">Career workspace</p>
        <h1>Applications</h1>
        <p>A focused place for the opportunities you decide to pursue.</p>
      </header>
      <div className="jobs-state">
        <h2>No applications tracked yet</h2>
        <p>
          Application tracking is not connected yet. Browse current roles and
          prepare for the ones that matter.
        </p>
        <Link className="job-button" to="/jobs">
          Browse jobs
        </Link>
      </div>
    </main>
  </div>
);
export default Applications;
