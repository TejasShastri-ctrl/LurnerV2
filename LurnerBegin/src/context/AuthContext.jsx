import { createContext, useState, useContext, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, fetchMe, logoutUser } from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Handshake with backend to restore session via HttpOnly cookie
        fetchMe()
            .then(profile => {
                setUser(profile);
                setToken('session_active');
            })
            .catch(() => {
                setUser(null);
                setToken(null);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const login = async (email, password) => {
        const data = await apiLogin(email, password);
        if (data.user) {
            setUser(data.user);
            setToken('session_active');
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

    const logout = async () => {
        try {
            await logoutUser();
        } catch (e) {
            console.error("Logout API call failed:", e);
        }
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
