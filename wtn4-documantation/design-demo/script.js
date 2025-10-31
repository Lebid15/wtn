// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

themeToggle.addEventListener('click', () => {
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        themeToggle.querySelector('.icon').textContent = '☀️';
        themeToggle.querySelector('.label').textContent = 'Light Mode';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        themeToggle.querySelector('.icon').textContent = '🌙';
        themeToggle.querySelector('.label').textContent = 'Dark Mode';
        localStorage.setItem('theme', 'light');
    }
});

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    themeToggle.querySelector('.icon').textContent = '☀️';
    themeToggle.querySelector('.label').textContent = 'Light Mode';
}

// Direction Toggle (RTL/LTR)
const dirToggle = document.getElementById('dirToggle');
const html = document.documentElement;

dirToggle.addEventListener('click', () => {
    if (html.getAttribute('dir') === 'rtl') {
        html.setAttribute('dir', 'ltr');
        html.setAttribute('lang', 'en');
        dirToggle.querySelector('.label').textContent = 'العربية';
        localStorage.setItem('dir', 'ltr');
    } else {
        html.setAttribute('dir', 'rtl');
        html.setAttribute('lang', 'ar');
        dirToggle.querySelector('.label').textContent = 'English';
        localStorage.setItem('dir', 'rtl');
    }
});

// Load saved direction
const savedDir = localStorage.getItem('dir');
if (savedDir === 'ltr') {
    html.setAttribute('dir', 'ltr');
    html.setAttribute('lang', 'en');
    dirToggle.querySelector('.label').textContent = 'العربية';
}

// Modal Controls
const openModalBtn = document.getElementById('openModal');
const closeModalBtn = document.getElementById('closeModal');
const cancelModalBtn = document.getElementById('cancelModal');
const modalOverlay = document.getElementById('modalOverlay');

openModalBtn.addEventListener('click', () => {
    modalOverlay.classList.add('active');
});

closeModalBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
});

cancelModalBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
});

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
        modalOverlay.classList.remove('active');
    }
});
