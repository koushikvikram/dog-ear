// Categorical palettes from the design system. These are data colours: records store an index
// (tie types, labels) or a hex (book covers) and render it as-is.

// Tie types: blue, green, coral, violet, yellow, pink, cyan, sand. The index also picks the dash.
export const TIE_COLORS = ['#8fb0ff', '#5fd49a', '#ff8f86', '#b79cf0', '#ffd166', '#ff9ecb', '#5fd0e6', '#c9b79c']
export const TIE_DASHES = ['none', '8 6', '2 5', '10 4 2 4']
export const TIE_UNTYPED = { color: '#a1a1aa', dash: '3 4' }
export const tieColor = i => TIE_COLORS[(i ?? 0) % TIE_COLORS.length]
export const tieDash = i => TIE_DASHES[(i ?? 0) % TIE_DASHES.length]

// Book covers, in the order new books take them.
export const COVER_COLORS = ['#8fb0ff', '#ffd166', '#5fd49a', '#ff9ecb', '#b79cf0', '#5fd0e6', '#ff8f86', '#c9b79c']
export const coverColor = n => COVER_COLORS[n % COVER_COLORS.length]

// Highlight labels: Clue, Quote, Question, Theme, then violet, orange, teal, gray.
export const LABEL_COLORS = ['#ffe27a', '#9cc2ff', '#ffb3c1', '#a5e3b8', '#d9b8ff', '#ffc999', '#9be7e0', '#d6d6dc']
export const labelColor = i => LABEL_COLORS[(i ?? 0) % LABEL_COLORS.length]
export const UNLABELLED = '#a1a1aa'

// Initial discs on desktop character nodes, by the character's position.
export const AVATAR_COLORS = ['#1d6b47', '#2b56b8', '#a8322a', '#6a3bbf', '#8a5a1c', '#1c6b78']
export const avatarColor = i => AVATAR_COLORS[i % AVATAR_COLORS.length]

export const STATUS_COLORS = { Reading: 'var(--status-reading)', Finished: 'var(--status-finished)', Paused: 'var(--status-paused)' }
