// Global variables
let transactions = [];
let currentUser = null;
let sessionStartTime = null;
let notifications = [];

// DOM elements
const loginModal = document.getElementById('loginModal');
const mainContainer = document.getElementById('mainContainer');
const loginName = document.getElementById('loginName');
const loginBtn = document.getElementById('loginBtn');
const userNameDisplay = document.getElementById('userNameDisplay');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkLoginStatus();
});

// Initialize the application
function initializeApp() {
    loadData();
    cleanOldData();
    updateDisplay();
    startSessionTimer();
    
    // Initialize PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully');
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
    
    // Check for install prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const installBtn = document.getElementById('installAppBtn');
        if (installBtn) {
            installBtn.style.display = 'block';
            installBtn.addEventListener('click', () => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    }
                    deferredPrompt = null;
                    installBtn.style.display = 'none';
                });
            });
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Login
    loginBtn.addEventListener('click', handleLogin);
    loginName.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Transaction management
    document.getElementById('addItemBtn').addEventListener('click', addTransaction);
    document.getElementById('itemName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTransaction();
        }
    });
    document.getElementById('itemPrice').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTransaction();
        }
    });
    
    // Actions
    document.getElementById('exportPdfBtn').addEventListener('click', showExportOptions);
    document.getElementById('shareBtn').addEventListener('click', shareData);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllTransactions);
    document.getElementById('viewAllBtn').addEventListener('click', viewAllTransactions);
}

// Check login status
function checkLoginStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        loginModal.style.display = 'none';
        mainContainer.style.display = 'block';
        userNameDisplay.textContent = currentUser;
        addNotification('تم تسجيل الدخول بنجاح', 'success');
    } else {
        loginModal.style.display = 'flex';
        mainContainer.style.display = 'none';
    }
}

// Handle login
function handleLogin() {
    const name = loginName.value.trim();
    if (name.length < 2) {
        addNotification('يرجى إدخال اسم صحيح (حرفين على الأقل)', 'error');
        return;
    }
    
    currentUser = name;
    localStorage.setItem('currentUser', currentUser);
    loginModal.style.display = 'none';
    mainContainer.style.display = 'block';
    userNameDisplay.textContent = currentUser;
    
    addNotification(`مرحباً ${name}! تم تسجيل الدخول بنجاح`, 'success');
    
    // Clear login form
    loginName.value = '';
}

// Handle logout
function handleLogout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        loginModal.style.display = 'flex';
        mainContainer.style.display = 'none';
        addNotification('تم تسجيل الخروج بنجاح', 'info');
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Add transaction
function addTransaction() {
    const name = document.getElementById('itemName').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);
    const type = document.getElementById('transactionType').value;
    
    if (!name || isNaN(price) || price <= 0) {
        addNotification('يرجى إدخال بيانات صحيحة', 'error');
        return;
    }
    
    const transaction = {
        id: Date.now(),
        name: name,
        price: price,
        type: type,
        timestamp: new Date().toISOString(),
        user: currentUser
    };
    
    transactions.unshift(transaction);
    saveData();
    updateDisplay();
    
    // Clear form
    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    
    addNotification(`تم إضافة ${type === 'income' ? 'دخل' : 'خرج'} بقيمة ${price.toFixed(2)} د.ج`, 'success');
}

// Delete transaction
function deleteTransaction(id) {
    if (confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
        if (confirm('تأكيد ثاني: هل أنت متأكد؟')) {
            if (confirm('تأكيد ثالث وأخير: هل أنت متأكد من الحذف؟')) {
                transactions = transactions.filter(t => t.id !== id);
                saveData();
                updateDisplay();
                addNotification('تم حذف المعاملة بنجاح', 'success');
            }
        }
    }
}

// Update display
function updateDisplay() {
    updateQuickSummary();
    updateTransactionsList();
    updateAnalytics();
    updateNotifications();
}

// Update quick summary
function updateQuickSummary() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.price, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.price, 0);
    const balance = income - expense;
    
    document.getElementById('quickIncome').textContent = `${income.toFixed(2)} د.ج`;
    document.getElementById('quickExpense').textContent = `${expense.toFixed(2)} د.ج`;
    document.getElementById('quickBalance').textContent = `${balance.toFixed(2)} د.ج`;
}

