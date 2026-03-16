import axios from 'axios';
import { getToken, refreshToken, logout } from './auth';

const apiClient = axios.create({
    baseURL: "http://localhost:3000/api",
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
});

// Добавляем токен к каждому запросу
apiClient.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Для обработки 401 ошибок и автоматического обновления токена
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Если ошибка 401 и это не повторный запрос
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Пробуем обновить токен
                const newToken = await refreshToken();
                
                // Повторяем оригинальный запрос с новым токеном
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return apiClient(originalRequest);
                
            } catch (refreshError) {
                // Если не удалось обновить токен - разлогиниваем
                logout();
                window.location.reload();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export const api = {
    getProducts: async () => {
        const response = await apiClient.get("/products");
        return response.data;
    },
    
    getProductById: async (id) => {
        const response = await apiClient.get(`/products/${id}`);
        return response.data;
    },
    
    createProduct: async (product) => {
        const response = await apiClient.post("/products", product);
        return response.data;
    },
    
    updateProduct: async (id, product) => {
        const response = await apiClient.patch(`/products/${id}`, product);
        return response.data;
    },
    
    deleteProduct: async (id) => {
        const response = await apiClient.delete(`/products/${id}`);
        return response.data;
    }
};