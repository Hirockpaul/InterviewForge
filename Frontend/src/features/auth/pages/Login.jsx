import { useState } from 'react'
import "../auth.form.scss"
import { Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router';

const Login = () => {

   const {loading, handleLogin} = useAuth()
   const navigate = useNavigate()

   const [email, setEmail] = useState("")
   const [password, setPassword] = useState("")
   const canSubmit = email.trim() && password.trim()

 const handleSubmit = async(e) => {
    e.preventDefault();
   if (!canSubmit) return
   await handleLogin({email, password})
   navigate('/')
 }

if(loading) {
   return (<main><h1>Loading........</h1></main>)
}

    return (
        <main>
          <div className="form-container">
            <h1>Login</h1>
            <form onSubmit={handleSubmit}>
             <div className="input-group">
                <label htmlFor="email">Email</label>
                <input
                value={email}
                onChange={(e) => {setEmail(e.target.value) }}
                required
                 type="email" id="email" name="email" placeholder='Enter email address'/>
             </div>
            <div className="input-group">
                <label htmlFor="password">Password</label>
                <input
                value={password}
                onChange={(e) => {setPassword(e.target.value)}}
                required
                type="password" id="password" name="password" placeholder='Enter password'/>
             </div>

            <button className='button primary-button' disabled={!canSubmit}>Login</button>

            </form>

             <p>Don't have an account <Link to={"/register"}>Register</Link></p>
            
          </div>
          
        </main>
    )
}

export default Login;
