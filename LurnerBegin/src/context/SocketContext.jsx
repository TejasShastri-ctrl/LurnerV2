import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { token, user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [onlineFriends, setOnlineFriends] = useState([]); // Array of userIds

    useEffect(() => {
        if (token) {
            const newSocket = io('http://localhost:3000', {
                auth: { token }
            });

            newSocket.on('connect', () => {
                console.log('📡 Connected to Real-time Engine');
            });

            newSocket.on('initial_online_friends', (friendIds) => {
                setOnlineFriends(friendIds);
            });

            newSocket.on('friend_status', ({ userId, status }) => {
                setOnlineFriends(prev => {
                    if (status === 'online') {
                        return prev.includes(userId) ? prev : [...prev, userId];
                    } else {
                        return prev.filter(id => id !== userId);
                    }
                });
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
                setSocket(null);
            };
        }
    }, [token]);

    return (
        <SocketContext.Provider value={{ socket, onlineFriends }}>
            {children}
        </SocketContext.Provider>
    );
};
