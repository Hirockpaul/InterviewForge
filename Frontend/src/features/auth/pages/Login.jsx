import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'
import loginImage from '../../../assets/images/img1.jpg'
import { useGoogleLogin } from '@react-oauth/google'
import { FcGoogle } from 'react-icons/fc'

const Login = () => {

    const { loading, handleLogin, handleGoogleLogin } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const destination = location.state?.from || '/dashboard'

    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    const [ loginError, setLoginError ] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoginError('')
        try {
            await handleLogin({email,password})
            navigate(destination, { replace: true })
        } catch (error) {
            setLoginError(error.response?.data?.message || 'Unable to sign in. Please try again.')
        }
    }

    const startGoogleLogin = useGoogleLogin({
        flow: 'auth-code',
        onSuccess: async ({ code }) => {
            setLoginError('')
            try {
                await handleGoogleLogin(code)
                navigate(destination, { replace: true })
            } catch (error) {
                setLoginError(error.response?.data?.message || 'Google sign-in failed. Please try again.')
            }
        },
        onError: () => setLoginError('Google sign-in was cancelled or could not start.')
    })

    if(loading){
        return <main className='auth-loading'><p>Restoring your session...</p></main>
    }


    return (
        <main className='auth-page'>
            <header className='auth-brand' aria-label='InterviewForge home'>
                <span className='auth-brand__mark' aria-hidden='true'>IF</span>
                <span>InterviewForge</span>
            </header>

            <section className='login-layout'>
                <div className='login-content'>
                    <div className='login-heading'>
                        <p className='login-heading__eyebrow'>Welcome back</p>
                        <h1>
                            <span className='login-heading__primary'>Prepare with<br />purpose.</span>
                            <span className='login-heading__accent'>Interview with<br />confidence.</span>
                        </h1>
                        <p>Sign in to continue building focused interview plans for the roles you want.</p>
                    </div>

                    <form className='login-form' onSubmit={handleSubmit}>
                        <button className='google-login' type='button' onClick={() => startGoogleLogin()} disabled={loading}>
                            <FcGoogle aria-hidden='true' />
                            Continue with Google
                        </button>
                        <div className='login-divider'><span>or sign in with email</span></div>
                        <div className='auth-field'>
                            <label htmlFor='email'>Email address</label>
                        <input
                            value={email}
                            onChange={(e) => { setEmail(e.target.value) }}
                            required
                            autoComplete='email'
                            type='email' id='email' name='email' placeholder='you@example.com' />
                        </div>
                        <div className='auth-field'>
                            <label htmlFor='password'>Password</label>
                        <input
                            value={password}
                            onChange={(e) => { setPassword(e.target.value) }}
                            required
                            autoComplete='current-password'
                            type='password' id='password' name='password' placeholder='Enter your password' />
                        </div>
                        <button className='login-submit' disabled={!email.trim() || !password.trim()}>
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                        {loginError && <p className='login-error' role='alert'>{loginError}</p>}
                    </form>

                    <p className='login-register'>New to InterviewForge? <Link to='/register'>Create an account</Link></p>
                </div>

                <figure className='login-visual'>
                    <img src={loginImage} alt='A candidate preparing ideas on an interview planning wall' />
                    <figcaption>
                        <span>Turn preparation into progress</span>
                        Build a strategy grounded in your experience and the role.
                    </figcaption>
                </figure>
            </section>
        </main>
    )
}

export default Login