// Update transactions list
function updateTransactionsList() {
    const itemsList = document.getElementById('itemsList');
    const recentTransactions = transactions.slice(0, 10);
    
    if (recentTransactions.length === 0) {
        itemsList.innerHTML = '<div class="empty-state">لا توجد معاملات بعد</div>';
        return;
    }
    
    itemsList.innerHTML = recentTransactions.map(transaction => `
        <div class="item-card ${transaction.type}">
            <div class="item-info">
                <div class="item-name">${transaction.name}</div>
                <div class="item-time">${formatTime(transaction.timestamp)}</div>
            </div>
            <div class="item-actions">
                <div class="item-price">${transaction.type === 'income' ? '+' : '-'}${transaction.price.toFixed(2)} د.ج</div>
                <button class="delete-btn" onclick="deleteTransaction(${transaction.id})" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Update analytics
function updateAnalytics() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.price, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.price, 0);
    const balance = income - expense;
    const transactionCount = transactions.length;
    const avgTransaction = transactionCount > 0 ? (income + expense) / transactionCount : 0;
    const profitMargin = income > 0 ? ((income - expense) / income * 100) : 0;
    
    document.getElementById('totalIncome').textContent = `${income.toFixed(2)} دينار`;
    document.getElementById('totalExpense').textContent = `${expense.toFixed(2)} دينار`;
    document.getElementById('totalBalance').textContent = `${balance.toFixed(2)} دينار`;
    document.getElementById('transactionCount').textContent = transactionCount;
    document.getElementById('avgTransaction').textContent = `${avgTransaction.toFixed(2)} دينار`;
    document.getElementById('profitMargin').textContent = `${profitMargin.toFixed(1)}%`;
    
    // Update trends
    document.getElementById('incomeTrend').textContent = income > 0 ? `+${income.toFixed(0)}%` : '0%';
    document.getElementById('expenseTrend').textContent = expense > 0 ? `+${expense.toFixed(0)}%` : '0%';
    document.getElementById('balanceTrend').textContent = balance > 0 ? `+${balance.toFixed(0)}%` : '0%';
}

// Add notification
function addNotification(message, type = 'info') {
    const notification = {
        id: Date.now(),
        message: message,
        type: type,
        timestamp: new Date().toISOString()
    };
    
    notifications.unshift(notification);
    
    // Keep only last 20 notifications
    if (notifications.length > 20) {
        notifications = notifications.slice(0, 20);
    }
    
    saveData();
    updateNotifications();
}

// Update notifications
function updateNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = '<div class="empty-state">لا توجد تنبيهات</div>';
        return;
    }
    
    notificationsList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.type}">
            <div class="notification-icon">
                <i class="fas fa-${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${formatTime(notification.timestamp)}</div>
            </div>
            <button class="notification-close" onclick="deleteNotification(${notification.id})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Get notification icon
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Delete notification
function deleteNotification(id) {
    notifications = notifications.filter(n => n.id !== id);
    saveData();
    updateNotifications();
}

// Show export options
function showExportOptions() {
    // Redirect to reports page
    window.location.href = 'reports.html';
}

// Export to PDF
function exportToPDF() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.price, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.price, 0);
    const balance = income - expense;
    
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px;">
            <h1 style="color: #333; text-align: center;">تقرير المعاملات المالية</h1>
            <div style="margin: 20px 0;">
                <p><strong>اسم المستخدم:</strong> ${currentUser}</p>
                <p><strong>التاريخ:</strong> ${new Date().toLocaleDateString('en-US')}</p>
                <p><strong>الوقت:</strong> ${new Date().toLocaleTimeString('en-US')}</p>
            </div>
            
            <div style="margin: 20px 0;">
                <h3>ملخص المعاملات:</h3>
                <p><strong>إجمالي الدخل:</strong> ${income.toFixed(2)} دينار</p>
                <p><strong>إجمالي الخرج:</strong> ${expense.toFixed(2)} دينار</p>
                <p><strong>الرصيد النهائي:</strong> ${balance.toFixed(2)} دينار</p>
                <p><strong>عدد المعاملات:</strong> ${transactions.length}</p>
            </div>
            
            <div style="margin: 20px 0;">
                <h3>تفاصيل المعاملات:</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="border: 1px solid #ddd; padding: 8px;">الوصف</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">النوع</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">المبلغ</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">التاريخ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(t => `
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px;">${t.name}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${t.type === 'income' ? 'دخل' : 'خرج'}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${t.price.toFixed(2)} دينار</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${new Date(t.timestamp).toLocaleDateString('en-US')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 30px; text-align: center; color: #666;">
                <p>تم إنشاء هذا التقرير بواسطة نظام إدارة الكاشير</p>
                <p>المطور: أمير لباز</p>
            </div>
        </div>
    `;
    
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    document.body.appendChild(element);
    
    const opt = {
        margin: 1,
        filename: `تقرير_معاملات_${currentUser}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
        document.body.removeChild(element);
        addNotification('تم تصدير التقرير كـ PDF بنجاح', 'success');
    });
}

