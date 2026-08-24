import { useState } from 'react'
import { getAvatarUrl } from '../../features/profile/utils/getAvatarUrl'
import './user-avatar.scss'

const AvatarImage = ({ url, alt }) => {
    const [ failed, setFailed ] = useState(false)
    if (failed) return null
    return <img src={url} alt={alt} onError={() => setFailed(true)} />
}

const UserAvatar = ({ style, seed, size = 40, className = '', alt = 'User avatar' }) => {
    const url = getAvatarUrl({ style, seed, size })
    const initial = String(seed || 'U').trim().charAt(0).toUpperCase() || 'U'

    return (
        <span className={`user-avatar ${className}`} style={{ '--avatar-size': `${size}px` }}>
            <span className='user-avatar__fallback' aria-hidden='true'>{initial}</span>
            <AvatarImage key={url} url={url} alt={alt} />
        </span>
    )
}

export default UserAvatar
