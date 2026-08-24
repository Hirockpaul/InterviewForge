import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";
import { useLocation } from 'react-router'

const Protected = ({children}) => {
    const { loading,user } = useAuth()
    const location = useLocation()


    if(loading){
        return <main className='auth-loading'><p>Restoring your session...</p></main>
    }

    if(!user){
        return <Navigate to='/login' state={{ from: location.pathname }} replace />
    }
    
    return children
}

export default Protected
