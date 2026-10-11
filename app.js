document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    if (document.getElementById('certTableBody')) {
        fetchAndRenderTable();
        setupSearchFilter();
    }

    if (document.getElementById('recordForm')) {
        setupFormHandler();
    }
});

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '<i class="fas fa-check-circle" style="color: var(--success-text)"></i>' : '<i class="fas fa-exclamation-circle" style="color: var(--danger-text)"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function fetchAndRenderTable() {
    const tbody = document.getElementById('certTableBody');
    if (!tbody) return;

    try {
        const res = await fetch('/api/records');
        const data = await res.json();
        
        tbody.innerHTML = '';

        data.records.forEach(record => {
            let statusBadge = '';
            if (record.status === 'Expired') {
                statusBadge = '<span class="badge expired"><i class="fas fa-times-circle"></i> Expired</span>';
            } else if (record.status === 'Expiring Soon') {
                statusBadge = '<span class="badge warning"><i class="fas fa-exclamation-triangle"></i> Expiring Soon</span>';
            } else {
                statusBadge = '<span class="badge valid"><i class="fas fa-check-circle"></i> Valid</span>';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div style="font-weight: 500; color: var(--text-main);">${record.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">${record.employee_id}</div>
                </td>
                <td>
                    <div style="color: var(--text-main);">${record.loc}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">${record.dept}</div>
                </td>
                <td style="font-weight: 500;">${record.cert}</td>
                <td>${record.expiry}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="action-btn" onclick="deleteRecord(${record.record_id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('stat-total').innerText = data.stats.total || 0;
        document.getElementById('stat-valid').innerText = data.stats.valid || 0;
        document.getElementById('stat-warning').innerText = data.stats.warning || 0;
        document.getElementById('stat-expired').innerText = data.stats.expired || 0;

    } catch (err) {
        showToast('Error connecting to database server', 'error');
    }
}

function setupFormHandler() {
    const form = document.getElementById('recordForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;

        const issueDateVal = document.getElementById('issueDate') ? document.getElementById('issueDate').value : '';
        const expiryDateVal = document.getElementById('expiryDate') ? document.getElementById('expiryDate').value : '';

        if (issueDateVal && expiryDateVal && issueDateVal >= expiryDateVal) {
            showToast('Issue Date must be earlier than Expiry Date', 'error');
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save to Database';
            submitBtn.disabled = false;
            return;
        }

        const payload = {
            id: document.getElementById('empId').value.trim(),
            name: document.getElementById('empName').value.trim(),
            dept: document.getElementById('empDept').value.trim(),
            loc: document.getElementById('empLoc').value.trim(),
            cert: document.getElementById('certName').value.trim(),
            issueDate: issueDateVal,
            expiry: expiryDateVal
        };

        try {
            const res = await fetch('/api/records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                showToast('Record saved to database!');
                form.reset();
                if (document.getElementById('certTableBody')) {
                    fetchAndRenderTable();
                }
            } else {
                showToast(data.error || 'Failed to insert record', 'error');
            }
        } catch (err) {
            showToast('Database connection error', 'error');
        } finally {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save to Database';
            submitBtn.disabled = false;
        }
    });
}

window.deleteRecord = async function(recordId) {
    if (confirm('Delete this compliance record from database?')) {
        try {
            const res = await fetch(`/api/records/${recordId}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Record deleted.', 'error');
                fetchAndRenderTable();
            }
        } catch (err) {
            showToast('Error deleting record', 'error');
        }
    }
};

function setupSearchFilter() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#certTableBody tr');
        
        rows.forEach(row => {
            const textContent = row.textContent.toLowerCase();
            row.style.display = textContent.includes(term) ? '' : 'none';
        });
    });
}