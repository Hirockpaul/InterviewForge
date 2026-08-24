import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useGoogleLogin } from '@react-oauth/google'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../hooks/useAuth'
import loginImage from '../../../assets/images/img1.jpg'
import '../auth.form.scss'

const Register = () => {
    const navigate = useNavigate()
    const { loading, handleRegister, handleGoogleLogin } = useAuth()
    const [ username, setUsername ] = useState('')
    const [ email, setEmail ] = useState('')
    const [ password, setPassword ] = useState('')
    const [ registerError, setRegisterError ] = useState('')
    const canSubmit = username.trim() && email.trim() && password.trim()

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (!canSubmit) return

        setRegisterError('')
        try {
            await handleRegister({ username, email, password })
            navigate('/dashboard')
        } catch (error) {
            setRegisterError(error.response?.data?.message || 'Unable to create your account. Please try again.')
        }
    }

    const startGoogleLogin = useGoogleLogin({
        flow: 'auth-code',
        onSuccess: async ({ code }) => {
            setRegisterError('')
            try {
                await handleGoogleLogin(code)
                navigate('/dashboard')
            } catch (error) {
                setRegisterError(error.response?.data?.message || 'Google registration failed. Please try again.')
            }
        },
        onError: () => setRegisterError('Google registration was cancelled or could not start.')
    })

    if (loading) return <main className='auth-loading'><p>Restoring your session...</p></main>

    return (
        <main className='auth-page register-page'>
            <header className='auth-brand' aria-label='InterviewForge home'>
                <span className='auth-brand__mark' aria-hidden='true'>IF</span>
                <span>InterviewForge</span>
            </header>

            <section className='login-layout'>
                <div className='login-content'>
                    <div className='login-heading'>
                        <p className='login-heading__eyebrow'>Start preparing</p>
                        <h1>
                            <span className='login-heading__primary'>Forge your next</span>
                            <span className='login-heading__accent'>opportunity.</span>
                        </h1>
                        <p>Create your account and build interview plans shaped around your experience and target role.</p>
                    </div>

                    <form className='login-form' onSubmit={handleSubmit}>
                        <button className='google-login' type='button' onClick={() => startGoogleLogin()} disabled={loading}>
                            <FcGoogle aria-hidden='true' />
                            Continue with Google
                        </button>
                        <div className='login-divider'><span>or register with email</span></div>

                        <div className='auth-field'>
                            <label htmlFor='username'>Username</label>
                            <input value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete='username' type='text' id='username' name='username' placeholder='Choose a username' />
                        </div>
                        <div className='auth-field'>
                            <label htmlFor='email'>Email address</label>
                            <input value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete='email' type='email' id='email' name='email' placeholder='you@example.com' />
                        </div>
                        <div className='auth-field'>
                            <label htmlFor='password'>Password</label>
                            <input value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete='new-password' type='password' id='password' name='password' placeholder='Create a password' />
                        </div>

                        <button className='login-submit' disabled={!canSubmit || loading}>
                            {loading ? 'Creating account...' : 'Create account'}
                        </button>
                        {registerError && <p className='login-error' role='alert'>{registerError}</p>}
                    </form>

                    <p className='login-register'>Already have an account? <Link to='/login'>Sign in</Link></p>
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

export default Register
