import { Link } from 'react-router'

const TopicCard = ({ topic }) => (
    <Link className='coding-topic-card' to={`/coding-practice/${topic.slug}`}>
        <span className='coding-topic-card__count'>{topic.counts.total} problem{topic.counts.total === 1 ? '' : 's'}</span>
        <h2>{topic.displayName}</h2>
        <p>{topic.shortDescription}</p>
        <span className='coding-topic-card__link'>Explore topic <span aria-hidden='true'>&rarr;</span></span>
    </Link>
)

export default TopicCard
