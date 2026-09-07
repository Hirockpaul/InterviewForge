import { Link } from 'react-router'

const TopicCard = ({ topic }) => (
    <Link className='coding-topic-card' to={`/coding-practice/${topic.slug}`}>
        <h2>{topic.displayName}</h2>
        <span className='coding-topic-card__link' aria-hidden='true'>↪</span>
    </Link>
)

export default TopicCard
