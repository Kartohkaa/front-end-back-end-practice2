import axios from 'axios';

const apiClient = axios.create({
    baseURL: "http://localhost:3000/api",
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
});

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