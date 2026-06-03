import { useContext } from "react";
import { AuthContext } from "../auth-context";
import { login,register,logout } from "../services/auth.api";



export const useAuth = () => {

    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }

    const {user, setUser, loading, setLoading} = context


   const handleLogin = async ({email, password}) => {
    try {
        setLoading(true)
        const data = await login({email, password})
        setUser(data.user)
    } finally {
        setLoading(false)
    }
   }

    const handleRegister = async ({username,email, password}) => {
    try {
        setLoading(true)
        const data = await register({username,email, password})
        setUser(data.user)
    } finally {
        setLoading(false)
    }
}
 
    const handleLogout = async () => {
    try {
        setLoading(true)
        await logout()
        setUser(null)
    } finally {
        setLoading(false)
    }
}

   return {user, loading, handleRegister, handleLogin, handleLogout}
}
