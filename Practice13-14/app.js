const noteInput = document.getElementById('note-input');
const addBtn = document.getElementById('add-btn');
const notesContainer = document.getElementById('notes-container');
const statsSpan = document.getElementById('stats');

function formatDate() {
    const now = new Date();
    return now.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateStats(notes) {
    const count = notes.length;
    statsSpan.textContent = count + ' ' + getWordForm(count, 'заметка', 'заметки', 'заметок');
}

function getWordForm(number, one, two, five) {
    const n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) return five;
    n %= 10;
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return two;
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
        notesContainer.innerHTML = '<div class="empty">Нет заметок. Зодумойтесь!</div>';
        updateStats([]);
        return;
    }
    
    notesContainer.innerHTML = notes.map((note, index) => `
        <div class="note-item" data-index="${index}">
            <div class="note-content">
                <div class="note-text">${escapeHtml(note.text)}</div>
                <div class="note-date">${note.date}</div>
            </div>
            <button class="delete-btn btn btn--danger btn-delete" data-index="${index}">Удалить</button>
        </div>
    `).join('');
    
    updateStats(notes);
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            deleteNote(index);
        });
    });
}

function addNote(text) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.unshift({
        id: Date.now(),
        text: text.trim(),
        date: formatDate()
    });
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();
}

function deleteNote(index) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.splice(index, 1);
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();
}

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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('ServiceWorker registered:', registration.scope);
        } catch (err) {
            console.error('ServiceWorker registration failed:', err);
        }
    });
}

loadNotes();

const testNotes = JSON.parse(localStorage.getItem('notes') || '[]');
if (testNotes.length === 0) {
    addNote('Добро пожаловать в офлайн заметки');
    addNote('Эта заметка доступна даже без интернета');
    addNote('Добавляйте и удаляйте - всё сохранится в localStorage');
}