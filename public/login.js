let currentViewMode = 'login';
const API_BASE_URL = window.location.origin + "/api/v1";

function switchView(mode) {
    currentViewMode = mode;
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const actionBtn = document.getElementById('action-btn');
    const toast = document.getElementById('message-toast');
    
    toast.style.display = 'none';
    
    if (mode === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        actionBtn.innerText = "Authorize Session";
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        actionBtn.innerText = "Compile Admin Account";
    }
}

async function handleAuthSubmission(event) {
    event.preventDefault();
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const toast = document.getElementById('message-toast');
    
    toast.style.display = 'none';

    try {
        if (currentViewMode === 'register') {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || "Registration dropped.");
            
            showToast("Success! Admin profile created. Switching to sign-in panel...", "success");
            setTimeout(() => { switchView('login'); }, 1500);
            
        } else {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || "Credentials mapping failure.");
            
            // Store the authorization token
            const token = data.access_token || data.token || "LUQI-ADMIN-2026";
            localStorage.setItem("luqi_admin_token", token);
            sessionStorage.setItem("luqi_admin_token", token);
            showToast("Session authorized! Redirecting to Command Console...", "success");
            
            setTimeout(() => { window.location.href = "admin.html"; }, 1000);
        }
    } catch (error) {
        showToast(error.message, "error");
    }
}

function showToast(message, type) {
    const toast = document.getElementById('message-toast');
    toast.innerText = message;
    toast.style.display = 'block';
    toast.className = type === 'error' ? 'msg-error' : 'msg-success';
}
