import { createContext, useState, useContext, useEffect } from 'react';
import { login as apiLogin, register as apiRegister } from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('lurner_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simple token-based session restoration
        const storedUser = localStorage.getItem('lurner_user');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        console.log("User found during session restoration : ", storedUser);
        setLoading(false);
    }, [token]);

    const login = async (email, password) => {
        const data = await apiLogin(email, password);
        if (data.token) {
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('lurner_token', data.token);
            localStorage.setItem('lurner_user', JSON.stringify(data.user));
            return { success: true };
        }
        return { success: false, error: data.error };
    };

    const register = async (username, email, password) => {
        const data = await apiRegister(username, email, password);
        if (data.id) {
            return { success: true };
        }
        return { success: false, error: data.error };
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('lurner_token');
        localStorage.removeItem('lurner_user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
