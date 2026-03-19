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
        // Добавляем тестовых пользователей с ролями
        const defaultUsers = [
            {
                id: nanoid(6),
                email: 'admin@shop.ru',
                firstName: 'Admin',
                lastName: 'Adminov',
                role: 'admin',
                isBlocked: false,
                passwordHash: bcrypt.hashSync('admin123', 10)
            },
            {
                id: nanoid(6),
                email: 'seller@shop.ru',
                firstName: 'Seller',
                lastName: 'Sellersky',
                role: 'seller',
                isBlocked: false,
                passwordHash: bcrypt.hashSync('seller123', 10)
            },
            {
                id: nanoid(6),
                email: 'user@shop.ru',
                firstName: 'User',
                lastName: 'Userov',
                role: 'user',
                isBlocked: false,
                passwordHash: bcrypt.hashSync('user123', 10)
            }
        ];
        fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2));
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
            lastName: user.lastName,
            role: user.role || 'user' // ДОБАВЛЕНО поле role
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

function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуется роль: ' + allowedRoles.join(', ') });
        }
        next();
    };
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
 *         role:
 *           type: string
 *           example: "user"
 *         isBlocked:
 *           type: boolean
 *           example: false
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
        role: 'user', // ДОБАВЛЕНО: роль по умолчанию
        isBlocked: false, // ДОБАВЛЕНО: поле блокировки
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

    if (user.isBlocked) {
        return res.status(403).json({ error: "Пользователь заблокирован" });
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

        if (user.isBlocked) {
            return res.status(403).json({ error: "Пользователь заблокирован" });
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
 * /users:
 *   get:
 *     summary: Получить список всех пользователей (только admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       403:
 *         description: Доступ запрещен
 */
app.get("/api/users", authenticateToken, roleMiddleware(['admin']), (req, res) => {
    const users = readUsers();
    const usersWithoutPasswords = users.map(({ passwordHash, ...user }) => user);
    res.json(usersWithoutPasswords);
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Получить пользователя по ID (только admin)
 *     tags: [Users]
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
 *         description: Данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Пользователь не найден
 */
app.get("/api/users/:id", authenticateToken, roleMiddleware(['admin']), (req, res) => {
    const users = readUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
    }
    const { passwordHash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Обновить информацию пользователя (только admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, seller, admin]
 *     responses:
 *       200:
 *         description: Пользователь обновлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Недопустимая роль
 *       404:
 *         description: Пользователь не найден
 */
app.put("/api/users/:id", authenticateToken, roleMiddleware(['admin']), (req, res) => {
    const users = readUsers();
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: "Пользователь не найден" });
    }

    const { firstName, lastName, email, role } = req.body;
    
    if (role && !['user', 'seller', 'admin'].includes(role)) {
        return res.status(400).json({ error: "Недопустимая роль" });
    }

    users[index] = {
        ...users[index],
        firstName: firstName || users[index].firstName,
        lastName: lastName || users[index].lastName,
        email: email || users[index].email,
        role: role || users[index].role
    };

    writeUsers(users);
    
    const { passwordHash, ...userWithoutPassword } = users[index];
    res.json(userWithoutPassword);
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Удалить пользователя (только admin)
 *     tags: [Users]
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
 *         description: Пользователь удален
 *       400:
 *         description: Нельзя удалить самого себя
 *       404:
 *         description: Пользователь не найден
 */
app.delete("/api/users/:id", authenticateToken, roleMiddleware(['admin']), (req, res) => {
    const users = readUsers();
    
    if (req.params.id === req.user.userId) {
        return res.status(400).json({ error: "Нельзя удалить самого себя" });
    }

    const filtered = users.filter(u => u.id !== req.params.id);
    
    if (filtered.length === users.length) {
        return res.status(404).json({ error: "Пользователь не найден" });
    }

    writeUsers(filtered);
    res.status(204).send();
});

/**
 * @swagger
 * /users/{id}/block:
 *   patch:
 *     summary: Заблокировать/разблокировать пользователя (только admin)
 *     tags: [Users]
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
 *         description: Статус пользователя изменен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Нельзя заблокировать самого себя
 *       404:
 *         description: Пользователь не найден
 */
app.patch("/api/users/:id/block", authenticateToken, roleMiddleware(['admin']), (req, res) => {
    const users = readUsers();
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
    }

    if (req.params.id === req.user.userId) {
        return res.status(400).json({ error: "Нельзя заблокировать самого себя" });
    }

    user.isBlocked = !user.isBlocked;
    writeUsers(users);
    
    res.json({ message: `Пользователь ${user.isBlocked ? 'заблокирован' : 'разблокирован'}` });
});

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Список всех товаров (доступно всем)
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
 *     summary: Получить товар по ID (доступно авторизованным пользователям)
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
 *     summary: Создать новый товар (только seller и admin)
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
 *       403:
 *         description: Доступ запрещен
 */
app.post("/api/products", authenticateToken, roleMiddleware(['seller', 'admin']), (req, res) => {
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
 *     summary: Обновить товар (только seller и admin)
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
app.patch("/api/products/:id", authenticateToken, roleMiddleware(['seller', 'admin']), (req, res) => {
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
 *     summary: Удалить товар (только admin)
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
app.delete("/api/products/:id", authenticateToken, roleMiddleware(['admin']), (req, res) => {
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
    console.log('Test accounts:');
    console.log('admin@shop.ru / admin123');
    console.log('seller@shop.ru / seller123');
    console.log('user@shop.ru / user123');
});