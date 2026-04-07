const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const options = {
    key: fs.readFileSync('localhost-key.pem'),
    cert: fs.readFileSync('localhost.pem')
};

const VAPID_PUBLIC_KEY = 'BBbUusq5VzDL-0Ny47Qm6OCaMweRpyQMJIzHpoFyRvv9r2cq8Yrx7ntu2OZglr-KHmzmgHrJTKb9v0hYif53SJw';
const VAPID_PRIVATE_KEY = 'XN9kHIYRsc2od-IOaFs80BhTDjHXhYYRj-jOv-MPxeg';

webpush.setVapidDetails(
    'mailto:mshulga07@gmail.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

let subscriptions = [];

const server = https.createServer(options, app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    console.log('Клиент подключён:', socket.id);

    socket.on('newTask', (task) => {
        console.log('Новая задача:', task);
        io.emit('taskAdded', task);

        const payload = JSON.stringify({
            title: 'Новая задача',
            body: task.text
        });

        subscriptions.forEach(sub => {
            webpush.sendNotification(sub, payload).catch(err => {
                console.error('Push error:', err);
                if (err.statusCode === 410) {
                    subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
                }
            });
        });
    });

    socket.on('disconnect', () => {
        console.log('Клиент отключён:', socket.id);
    });
});

app.post('/subscribe', (req, res) => {
    subscriptions.push(req.body);
    console.log('Подписка сохранена, всего:', subscriptions.length);
    res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
    console.log('Подписка удалена, осталось:', subscriptions.length);
    res.status(200).json({ message: 'Подписка удалена' });
});

const PORT = 3443;
server.listen(PORT, () => {
    console.log(`HTTPS сервер запущен на https://localhost:${PORT}`);
});