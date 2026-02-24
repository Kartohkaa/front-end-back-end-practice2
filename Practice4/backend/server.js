const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

// Путь к файлу с товарами
const productsFile = path.join(__dirname, 'products.json');

// Функция для чтения товаров из файла
function readProducts() {
    const data = fs.readFileSync(productsFile);
    return JSON.parse(data);
}

// Функция для записи товаров в файл
function writeProducts(products) {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
}

// Middleware для логирования
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            console.log('Body:', req.body);
        }
    });
    next();
});

// Функция-помощник для поиска товара
function findProductOr404(id, res) {
    const products = readProducts();
    const product = products.find(p => p.id === id);
    if (!product) {
        res.status(404).json({ error: "Product not found" });
        return null;
    }
    return { product, products };
}

// GET /api/products - получить все товары
app.get("/api/products", (req, res) => {
    const products = readProducts();
    res.json(products);
});

// GET /api/products/:id - получить товар по ID
app.get("/api/products/:id", (req, res) => {
    const id = req.params.id;
    const result = findProductOr404(id, res);
    if (!result) return;
    res.json(result.product);
});

// POST /api/products - создать новый товар
app.post("/api/products", (req, res) => {
    const { name, category, description, price, stock, rating } = req.body;
    
    // Валидация
    if (!name || !category || !description || !price || stock === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    
    const products = readProducts();
    const newProduct = {
        id: nanoid(6),
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        price: Number(price),
        stock: Number(stock),
        rating: rating ? Number(rating) : 0
    };
    
    products.push(newProduct);
    writeProducts(products);
    
    res.status(201).json(newProduct);
});

// PATCH /api/products/:id - обновить товар
app.patch("/api/products/:id", (req, res) => {
    const id = req.params.id;
    const result = findProductOr404(id, res);
    if (!result) return;
    
    const { product, products } = result;
    const { name, category, description, price, stock, rating } = req.body;
    
    // Проверка, что есть что обновлять
    if (!name && !category && !description && !price && stock === undefined && rating === undefined) {
        return res.status(400).json({ error: "Nothing to update" });
    }
    
    // Обновляем поля
    if (name) product.name = name.trim();
    if (category) product.category = category.trim();
    if (description) product.description = description.trim();
    if (price) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (rating) product.rating = Number(rating);
    
    // Находим индекс и обновляем
    const index = products.findIndex(p => p.id === id);
    products[index] = product;
    writeProducts(products);
    
    res.json(product);
});

// DELETE /api/products/:id - удалить товар
app.delete("/api/products/:id", (req, res) => {
    const id = req.params.id;
    const products = readProducts();
    const exists = products.some(p => p.id === id);
    
    if (!exists) {
        return res.status(404).json({ error: "Product not found" });
    }
    
    const filtered = products.filter(p => p.id !== id);
    writeProducts(filtered);
    
    res.status(204).send();
});

// 404 для всех остальных маршрутов
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${port}`);
    console.log(`📦 Товары доступны по адресу: http://localhost:${port}/api/products`);
});