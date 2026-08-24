import { useEffect, useState } from 'react'
import AppHeader from '../../../components/layout/AppHeader'
import UserAvatar from '../../../components/common/UserAvatar'
import { useAuth } from '../../auth/hooks/useAuth'
import { getProgress } from '../../progress/services/progress.api'
import { AVATAR_OPTIONS, DEFAULT_AVATAR_STYLE } from '../constants/avatarOptions'
import '../styles/profile.scss'

const Profile = () => {
    const { user, handleLogout, handleProfileUpdate } = useAuth()
    const [ editing, setEditing ] = useState(false)
    const [ displayName, setDisplayName ] = useState(user?.username || '')
    const [ avatarStyle, setAvatarStyle ] = useState(user?.avatarStyle || DEFAULT_AVATAR_STYLE)
    const [ progress, setProgress ] = useState(null)
    const [ saving, setSaving ] = useState(false)
    const [ error, setError ] = useState('')
    const avatarSeed = user?.avatarSeed || user?.username || user?.id

    useEffect(() => {
        let active = true
        getProgress().then((data) => { if (active) setProgress(data.progress) }).catch(() => {})
        return () => { active = false }
    }, [])

    const cancel = () => {
        setDisplayName(user?.username || '')
        setAvatarStyle(user?.avatarStyle || DEFAULT_AVATAR_STYLE)
        setError('')
        setEditing(false)
    }

    const save = async (event) => {
        event.preventDefault()
        setSaving(true)
        setError('')
        try {
            await handleProfileUpdate({ displayName, avatarStyle })
            setEditing(false)
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Profile could not be updated.')
        } finally {
            setSaving(false)
        }
    }

    const memberSince = user?.memberSince
        ? new Date(user.memberSince).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        : 'Not available'

    return (
        <div className='profile-page'>
            <AppHeader />
            <main className='profile-main'>
                <header className='profile-heading'><p>Your account</p><h1>Profile</h1><span>Manage how you appear across InterviewForge.</span></header>

                {!editing ? (
                    <>
                        <section className='profile-identity'>
                            <UserAvatar style={user?.avatarStyle} seed={avatarSeed} size={132} alt={`${user?.username || 'User'} avatar`} />
                            <div><h2>{user?.username}</h2><p>{user?.email}</p><span>Member since {memberSince}</span></div>
                            <button type='button' onClick={() => setEditing(true)}>Edit Profile</button>
                        </section>

                        <section className='profile-stats' aria-labelledby='profile-stats-title'>
                            <div className='profile-section-heading'><p>Practice statistics</p><h2 id='profile-stats-title'>Your preparation activity</h2></div>
                            <div>
                                <article><span>Technical sessions</span><strong>{progress?.focusedPracticeCompleted ?? '—'}</strong></article>
                                <article><span>Interviews</span><strong>{progress?.totalCompleted ?? '—'}</strong></article>
                                <article><span>Readiness</span><strong>{progress?.overallReadiness == null ? '—' : `${progress.overallReadiness}%`}</strong></article>
                                <article><span>MCQ tests</span><strong>{progress?.mcq?.completed ?? '—'}</strong></article>
                            </div>
                        </section>

                        <section className='profile-security'><div><p>Security</p><h2>Account access</h2><span>Sign out of InterviewForge on this device.</span></div><button type='button' onClick={handleLogout}>Sign out</button></section>
                    </>
                ) : (
                    <form className='profile-editor' onSubmit={save}>
                        <div className='profile-preview'><UserAvatar style={avatarStyle} seed={avatarSeed} size={144} alt='Selected avatar preview' /><h2>Edit Profile</h2></div>
                        <fieldset><legend>Choose your avatar</legend><div className='avatar-options'>{AVATAR_OPTIONS.map((option) => <button key={option.style} type='button' className={avatarStyle === option.style ? 'is-selected' : ''} aria-pressed={avatarStyle === option.style} aria-label={`Select ${option.label} avatar`} onClick={() => setAvatarStyle(option.style)}><UserAvatar style={option.style} seed={avatarSeed} size={76} alt='' /><span>{option.label}</span></button>)}</div></fieldset>
                        <div className='profile-fields'>
                            <label>Display Name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength='2' maxLength='40' required /></label>
                            <label>Email<input value={user?.email || ''} readOnly aria-readonly='true' /></label>
                        </div>
                        {error && <p className='profile-error'>{error}</p>}
                        <div className='profile-actions'><button type='button' onClick={cancel} disabled={saving}>Cancel</button><button type='submit' disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div>
                    </form>
                )}
            </main>
        </div>
    )
}

export default Profile
