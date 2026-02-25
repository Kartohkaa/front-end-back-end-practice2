const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Подключаем Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

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

// ==================== SWAGGER КОНФИГУРАЦИЯ ====================

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - description
 *         - price
 *         - stock
 *       properties:
 *         id:
 *           type: string
 *           description: Автоматически сгенерированный ID товара
 *           example: "abc123"
 *         name:
 *           type: string
 *           description: Название товара
 *           example: "Ноутбук ASUS ROG Strix G15"
 *         category:
 *           type: string
 *           description: Категория товара
 *           example: "Электроника"
 *         description:
 *           type: string
 *           description: Описание товара
 *           example: "Игровой ноутбук с AMD Ryzen 7, 16GB RAM, RTX 3060"
 *         price:
 *           type: number
 *           description: Цена товара в рублях
 *           example: 89990
 *         stock:
 *           type: integer
 *           description: Количество на складе
 *           example: 15
 *         rating:
 *           type: number
 *           description: Рейтинг товара (0-5)
 *           example: 4.8
 */

// Swagger definition
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API интернет-магазина',
            version: '1.0.0',
            description: 'API для управления товарами в интернет-магазине',
        },
        servers: [
            {
                url: `http://localhost:${port}/api`,
                description: 'Локальный сервер',
            },
        ],
    },
    apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ==================== ВАЖНО: Swagger UI должен быть ПЕРЕД обработчиком 404 ====================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==================== МАРШРУТЫ API ====================

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

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Возвращает список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get("/api/products", (req, res) => {
    const products = readProducts();
    res.json(products);
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Получает товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Данные товара
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get("/api/products/:id", (req, res) => {
    const id = req.params.id;
    const result = findProductOr404(id, res);
    if (!result) return;
    res.json(result.product);
});

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Создает новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - description
 *               - price
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка в теле запроса
 */
app.post("/api/products", (req, res) => {
    const { name, category, description, price, stock, rating } = req.body;
    
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

/**
 * @swagger
 * /products/{id}:
 *   patch:
 *     summary: Обновляет данные товара
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *     responses:
 *       200:
 *         description: Обновленный товар
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Нет данных для обновления
 *       404:
 *         description: Товар не найден
 */
app.patch("/api/products/:id", (req, res) => {
    const id = req.params.id;
    const result = findProductOr404(id, res);
    if (!result) return;
    
    const { product, products } = result;
    const { name, category, description, price, stock, rating } = req.body;
    
    if (!name && !category && !description && !price && stock === undefined && rating === undefined) {
        return res.status(400).json({ error: "Nothing to update" });
    }
    
    if (name) product.name = name.trim();
    if (category) product.category = category.trim();
    if (description) product.description = description.trim();
    if (price) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (rating) product.rating = Number(rating);
    
    const index = products.findIndex(p => p.id === id);
    products[index] = product;
    writeProducts(products);
    
    res.json(product);
});

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Удаляет товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар успешно удален (нет тела ответа)
 *       404:
 *         description: Товар не найден
 */
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

// ==================== ЭТО ДОЛЖНО БЫТЬ В САМОМ КОНЦЕ ====================

// 404 для всех остальных маршрутов (включая те, что не подошли выше)
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
    console.log(` Сервер запущен на http://localhost:${port}`);
    console.log(` API товары: http://localhost:${port}/api/products`);
    console.log(` Swagger документация: http://localhost:${port}/api-docs`);
});