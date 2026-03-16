import axios from 'axios';

const API_URL = 'http://localhost:3000/api/auth';

// Функция для обновления токена
export const refreshToken = async () => {
    const currentRefreshToken = localStorage.getItem('refreshToken');
    
    if (!currentRefreshToken) {
        throw new Error('No refresh token');
    }

    try {
        const response = await axios.post(`${API_URL}/refresh`, {
            refreshToken: currentRefreshToken
        });
        
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        return accessToken;
    } catch (error) {
        logout();
        throw error;
    }
};

export const register = async (userData) => {
    try {
        const response = await axios.post(`${API_URL}/register`, userData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: 'Ошибка регистрации' };
    }
};

export const login = async (credentials) => {
    try {
        const response = await axios.post(`${API_URL}/login`, credentials);
        
        
        if (response.data.accessToken) {
            localStorage.setItem('token', response.data.accessToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: 'Ошибка входа' };
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
};

export const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

export const getToken = () => {
    return localStorage.getItem('token');
};

export const getRefreshToken = () => {
    return localStorage.getItem('refreshToken');
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};