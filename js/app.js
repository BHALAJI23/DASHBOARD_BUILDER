import { initializeAuth, handleLogout, getCurrentUser } from './auth.js';
import { initializeOrders } from './orders.js';
import { initializeDashboard, resetDashboard } from './dashboard.js';

// Initialize app
async function initApp() {
    await initializeAuth();

    // Auto-navigate to dashboard on login (fired by auth.js)
    window.addEventListener('app:login', () => {
        navigateTo('dashboard');
    });

    // Add event listeners for navigation
    document.addEventListener('click', (e) => {
        if (e.target.id === 'orders-btn') {
            navigateTo('orders');
        } else if (e.target.id === 'dashboard-btn') {
            navigateTo('dashboard');
        } else if (e.target.id === 'logout-btn') {
            resetDashboard();
            handleLogout();
        }
    });
}

function navigateTo(section) {
    const ordersSection = document.getElementById('orders-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const ordersBtn = document.getElementById('orders-btn');
    const dashboardBtn = document.getElementById('dashboard-btn');

    if (section === 'orders') {
        ordersSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        ordersBtn.classList.add('active');
        dashboardBtn.classList.remove('active');
        initializeOrders();
    } else {
        ordersSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        dashboardBtn.classList.add('active');
        ordersBtn.classList.remove('active');
        initializeDashboard();
    }
}

initApp();