// Export to HTML
function exportToHTML() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.price, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.price, 0);
    const balance = income - expense;
    
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>تقرير المعاملات المالية</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
                .header { text-align: center; margin-bottom: 30px; }
                .summary { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
                th { background-color: #667eea; color: white; }
                .income { color: #28a745; }
                .expense { color: #dc3545; }
                .footer { text-align: center; margin-top: 30px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>تقرير المعاملات المالية</h1>
                <p><strong>اسم المستخدم:</strong> ${currentUser}</p>
                <p><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-SA')}</p>
                <p><strong>الوقت:</strong> ${new Date().toLocaleTimeString('ar-SA')}</p>
            </div>
            
            <div class="summary">
                <h3>ملخص المعاملات:</h3>
                <p><strong>إجمالي الدخل:</strong> <span class="income">${income.toFixed(2)} دينار</span></p>
                <p><strong>إجمالي الخرج:</strong> <span class="expense">${expense.toFixed(2)} دينار</span></p>
                <p><strong>الرصيد النهائي:</strong> <strong>${balance.toFixed(2)} دينار</strong></p>
                <p><strong>عدد المعاملات:</strong> ${transactions.length}</p>
            </div>
            
            <h3>تفاصيل المعاملات:</h3>
            <table>
                <thead>
                    <tr>
                        <th>الوصف</th>
                        <th>النوع</th>
                        <th>المبلغ</th>
                        <th>التاريخ</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(t => `
                        <tr>
                            <td>${t.name}</td>
                            <td>${t.type === 'income' ? 'دخل' : 'خرج'}</td>
                            <td class="${t.type}">${t.price.toFixed(2)} دينار</td>
                            <td>${new Date(t.timestamp).toLocaleDateString('ar-SA')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p>تم إنشاء هذا التقرير بواسطة نظام إدارة الكاشير</p>
                <p>المطور: أمير لباز</p>
            </div>
        </body>
        </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_معاملات_${currentUser}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addNotification('تم تصدير التقرير كـ HTML بنجاح', 'success');
}

// Share data
function shareData() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.price, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.price, 0);
    const balance = income - expense;
    
    const message = `Daily Financial Report - ${currentUser}
    
Total Income: ${income.toFixed(2)} دينار
Total Expense: ${expense.toFixed(2)} دينار
Final Balance: ${balance.toFixed(2)} دينار
Number of Transactions: ${transactions.length}

Date: ${new Date().toLocaleDateString('en-US')}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Daily Financial Report',
            text: message,
            url: window.location.href
        }).then(() => {
            addNotification('تم مشاركة التقرير بنجاح', 'success');
        }).catch(() => {
            copyToClipboard(message);
        });
    } else {
        copyToClipboard(message);
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            addNotification('تم نسخ التقرير إلى الحافظة', 'success');
        }).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

// Fallback copy to clipboard
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        addNotification('تم نسخ التقرير إلى الحافظة', 'success');
    } catch (err) {
        addNotification('فشل في نسخ التقرير', 'error');
    }
    
    document.body.removeChild(textArea);
}

// Clear all transactions
function clearAllTransactions() {
    if (confirm('هل أنت متأكد من مسح جميع المعاملات؟')) {
        if (confirm('تأكيد ثاني: هل أنت متأكد؟')) {
            if (confirm('تأكيد ثالث وأخير: هل أنت متأكد من المسح؟')) {
                transactions = [];
                saveData();
                updateDisplay();
                addNotification('تم مسح جميع المعاملات بنجاح', 'success');
            }
        }
    }
}

// View all transactions
function viewAllTransactions() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.price, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.price, 0);
    const balance = income - expense;
    
    let message = `Today's Transactions - ${currentUser}\n\n`;
    message += `Total Income: ${income.toFixed(2)} دينار\n`;
    message += `Total Expense: ${expense.toFixed(2)} دينار\n`;
    message += `Final Balance: ${balance.toFixed(2)} دينار\n\n`;
    message += `Transaction Details:\n`;
    
    transactions.forEach((t, index) => {
        message += `${index + 1}. ${t.name} - ${t.type === 'income' ? '+' : '-'}${t.price.toFixed(2)} دينار (${new Date(t.timestamp).toLocaleDateString('en-US')})\n`;
    });
    
    alert(message);
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('notifications', JSON.stringify(notifications));
}

// Load data from localStorage
function loadData() {
    const savedTransactions = localStorage.getItem('transactions');
    const savedNotifications = localStorage.getItem('notifications');
    
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
    }
    
    if (savedNotifications) {
        notifications = JSON.parse(savedNotifications);
    }
}

// Clean old data (older than today)
function cleanOldData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const originalLength = transactions.length;
    transactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.timestamp);
        transactionDate.setHours(0, 0, 0, 0);
        return transactionDate.getTime() === today.getTime();
    });
    
    if (originalLength !== transactions.length) {
        localStorage.setItem('transactions', JSON.stringify(transactions));
        addNotification(`تم حذف ${originalLength - transactions.length} معاملة قديمة تلقائياً`, 'info');
    }
}

// Format time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

// Start session timer
function startSessionTimer() {
    sessionStartTime = new Date();
    setInterval(updateSessionDuration, 1000);
}

// Update session duration
function updateSessionDuration() {
    if (sessionStartTime) {
        const duration = Math.floor((new Date() - sessionStartTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        document.getElementById('sessionDuration').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to add transaction
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        addTransaction();
    }
    
    // Ctrl/Cmd + E to export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        showExportOptions();
    }
    
    // Ctrl/Cmd + S to share
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        shareData();
    }
});

// Touch events for mobile
document.addEventListener('touchstart', function() {}, { passive: true });
document.addEventListener('touchmove', function() {}, { passive: true }); 