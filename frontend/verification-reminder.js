(() => {
    const emailVerified = localStorage.getItem('emailVerified');
    const authToken = localStorage.getItem('authToken');
    // Temporarily disabled until the production email domain is verified.
    // if (!authToken || emailVerified !== 'false') return;
    return;

    const reminderKey = 'verificationReminderShownAt';
    const oneHour = 60 * 60 * 1000;
    const lastShown = Number(localStorage.getItem(reminderKey) || 0);
    if (Date.now() - lastShown < oneHour) return;

    const apiBase = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        ? 'http://localhost:5000'
        : 'https://drivedocs-backend.onrender.com';

    const modal = document.createElement('div');
    modal.className = 'verification-reminder-backdrop';
    modal.innerHTML = `
        <section class="verification-reminder" role="dialog" aria-modal="true" aria-labelledby="verificationReminderTitle">
            <button class="verification-reminder-close" type="button" aria-label="Close">&times;</button>
            <p class="payment-label">Account security</p>
            <h2 id="verificationReminderTitle">Verify your email</h2>
            <p>Verify your email to keep your account secure and receive important DriveDocs updates.</p>
            <div class="verification-reminder-actions">
                <button class="primary-btn" id="verificationReminderButton" type="button">Send verification code</button>
                <button class="button-link" id="verificationReminderLater" type="button">Remind me later</button>
            </div>
            <p class="form-message" id="verificationReminderMessage" role="status"></p>
        </section>`;
    document.body.appendChild(modal);
    localStorage.setItem(reminderKey, String(Date.now()));

    const close = () => modal.remove();
    modal.querySelector('.verification-reminder-close').addEventListener('click', close);
    modal.querySelector('#verificationReminderLater').addEventListener('click', close);
    modal.addEventListener('click', event => {
        if (event.target === modal) close();
    });
    modal.querySelector('#verificationReminderButton').addEventListener('click', async event => {
        const button = event.currentTarget;
        const message = modal.querySelector('#verificationReminderMessage');
        button.disabled = true;
        button.textContent = 'Sending...';
        try {
            const response = await fetch(`${apiBase}/api/user/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Email: localStorage.getItem('userEmail') })
            });
            if (!response.ok) throw new Error();
            window.location.href = `./verify-email.html?email=${encodeURIComponent(localStorage.getItem('userEmail') || '')}`;
        } catch (error) {
            message.textContent = 'We could not send the code. Please try again.';
            button.disabled = false;
            button.textContent = 'Send verification code';
        }
    });
})();
