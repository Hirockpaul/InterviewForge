import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../../features/auth/hooks/useAuth'
import UserAvatar from '../common/UserAvatar'
import { FiBarChart2, FiBookmark, FiBriefcase, FiChevronLeft, FiChevronRight, FiCode, FiFileText, FiGrid, FiHelpCircle, FiList, FiLogOut, FiMenu, FiSearch, FiSettings, FiTarget, FiX } from 'react-icons/fi'
import './app-header.scss'

const groups = [
    { label: 'Main', items: [ { label: 'Dashboard', to: '/dashboard', icon: FiGrid } ] },
    { label: 'Career', items: [ { label: 'Search jobs', to: '/jobs', exact: true, icon: FiSearch }, { label: 'Saved jobs', to: '/jobs/saved', icon: FiBookmark }, { label: 'Applications', to: '/jobs/applications', icon: FiBriefcase } ] },
    { label: 'Preparation', items: [
        { label: 'Interviews', to: '/interviews', icon: FiTarget },
        { label: 'Technical questions', to: '/focused-practice', icon: FiHelpCircle },
        { label: 'Coding practice', to: '/coding-practice', icon: FiCode },
        { label: 'MCQ practice', to: '/mcq', icon: FiList },
        { label: 'Project questions', to: '/project-questions', icon: FiFileText },
        { label: 'Question bank', to: '/question-bank', icon: FiBookmark }
    ] },
    { label: 'Insights', items: [ { label: 'Progress', to: '/progress', icon: FiBarChart2 } ] }
]

const AppHeader = () => {
    const { user, handleLogout } = useAuth()
    const { pathname } = useLocation()
    const [ collapsed, setCollapsed ] = useState(() => localStorage.getItem('if-sidebar-collapsed') === 'true')
    const [ mobileOpen, setMobileOpen ] = useState(false)
    const [ loggingOut, setLoggingOut ] = useState(false)
    const username = user?.username || user?.email || 'Account'

    useEffect(() => { document.body.classList.toggle('if-sidebar-collapsed', collapsed); localStorage.setItem('if-sidebar-collapsed', collapsed); return () => document.body.classList.remove('if-sidebar-collapsed') }, [ collapsed ])
    useEffect(() => { const close = (event) => event.key === 'Escape' && setMobileOpen(false); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [])

    const active = (item) => item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`) || item.aliases?.some((path) => pathname.startsWith(path))
    const logout = async () => { setLoggingOut(true); try { await handleLogout() } finally { setLoggingOut(false) } }

    return <>
        <button className='mobile-nav-toggle' type='button' aria-label='Open navigation' aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><FiMenu aria-hidden='true' /></button>
        {mobileOpen && <button className='side-nav-backdrop' type='button' aria-label='Close navigation' onClick={() => setMobileOpen(false)} />}
        <aside className={`app-header ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`} aria-label='Application sidebar'>
            <div className='side-nav__brand-row'><Link className='app-brand' to='/dashboard' title={collapsed ? 'InterviewForge' : undefined}><span className='app-brand__mark'>IF</span><span className='app-brand__name'>InterviewForge</span></Link><button className='side-nav__mobile-close' type='button' aria-label='Close navigation' onClick={() => setMobileOpen(false)}><FiX aria-hidden='true' /></button></div>
            <nav className='side-nav' aria-label='Primary navigation' onClick={(event) => { if (event.target.closest('a')) setMobileOpen(false) }}>{groups.map((group) => <section className='side-nav__group' key={group.label}><p>{group.label}</p>{group.items.map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} className={active(item) ? 'is-active' : ''} aria-current={active(item) ? 'page' : undefined} title={collapsed ? item.label : undefined}><span className='side-nav__icon' aria-hidden='true'><Icon /></span><span className='side-nav__label'>{item.label}</span></Link> })}</section>)}</nav>
            <div className='side-nav__footer'><Link className={pathname === '/profile' ? 'is-active' : ''} to='/profile' title={collapsed ? 'Settings' : undefined}><span className='side-nav__icon' aria-hidden='true'><FiSettings /></span><span className='side-nav__label'>Settings</span></Link><div className='side-nav__account'><UserAvatar style={user?.avatarStyle} seed={user?.avatarSeed || username} size={34} alt='' /><span><strong>{username}</strong><small>{user?.email || 'Your profile'}</small></span><button type='button' onClick={logout} disabled={loggingOut} title='Log out' aria-label='Log out'><FiLogOut aria-hidden='true' /></button></div><button className='side-nav__collapse' type='button' onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><span aria-hidden='true'>{collapsed ? <FiChevronRight /> : <FiChevronLeft />}</span><span className='side-nav__label'>Collapse</span></button></div>
        </aside>
    </>
}

export default AppHeader
