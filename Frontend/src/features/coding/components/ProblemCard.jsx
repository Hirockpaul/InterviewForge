import { Link } from "react-router";

const ProblemCard = ({ problem }) => (
  <article className="coding-problem-card">
    <div className="coding-problem-card__heading">
      <span className={`difficulty difficulty--${problem.difficulty}`}>
        {problem.difficulty}
      </span>
      <span>{problem.topic.replaceAll("-", " ")}</span>
    </div>
    <h2>{problem.title}</h2>
    <p>{problem.shortDescription}</p>
    <div className="coding-problem-card__footer">
      <span>{problem.supportedLanguages?.length || 0} languages</span>
      <Link to={`/coding-practice/problem/${problem._id}`}>
        Practice <span aria-hidden="true">&rarr;</span>
      </Link>
    </div>
  </article>
);

export default ProblemCard;
