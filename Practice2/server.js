const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

let products = [
  { id: 1, name: 'Ноутбук', price: 89999 },
  { id: 2, name: 'Смартфон', price: 49999 },
  { id: 3, name: 'Наушники', price: 8999 }
];

app.get('/products', (req, res) => {
  res.json(products);
});

app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  res.json(product);
});

app.post('/products', (req, res) => {
  const { name, price } = req.body;
  const newProduct = {
    id: Date.now(),
    name,
    price: Number(price)
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.put('/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  const { name, price } = req.body;
  if (name !== undefined) product.name = name;
  if (price !== undefined) product.price = Number(price);
  res.json(product);
});

app.delete('/products/:id', (req, res) => {
  const productIndex = products.findIndex(p => p.id === parseInt(req.params.id));
  if (productIndex === -1) return res.status(404).json({ error: 'Товар не найден' });
  products.splice(productIndex, 1);
  res.json({ message: 'Товар удалён' });
});

app.listen(port, () => {
  console.log(`Сервер: http://localhost:${port}`);
});