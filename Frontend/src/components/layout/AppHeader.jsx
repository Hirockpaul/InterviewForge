import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../../features/auth/hooks/useAuth'
import UserAvatar from '../common/UserAvatar'
import './app-header.scss'

const practiceItems = [
    { label: 'Coding Practice', description: 'Write and run code', to: '/coding-practice' },
    { label: 'MCQ', description: 'Test your knowledge', to: '/mcq' },
    { label: 'Technical Questions', description: 'Build topic confidence', to: '/focused-practice' },
    { label: 'Mock Interview', description: 'Practice from an interview plan', to: '/interviews' }
]

const Chevron = () => <svg className='app-chevron' viewBox='0 0 12 12' aria-hidden='true'><path d='m2.5 4.5 3.5 3 3.5-3' /></svg>

const AppHeader = () => {
    const { user, handleLogout } = useAuth()
    const { pathname } = useLocation()
    const headerRef = useRef(null)
    const [ isLoggingOut, setIsLoggingOut ] = useState(false)
    const [ mobileOpen, setMobileOpen ] = useState(false)
    const [ openMenu, setOpenMenu ] = useState(null)
    const username = user?.username || user?.email || 'Account'
    const isActive = (route) => pathname === route || (route !== '/dashboard' && pathname.startsWith(`${route}/`))
    const practiceActive = [ '/coding-practice', '/mcq', '/focused-practice', '/mock-interview' ].some(isActive)

    useEffect(() => {
        const closeOnOutsideClick = (event) => {
            if (!headerRef.current?.contains(event.target)) {
                setOpenMenu(null)
                setMobileOpen(false)
            }
        }
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setOpenMenu(null)
                setMobileOpen(false)
            }
        }
        document.addEventListener('pointerdown', closeOnOutsideClick)
        document.addEventListener('keydown', closeOnEscape)
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideClick)
            document.removeEventListener('keydown', closeOnEscape)
        }
    }, [])

    const toggleMenu = (menu) => setOpenMenu((current) => current === menu ? null : menu)
    const closeNavigation = () => { setOpenMenu(null); setMobileOpen(false) }
    const logout = async () => {
        setIsLoggingOut(true)
        try { await handleLogout() } finally { setIsLoggingOut(false) }
    }

    return (
        <header className='app-header' ref={headerRef}>
            <Link className='app-brand' to='/dashboard' aria-label='InterviewForge dashboard' onClick={closeNavigation}>
                <span className='app-brand__mark' aria-hidden='true'>IF</span>
                <span>InterviewForge</span>
            </Link>

            <button className='app-menu-toggle' type='button' aria-label='Toggle navigation' aria-expanded={mobileOpen} onClick={() => { setMobileOpen((open) => !open); setOpenMenu(null) }}>
                <span /><span /><span />
            </button>

            <div className={`app-header__content ${mobileOpen ? 'is-open' : ''}`}>
                <nav className='app-nav' aria-label='Main navigation'>
                    <Link className={isActive('/dashboard') ? 'is-active' : ''} aria-current={isActive('/dashboard') ? 'page' : undefined} to='/dashboard' onClick={closeNavigation}>Dashboard</Link>
                    <Link className={isActive('/interviews') ? 'is-active' : ''} aria-current={isActive('/interviews') ? 'page' : undefined} to='/interviews' onClick={closeNavigation}>Interviews</Link>
                    <div className={`app-dropdown ${openMenu === 'practice' ? 'is-open' : ''}`}>
                        <button className={`app-nav__trigger ${practiceActive ? 'is-active' : ''}`} type='button' aria-expanded={openMenu === 'practice'} aria-haspopup='menu' onClick={() => toggleMenu('practice')}>Practice <Chevron /></button>
                        <div className='app-dropdown__menu app-dropdown__menu--practice' role='menu'>
                            {practiceItems.map((item) => <Link key={item.label} className={isActive(item.to) ? 'is-active' : ''} role='menuitem' to={item.to} onClick={closeNavigation}><span>{item.label}</span><small>{item.description}</small></Link>)}
                        </div>
                    </div>
                    <Link className={isActive('/question-bank') ? 'is-active' : ''} aria-current={isActive('/question-bank') ? 'page' : undefined} to='/question-bank' onClick={closeNavigation}>Question Bank</Link>
                    <Link className={isActive('/progress') ? 'is-active' : ''} aria-current={isActive('/progress') ? 'page' : undefined} to='/progress' onClick={closeNavigation}>Progress</Link>
                </nav>

                <div className={`app-dropdown app-account ${openMenu === 'account' ? 'is-open' : ''}`}>
                    <button className='app-account__trigger' type='button' aria-expanded={openMenu === 'account'} aria-haspopup='menu' onClick={() => toggleMenu('account')}>
                        <UserAvatar style={user?.avatarStyle} seed={user?.avatarSeed || username} size={29} alt='' />
                        <span className='app-account__name'>{username}</span>
                        <Chevron />
                    </button>
                    <div className='app-dropdown__menu app-account__menu' role='menu'>
                        <div className='app-account__identity'><strong>{username}</strong>{user?.username && user?.email && <span>{user.email}</span>}</div>
                        <Link role='menuitem' to='/profile' onClick={closeNavigation}>Profile</Link>
                        <button type='button' role='menuitem' className='app-account__logout' onClick={logout} disabled={isLoggingOut}>{isLoggingOut ? 'Logging out...' : 'Logout'}</button>
                    </div>
                </div>
            </div>
        </header>
    )
}

export default AppHeader
