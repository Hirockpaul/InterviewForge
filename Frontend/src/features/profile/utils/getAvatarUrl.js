import { AVATAR_OPTIONS, DEFAULT_AVATAR_STYLE } from '../constants/avatarOptions'

export function getAvatarUrl({ style, seed, size }) {
    const safeStyle = AVATAR_OPTIONS.some((option) => option.style === style) ? style : DEFAULT_AVATAR_STYLE
    const safeSeed = encodeURIComponent(String(seed || 'interviewforge-user'))
    const sizeQuery = Number.isFinite(Number(size)) ? `&size=${Math.round(Number(size))}` : ''
    return `https://api.dicebear.com/10.x/${safeStyle}/svg?seed=${safeSeed}${sizeQuery}`
}
