const express = require('express');
const app = express();
const port = 3000;

let products = [
  { id: 1, name: 'Ноутбук', price: 89999 },
  { id: 2, name: 'Смартфон', price: 49999 },
  { id: 3, name: 'Наушники', price: 8999 }
];

// Middleware для парсинга JSON
app.use(express.json());

// Главная страница
app.get('/', (req, res) => {
  res.send('Главная страница');
});

// CRUD операции для товаров

// Создать товар
app.post('/products', (req, res) => {
  const { name, price } = req.body;
  const newProduct = {
    id: Date.now(),
    name,
    price
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// Получить все товары
app.get('/products', (req, res) => {
  res.send(JSON.stringify(products));
});

// Получить товар по id
app.get('/products/:id', (req, res) => {
  let product = products.find(p => p.id == req.params.id);
  res.send(JSON.stringify(product));
});

// Обновить товар
app.patch('/products/:id', (req, res) => {
  const product = products.find(p => p.id == req.params.id);
  const { name, price } = req.body;
  if (name !== undefined) product.name = name;
  if (price !== undefined) product.price = price;
  res.json(product);
});

// Удалить товар
app.delete('/products/:id', (req, res) => {
  products = products.filter(p => p.id != req.params.id);
  res.send('Ok');
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});