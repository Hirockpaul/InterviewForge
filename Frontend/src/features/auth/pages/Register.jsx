import { useState } from 'react'
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

const Register = () => {
   const navigate = useNavigate()
   const { loading, handleRegister } = useAuth()

     const [username, setUsername] = useState("")
     const [email, setEmail] = useState("")
     const [password, setPassword] = useState("")
     const canSubmit = username.trim() && email.trim() && password.trim()

     const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return
    await handleRegister({username,email,password})
    navigate("/")
 }
  if(loading){
   return (<main><h1>Loading.........</h1></main>)
  }

    return (
       <main>
          <div className="form-container">
            <h1>Register</h1>

            <form onSubmit={handleSubmit}>
 
              <div className="input-group">
                <label htmlFor="username">UserName</label>
                <input
                value={username}
                onChange={(e) => {setUsername(e.target.value)}}
                required
                type="text" id="username" name="username" placeholder='Enter username'/>
             </div>
             <div className="input-group">
                <label htmlFor="email">Email</label>
                <input
                value={email}
                onChange={(e) => {setEmail(e.target.value)}}
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

            <button className='button primary-button' disabled={!canSubmit}>Register</button>

            </form>

          <p>Already have an account? <Link to={"/login"}>Login</Link></p>

          </div>
          
        </main>
    )
}

export default Register;
