const CODING_TOPICS = Object.freeze([
    [ 'arrays', 'Arrays', 'Practice array traversal, manipulation, and problem solving.' ],
    [ 'strings', 'Strings', 'Work with text processing, matching, and transformation.' ],
    [ 'hashing', 'Hashing', 'Use maps and sets for efficient lookups and counting.' ],
    [ 'linked-lists', 'Linked Lists', 'Practice pointer movement and linked data structures.' ],
    [ 'stack', 'Stack', 'Solve last-in, first-out and monotonic stack problems.' ],
    [ 'queue', 'Queue', 'Practice first-in, first-out and breadth-first workflows.' ],
    [ 'searching', 'Searching', 'Find values and boundaries efficiently.' ],
    [ 'sorting', 'Sorting', 'Order and partition data with efficient algorithms.' ],
    [ 'recursion', 'Recursion', 'Break problems into smaller self-similar parts.' ],
    [ 'backtracking', 'Backtracking', 'Explore choices while pruning invalid paths.' ],
    [ 'trees', 'Trees', 'Traverse and reason about hierarchical structures.' ],
    [ 'graphs', 'Graphs', 'Model relationships and explore connected structures.' ],
    [ 'dynamic-programming', 'Dynamic Programming', 'Build solutions from reusable subproblems.' ],
    [ 'greedy', 'Greedy', 'Make locally optimal choices with provable outcomes.' ],
    [ 'bit-manipulation', 'Bit Manipulation', 'Use binary operations to solve compact problems.' ]
].map(([ id, displayName, shortDescription ]) => ({ id, displayName, slug: id, shortDescription })))

const CODING_TOPIC_IDS = CODING_TOPICS.map((topic) => topic.id)

module.exports = { CODING_TOPICS, CODING_TOPIC_IDS }
