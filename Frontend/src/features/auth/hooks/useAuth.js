import { useContext } from "react";
import { AuthContext } from "../auth-context";
import { login, loginWithGoogle, register, logout } from "../services/auth.api";



export const useAuth = () => {

    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context


    const handleLogin = async ({ email, password }) => {
        setLoading(true)
        try {
            const data = await login({ email, password })
            setUser(data.user)
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async ({ username, email, password }) => {
        setLoading(true)
        try {
            const data = await register({ username, email, password })
            setUser(data.user)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async (code) => {
        setLoading(true)
        try {
            const data = await loginWithGoogle(code)
            setUser(data.user)
            return data.user
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        setLoading(true)
        try {
            await logout()
            setUser(null)
            return true
        } catch {
            return false
        } finally {
            setLoading(false)
        }
    }

    return { user, loading, handleRegister, handleLogin, handleGoogleLogin, handleLogout }
}
