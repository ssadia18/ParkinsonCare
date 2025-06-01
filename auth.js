// User authentication handling
class Auth {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('users')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    }

    register(username, email, password) {
        // Validate input
        if (!username || !email || !password) {
            throw new Error('All fields are required');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }

        // Validate password length
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Check if user already exists
        if (this.users.find(user => user.email === email)) {
            throw new Error('User with this email already exists');
        }

        // Create new user
        const user = {
            id: Date.now().toString(),
            username,
            email,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            assessments: []
        };

        this.users.push(user);
        localStorage.setItem('users', JSON.stringify(this.users));
        return user;
    }

    login(email, password) {
        // Validate input
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        const user = this.users.find(u => u.email === email);
        if (!user) {
            throw new Error('No user found with this email');
        }

        if (user.password !== this.hashPassword(password)) {
            throw new Error('Invalid password');
        }

        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // Simple password hashing (for demo purposes only)
    // In a real application, use proper password hashing like bcrypt
    hashPassword(password) {
        return btoa(password); // Base64 encoding (NOT secure for production)
    }

    addAssessment(assessment) {
        if (!this.currentUser) return;
        
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex === -1) return;

        this.users[userIndex].assessments.push({
            ...assessment,
            date: new Date().toISOString()
        });

        this.currentUser = this.users[userIndex];
        localStorage.setItem('users', JSON.stringify(this.users));
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    getAssessments() {
        return this.currentUser?.assessments || [];
    }
}

// Initialize auth
const auth = new Auth();

// Auth UI handling
function showAuthSection(section) {
    // Hide all sections first
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    // Show the requested section
    const targetSection = document.getElementById(section);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    try {
        const user = auth.register(username, email, password);
        auth.login(email, password);
        showAuthSection('home');
        updateAuthUI();
        // Clear form
        document.getElementById('registerForm').reset();
    } catch (error) {
        alert(error.message);
    }
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        auth.login(email, password);
        showAuthSection('home');
        updateAuthUI();
        // Clear form
        document.getElementById('loginForm').reset();
    } catch (error) {
        alert(error.message);
    }
}

function handleLogout() {
    auth.logout();
    showAuthSection('login');
    updateAuthUI();
}

function updateAuthUI() {
    const user = auth.getCurrentUser();
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');

    if (!authButtons || !userInfo) return;

    if (user) {
        authButtons.classList.add('hidden');
        userInfo.classList.remove('hidden');
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = user.username;
        }
    } else {
        authButtons.classList.remove('hidden');
        userInfo.classList.add('hidden');
    }
}

// Initialize auth UI
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const logoutButton = document.getElementById('logoutButton');

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    updateAuthUI();
    
    // Show login by default if not authenticated
    if (!auth.isAuthenticated()) {
        showAuthSection('login');
    }
}); 