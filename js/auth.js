import { supabase } from './supabase-config.js';
import { showNotification, validateEmail } from './utils.js';

let currentUser = null;

export async function initializeAuth() {
    let initialStateDone = false;

    try {
        const { data, error } = await supabase.auth.getUser();
        currentUser = data?.user || null;
    } catch (e) {
        console.error("Auth error:", e);
        currentUser = null;
    }

    if (currentUser) {
        showMainApp();
        // Notify app to navigate to dashboard on initial load
        window.dispatchEvent(new CustomEvent('app:login'));
    } else {
        showAuthPage();
    }

    initialStateDone = true;

    supabase.auth.onAuthStateChange((event, session) => {
        // Skip the INITIAL_SESSION event — already handled above via getUser()
        if (event === 'INITIAL_SESSION') return;

        const newUser = session?.user || null;
        const wasLoggedIn = !!currentUser;
        const isLoggedIn = !!newUser;
        currentUser = newUser;

        if (isLoggedIn && !wasLoggedIn) {
            // User just logged in — show app and navigate to dashboard
            showMainApp();
            window.dispatchEvent(new CustomEvent('app:login'));
        } else if (!isLoggedIn) {
            // User logged out
            showAuthPage();
        }
        // If already logged in (e.g. token refresh), do nothing
    });
}

function showAuthPage() {
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('app').innerHTML = `
        <div class="auth-container">
            <div class="auth-box">
                <h2>Welcome</h2>
                <p>Dashboard Builder Pro</p>
                
                <div id="error-message" class="error-message"></div>
                <div id="success-message" class="success-message"></div>
                
                <form id="auth-form">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    <button type="submit" class="btn" id="auth-submit">Login</button>
                </form>
                
                <div class="auth-link">
                    Don't have an account? <a onclick="showSignup()">Sign up</a>
                </div>
            </div>
        </div>
    `;

    document.getElementById('auth-form').addEventListener('submit', handleLogin);
    window.showSignup = showSignup;
}

function showSignup() {
    document.getElementById('app').innerHTML = `
        <div class="auth-container">
            <div class="auth-box">
                <h2>Create Account</h2>
                <p>Join Dashboard Builder Pro</p>
                
                <div id="error-message" class="error-message"></div>
                <div id="success-message" class="success-message"></div>
                
                <form id="signup-form">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" placeholder="At least 6 characters" required>
                    </div>
                    <div class="form-group">
                        <label for="confirm-password">Confirm Password</label>
                        <input type="password" id="confirm-password" name="confirmPassword" required>
                    </div>
                    <button type="submit" class="btn" id="signup-submit">Create Account</button>
                </form>
                
                <div class="auth-link">
                    Already have an account? <a onclick="showLogin()">Login</a>
                </div>
            </div>
        </div>
    `;

    document.getElementById('signup-form').addEventListener('submit', handleSignup);
    window.showLogin = showAuthPage;
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');

    errorDiv.classList.remove('show');

    if (!email || !password) {
        showError('Please fill all fields', errorDiv);
        return;
    }

    if (!validateEmail(email)) {
        showError('Please enter a valid email', errorDiv);
        return;
    }

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            showError(error.message, errorDiv);
        } else {
            showNotification('Login successful!');
        }
    } catch (error) {
        showError('An error occurred. Please try again.', errorDiv);
        console.error(error);
    }
}

async function handleSignup(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');

    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');

    if (!email || !password || !confirmPassword) {
        showError('Please fill all fields', errorDiv);
        return;
    }

    if (!validateEmail(email)) {
        showError('Please enter a valid email', errorDiv);
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters', errorDiv);
        return;
    }

    if (password !== confirmPassword) {
        showError('Passwords do not match', errorDiv);
        return;
    }

    try {
        const { error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            showError(error.message, errorDiv);
        } else {
            showSuccess('Account created! Please check your email to confirm.', successDiv);
            setTimeout(() => showAuthPage(), 2000);
        }
    } catch (error) {
        showError('An error occurred. Please try again.', errorDiv);
        console.error(error);
    }
}

function showError(message, element) {
    element.textContent = message;
    element.classList.add('show');
}

function showSuccess(message, element) {
    element.textContent = message;
    element.classList.add('show');
}

function showMainApp() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('app').innerHTML = '';
    document.getElementById('main-app').style.display = 'flex';
}

export async function handleLogout() {
    try {
        await supabase.auth.signOut();
        showNotification('Logged out successfully');
        showAuthPage();
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

export function getCurrentUser() {
    return currentUser;
}
