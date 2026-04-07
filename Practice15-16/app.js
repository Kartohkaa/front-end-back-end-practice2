const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');

function setActiveButton(activeId) {
    homeBtn.classList.remove('active');
    aboutBtn.classList.remove('active');
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

loadContent('home');

function initNotes() {
    const noteInput = document.getElementById('note-input');
    const addBtn = document.getElementById('add-btn');
    const notesContainer = document.getElementById('notes-container');
    const statsSpan = document.getElementById('stats');

    if (!noteInput || !addBtn || !notesContainer) {
        console.log('Элементы не найдены, возможно home.html не загружен');
        return;
    }

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
        
        notesContainer.innerHTML = notes.map((note, index) => `
            <div class="note-item" data-index="${index}">
                <div class="note-content">
                    <div class="note-text">${escapeHtml(note.text)}</div>
                    <div class="note-date">${note.date}</div>
                </div>
                <button class="delete-btn btn btn-danger" data-index="${index}">Удалить</button>
            </div>
        `).join('');
        
        updateStats(notes);
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

    const testNotes = JSON.parse(localStorage.getItem('notes') || '[]');
    if (testNotes.length === 0) {
        addNote('Добро пожаловать в офлайн заметки');
        addNote('App Shell архитектура - мгновенная загрузка');
        addNote('Приложение работает по HTTPS');
    }
    
    loadNotes();
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('ServiceWorker registered:', reg.scope))
            .catch(err => console.log('ServiceWorker registration failed:', err));
    });
}