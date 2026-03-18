// Utility Functions

export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: ${type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        z-index: 2000;
        animation: slideUp 0.3s ease-out;
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

export function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(new Date(date));
}

export function formatDateTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

export function getDateRange(filter) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate = null;
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    switch (filter) {
        case 'today':
            startDate = new Date(today);
            break;
        case '7days':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 7);
            break;
        case '30days':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 30);
            break;
        case '90days':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 90);
            break;
        default:
            return null;
    }

    return { startDate, endDate };
}

export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

export function validateForm(formData, rules) {
    const errors = {};

    for (const [field, rule] of Object.entries(rules)) {
        const value = formData[field];

        if (rule.required && (!value || value.toString().trim() === '')) {
            errors[field] = `${field} is required`;
        }

        if (rule.minLength && value && value.toString().length < rule.minLength) {
            errors[field] = `${field} must be at least ${rule.minLength} characters`;
        }

        if (rule.email && value && !validateEmail(value)) {
            errors[field] = `${field} is not valid`;
        }

        if (rule.min && value && Number(value) < rule.min) {
            errors[field] = `${field} must be at least ${rule.min}`;
        }
    }

    return errors;
}

export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export function generateUID() {
    return 'widget_' + Math.random().toString(36).substr(2, 9);
}

export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
