const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');

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
const reminders = new Map();
const REMINDERS_FILE = './reminders.json';

function saveReminders() {
    const data = [];
    for (const [id, reminder] of reminders) {
        data.push({
            id,
            text: reminder.text,
            reminderTime: reminder.reminderTime,
            timeoutDelay: reminder.timeoutDelay
        });
    }
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(data, null, 2));
}

function loadReminders() {
    if (!fs.existsSync(REMINDERS_FILE)) return;
    
    const data = JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf8'));
    for (const item of data) {
        const now = Date.now();
        const delay = item.reminderTime - now;
        
        if (delay > 0) {
            const timeoutId = setTimeout(() => {
                sendReminder(item.id, item.text);
            }, delay);
            
            reminders.set(item.id, {
                timeoutId,
                text: item.text,
                reminderTime: item.reminderTime,
                timeoutDelay: delay
            });
            console.log(`Восстановлено напоминание: ${item.text}, через ${Math.round(delay / 60000)} мин`);
        } else {
            console.log(`Просрочено напоминание: ${item.text}`);
        }
    }
}

function sendReminder(id, text) {
    const payload = JSON.stringify({
        title: 'Напоминание',
        body: text,
        reminderId: id
    });
    
    subscriptions.forEach(sub => {
        webpush.sendNotification(sub, payload).catch(err => {
            console.error('Push error:', err);
            if (err.statusCode === 410) {
                subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
            }
        });
    });
    
    reminders.delete(id);
    saveReminders();
    console.log('Напоминание отправлено, id:', id);
}

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

    socket.on('newReminder', (reminder) => {
        console.log('Новое напоминание:', reminder);
        const { id, text, reminderTime } = reminder;
        const delay = reminderTime - Date.now();
        
        if (delay <= 0) {
            console.log('Напоминание уже просрочено');
            return;
        }
        
        const timeoutId = setTimeout(() => {
            sendReminder(id, text);
        }, delay);
        
        reminders.set(id, {
            timeoutId,
            text,
            reminderTime,
            timeoutDelay: delay
        });
        
        saveReminders();
        io.emit('reminderScheduled', { id, text, reminderTime });
        console.log(`Напоминание запланировано через ${Math.round(delay / 60000)} минут`);
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

app.post('/snooze', (req, res) => {
    const reminderId = parseInt(req.query.reminderId, 10);
    console.log('Snooze запрос для reminderId:', reminderId);
    
    if (!reminderId || !reminders.has(reminderId)) {
        return res.status(404).json({ error: 'Reminder not found' });
    }
    
    const reminder = reminders.get(reminderId);
    clearTimeout(reminder.timeoutId);
    
    const newDelay = 5 * 60 * 1000;
    const newTimeoutId = setTimeout(() => {
        sendReminder(reminderId, reminder.text);
    }, newDelay);
    
    reminders.set(reminderId, {
        timeoutId: newTimeoutId,
        text: reminder.text,
        reminderTime: Date.now() + newDelay,
        timeoutDelay: newDelay
    });
    
    saveReminders();
    console.log(`Напоминание отложено на 5 минут, id: ${reminderId}`);
    res.status(200).json({ message: 'Reminder snoozed for 5 minutes' });
});

const PORT = 3443;
server.listen(PORT, () => {
    console.log(`HTTPS сервер запущен на https://localhost:${PORT}`);
    loadReminders();
});