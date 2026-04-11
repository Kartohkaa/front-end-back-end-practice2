const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const studentBtn = document.getElementById('student-btn');
const enablePushBtn = document.getElementById('enable-push');
const disablePushBtn = document.getElementById('disable-push');

const socket = io('https://localhost:3443');

const VAPID_PUBLIC_KEY = 'BBbUusq5VzDL-0Ny47Qm6OCaMweRpyQMJIzHpoFyRvv9r2cq8Yrx7ntu2OZglr-KHmzmgHrJTKb9v0hYif53SJw';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push не поддерживается');
        return;
    }
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        await fetch('https://localhost:3443/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });
        console.log('Подписка на push отправлена');
    } catch (err) {
        console.error('Ошибка подписки на push:', err);
    }
}

async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
        await fetch('https://localhost:3443/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
        console.log('Отписка выполнена');
    }
}

function setActiveButton(activeId) {
    homeBtn.classList.remove('active');
    aboutBtn.classList.remove('active');
    studentBtn.classList.remove('active');
    document.getElementById(activeId).classList.add('active');
}

async function loadContent(page) {
    try {
        const response = await fetch(`/content/${page}.html`);
        const html = await response.text();
        contentDiv.innerHTML = html;
        
        if (page === 'home') {
            initNotes();
        }
    } catch (err) {
        contentDiv.innerHTML = '<div class="empty">Ошибка загрузки страницы</div>';
        console.error(err);
    }
}

homeBtn.addEventListener('click', () => {
    setActiveButton('home-btn');
    loadContent('home');
});

aboutBtn.addEventListener('click', () => {
    setActiveButton('about-btn');
    loadContent('about');
});

studentBtn.addEventListener('click', () => {
    setActiveButton('student-btn');
    loadContent('student');
});

loadContent('home');

socket.on('taskAdded', (task) => {
    console.log('Задача от другого клиента:', task);
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.textContent = `Новая задача: ${task.text}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
});

socket.on('reminderScheduled', (data) => {
    console.log('Напоминание запланировано:', data);
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.textContent = `Напоминание "${data.text}" запланировано на ${new Date(data.reminderTime).toLocaleString()}`;
    toast.style.background = '#4caf50';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
});

function initNotes() {
    const noteInput = document.getElementById('note-input');
    const addBtn = document.getElementById('add-btn');
    const reminderText = document.getElementById('reminder-text');
    const reminderTime = document.getElementById('reminder-time');
    const addReminderBtn = document.getElementById('add-reminder-btn');
    const notesContainer = document.getElementById('notes-container');
    const statsSpan = document.getElementById('stats');

    if (!noteInput || !addBtn || !notesContainer) {
        console.log('Элементы не найдены');
        return;
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function updateStats(notes) {
        const count = notes.length;
        if (statsSpan) {
            statsSpan.textContent = count + ' ' + getWordForm(count, 'заметка', 'заметки', 'заметок');
        }
    }

    function getWordForm(number, one, two, five) {
        let num = Math.abs(number);
        num %= 100;
        if (num >= 5 && num <= 20) return five;
        num %= 10;
        if (num === 1) return one;
        if (num >= 2 && num <= 4) return two;
        return five;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function loadNotes() {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        
        if (notes.length === 0) {
            notesContainer.innerHTML = '<div class="empty">Нет заметок. Создайте первую!</div>';
            updateStats([]);
            return;
        }
        
        notesContainer.innerHTML = notes.map((note, index) => {
            let reminderHtml = '';
            if (note.reminder) {
                reminderHtml = `<div style="font-size: 12px; color: #4caf50; margin-top: 4px;">Напоминание: ${formatDate(note.reminder)}</div>`;
            }
            return `
                <div class="note-item" data-index="${index}">
                    <div class="note-content">
                        <div class="note-text">${escapeHtml(note.text)}</div>
                        <div class="note-date">${note.date || ''}</div>
                        ${reminderHtml}
                    </div>
                    <button class="delete-btn btn btn-danger" data-index="${index}">Удалить</button>
                </div>
            `;
        }).join('');
        
        updateStats(notes);
    }

    function addNote(text, reminderTimestamp = null) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const newNote = {
            id: Date.now(),
            text: text.trim(),
            date: formatDate(Date.now()),
            reminder: reminderTimestamp
        };
        notes.unshift(newNote);
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
        
        if (reminderTimestamp) {
            socket.emit('newReminder', {
                id: newNote.id,
                text: text.trim(),
                reminderTime: reminderTimestamp
            });
        } else {
            socket.emit('newTask', { text: text.trim(), timestamp: Date.now() });
        }
    }

    function deleteNote(index) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notes.splice(index, 1);
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
    }

    notesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const index = parseInt(e.target.dataset.index);
            deleteNote(index);
        }
    });

    addBtn.addEventListener('click', () => {
        const text = noteInput.value.trim();
        if (text) {
            addNote(text);
            noteInput.value = '';
            noteInput.focus();
        }
    });

    noteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = noteInput.value.trim();
            if (text) {
                addNote(text);
                noteInput.value = '';
            }
        }
    });

    if (addReminderBtn) {
        addReminderBtn.addEventListener('click', () => {
            const text = reminderText.value.trim();
            const datetime = reminderTime.value;
            if (text && datetime) {
                const timestamp = new Date(datetime).getTime();
                if (timestamp > Date.now()) {
                    addNote(text, timestamp);
                    reminderText.value = '';
                    reminderTime.value = '';
                } else {
                    alert('Дата напоминания должна быть в будущем');
                }
            } else {
                alert('Введите текст и выберите дату/время');
            }
        });
    }

    const testNotes = JSON.parse(localStorage.getItem('notes') || '[]');
    if (testNotes.length === 0) {
        addNote('Добро пожаловать в офлайн заметки');
        addNote('WebSocket + Push уведомления');
        addNote('Добавьте задачу - уведомление придет на другие устройства');
    }
    
    loadNotes();
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('/sw.js');
            console.log('SW registered:', reg.scope);
            
            const subscription = await reg.pushManager.getSubscription();
            if (subscription) {
                enablePushBtn.style.display = 'none';
                disablePushBtn.style.display = 'inline-block';
            }
            
            enablePushBtn.addEventListener('click', async () => {
                if (Notification.permission === 'denied') {
                    alert('Уведомления запрещены. Разрешите их в настройках браузера.');
                    return;
                }
                if (Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                        alert('Необходимо разрешить уведомления.');
                        return;
                    }
                }
                await subscribeToPush();
                enablePushBtn.style.display = 'none';
                disablePushBtn.style.display = 'inline-block';
            });
            
            disablePushBtn.addEventListener('click', async () => {
                await unsubscribeFromPush();
                disablePushBtn.style.display = 'none';
                enablePushBtn.style.display = 'inline-block';
            });
            
        } catch (err) {
            console.log('SW registration failed:', err);
        }
    });
}