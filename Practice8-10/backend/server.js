const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

const ACCESS_SECRET = 'mirea_access_secret_2024';
const REFRESH_SECRET = 'mirea_refresh_secret_2024';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

app.use(express.json());
app.use(cors({
    origin: ["http://localhost:3001", "http://localhost:3002"],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

const productsFile = path.join(__dirname, 'products.json');
const usersFile = path.join(__dirname, 'users.json');
let refreshTokens = new Set(); 

function readProducts() {
    const data = fs.readFileSync(productsFile);
    return JSON.parse(data);
}

function writeProducts(products) {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
}

function readUsers() {
    if (!fs.existsSync(usersFile)) {
        fs.writeFileSync(usersFile, JSON.stringify([]));
    }
    const data = fs.readFileSync(usersFile);
    return JSON.parse(data);
}

function writeUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function generateAccessToken(user) {
    return jwt.sign(
        { 
            userId: user.id, 
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { userId: user.id },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, ACCESS_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
}

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "abc123"
 *         email:
 *           type: string
 *           example: "user@example.com"
 *         firstName:
 *           type: string
 *           example: "Иван"
 *         lastName:
 *           type: string
 *           example: "Петров"
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
 *           example: "prod123"
 *         name:
 *           type: string
 *           example: "Ноутбук ASUS"
 *         category:
 *           type: string
 *           example: "Электроника"
 *         description:
 *           type: string
 *           example: "Игровой ноутбук"
 *         price:
 *           type: number
 *           example: 89990
 *         stock:
 *           type: integer
 *           example: 15
 *         rating:
 *           type: number
 *           example: 4.8
 *     LoginResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         refreshToken:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         user:
 *           $ref: '#/components/schemas/User'
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API интернет-магазина с JWT',
            version: '1.0.0',
            description: 'API для управления товарами с авторизацией и refresh токенами',
        },
        servers: [
            {
                url: `http://localhost:${port}/api`,
                description: 'Локальный сервер',
            },
        ],
    },
    apis: [__filename],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *               firstName:
 *                 type: string
 *                 example: "Иван"
 *               lastName:
 *                 type: string
 *                 example: "Петров"
 *     responses:
 *       201:
 *         description: Пользователь создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Ошибка в данных
 */
app.post("/api/auth/register", async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email и пароль обязательны" });
    }

    const users = readUsers();
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "Email уже используется" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: nanoid(6),
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        passwordHash: hashedPassword
    };

    users.push(newUser);
    writeUsers(users);

    const { passwordHash, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Неверные данные
 */
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email и пароль обязательны" });
    }

    const users = readUsers();
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.add(refreshToken);

    const { passwordHash, ...userWithoutPassword } = user;
    res.json({ 
        accessToken, 
        refreshToken,
        user: userWithoutPassword 
    });
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Обновление токенов
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Новые токены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Недействительный refresh token
 */
app.post("/api/auth/refresh", (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token обязателен" });
    }

    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: "Недействительный refresh token" });
    }

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const users = readUsers();
        const user = users.find(u => u.id === payload.userId);

        if (!user) {
            return res.status(401).json({ error: "Пользователь не найден" });
        }

        refreshTokens.delete(refreshToken);
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        refreshTokens.add(newRefreshToken);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (err) {
        refreshTokens.delete(refreshToken);
        return res.status(401).json({ error: "Недействительный refresh token" });
    }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Выход из системы
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешный выход
 */
app.post("/api/auth/logout", (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
        refreshTokens.delete(refreshToken);
    }
    res.json({ message: "Выход выполнен успешно" });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Информация о текущем пользователе
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Не авторизован
 */
app.get("/api/auth/me", authenticateToken, (req, res) => {
    const users = readUsers();
    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
    }
    const { passwordHash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get("/api/products", (req, res) => {
    res.json(readProducts());
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get("/api/products/:id", authenticateToken, (req, res) => {
    const products = readProducts();
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
        return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
});

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
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
 *         description: Товар создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 */
app.post("/api/products", authenticateToken, (req, res) => {
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
 *     summary: Обновить товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
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
 *         description: Товар обновлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.patch("/api/products/:id", authenticateToken, (req, res) => {
    const products = readProducts();
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: "Product not found" });
    }

    const { name, category, description, price, stock, rating } = req.body;
    const updatedProduct = { ...products[index] };

    if (name) updatedProduct.name = name.trim();
    if (category) updatedProduct.category = category.trim();
    if (description) updatedProduct.description = description.trim();
    if (price) updatedProduct.price = Number(price);
    if (stock !== undefined) updatedProduct.stock = Number(stock);
    if (rating) updatedProduct.rating = Number(rating);

    products[index] = updatedProduct;
    writeProducts(products);
    res.json(updatedProduct);
});

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Товар удален
 *       404:
 *         description: Товар не найден
 */
app.delete("/api/products/:id", authenticateToken, (req, res) => {
    const products = readProducts();
    const filtered = products.filter(p => p.id !== req.params.id);

    if (filtered.length === products.length) {
        return res.status(404).json({ error: "Product not found" });
    }

    writeProducts(filtered);
    res.status(204).send();
});

app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});