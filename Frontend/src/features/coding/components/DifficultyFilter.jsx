const OPTIONS = [ 'all', 'easy', 'medium', 'hard' ]

const DifficultyFilter = ({ value, onChange }) => (
    <div className='coding-difficulties' aria-label='Filter by difficulty'>
        {OPTIONS.map((difficulty) => (
            <button
                key={difficulty}
                type='button'
                className={value === difficulty ? 'is-active' : ''}
                aria-pressed={value === difficulty}
                onClick={() => onChange(difficulty)}
            >
                {difficulty[0].toUpperCase() + difficulty.slice(1)}
            </button>
        ))}
    </div>
)

export default DifficultyFilter
