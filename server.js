const express = require('express');
const { Pool } = require('pg');
const path = require('path');

try {
    require('dotenv').config();
} catch (e) {}

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname)));

const databaseUrl = process.env.DATABASE_URL;
console.log('DATABASE_URL loaded:', Boolean(databaseUrl));

// Cloud deployment requires DATABASE_URL. Local fallback is retained for optional local development.
const pool = new Pool({
    connectionString: databaseUrl || 'postgres://postgres:postgres@localhost:5432/cert_tracker',
    // Supabase's hosted PostgreSQL requires TLS.
    ssl: databaseUrl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
});

// Demo mode lets you preview the application without installing PostgreSQL.
// Data is stored in memory and resets when the server restarts. Set DATABASE_URL
// to use your real Supabase database instead.
const demoMode = !databaseUrl;
let demoRecords = [
    { record_id: 1, employee_id: 'EMP-1042', name: 'Aarav Sharma', dept: 'Engineering', loc: 'Hyderabad', cert: 'AWS Solutions Architect', expiry: '2027-08-15', status: 'Valid' },
    { record_id: 2, employee_id: 'EMP-1043', name: 'Diya Reddy', dept: 'Human Resources', loc: 'Hyderabad', cert: 'First Aid Certification', expiry: '2026-11-02', status: 'Expiring Soon' },
    { record_id: 3, employee_id: 'EMP-1044', name: 'Arjun Rao', dept: 'Operations', loc: 'Bengaluru', cert: 'Workplace Safety', expiry: '2025-12-10', status: 'Expired' },
    { record_id: 4, employee_id: 'EMP-1045', name: 'Meera Nair', dept: 'Engineering', loc: 'Kochi', cert: 'Microsoft Azure Fundamentals', expiry: '2027-04-21', status: 'Valid' }
];
let nextDemoId = 5;
function getDemoStats() {
    return {
        total: demoRecords.length,
        valid: demoRecords.filter(r => r.status === 'Valid').length,
        warning: demoRecords.filter(r => r.status === 'Expiring Soon').length,
        expired: demoRecords.filter(r => r.status === 'Expired').length
    };
}

app.get('/health', async (req, res) => {
    if (demoMode) {
        return res.status(200).json({ status: 'ok', mode: 'demo', database: 'in-memory sample data' });
    }
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (err) {
        console.error('Health check failed:', err.message);
        res.status(503).json({ status: 'error', database: 'unavailable' });
    }
});

app.get('/api/records', async (req, res) => {
    if (demoMode) {
        return res.json({ records: demoRecords, stats: getDemoStats(), mode: 'demo' });
    }
    try {
        const recordsQuery = `
            SELECT 
                ec.record_id,
                e.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS name,
                d.department_name AS dept,
                l.location_name AS loc,
                cp.title AS cert,
                TO_CHAR(ec.expiry_date, 'YYYY-MM-DD') AS expiry,
                ec.compliance_status AS status
            FROM employee_certification ec
            JOIN employee e ON ec.employee_id = e.employee_id
            JOIN department d ON e.department_id = d.department_id
            JOIN location l ON d.location_id = l.location_id
            JOIN certification_program cp ON ec.certification_id = cp.certification_id
            ORDER BY ec.record_id ASC;
        `;
        const { rows: records } = await pool.query(recordsQuery);

        const statsQuery = `
            SELECT 
                COUNT(*) AS total,
                COUNT(CASE WHEN compliance_status = 'Valid' THEN 1 END) AS valid,
                COUNT(CASE WHEN compliance_status = 'Expiring Soon' THEN 1 END) AS warning,
                COUNT(CASE WHEN compliance_status = 'Expired' THEN 1 END) AS expired
            FROM employee_certification;
        `;
        const { rows: statsRows } = await pool.query(statsQuery);

        res.json({ records, stats: statsRows[0] });
    } catch (err) {
        console.error('Error fetching records:', err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Database request failed. Check server logs.' : err.message });
    }
});

app.post('/api/records', async (req, res) => {
    const { id, name, dept, loc, cert, issueDate, expiry } = req.body;
    if (demoMode) {
        if (!id || !name || !dept || !loc || !cert || !expiry) {
            return res.status(400).json({ error: 'Please complete all required fields.' });
        }
        const expiryDate = new Date(`${expiry}T00:00:00`);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((expiryDate - today) / 86400000);
        const status = daysLeft < 0 ? 'Expired' : daysLeft <= 30 ? 'Expiring Soon' : 'Valid';
        demoRecords.push({
            record_id: nextDemoId++, employee_id: id, name, dept, loc, cert,
            expiry, status
        });
        return res.status(201).json({ success: true, message: 'Demo record added (not saved permanently).' });
    }
    try {
        let locRes = await pool.query('SELECT location_id FROM location WHERE location_name = $1', [loc]);
        if (locRes.rows.length === 0) {
            locRes = await pool.query('INSERT INTO location (location_name, region) VALUES ($1, $2) RETURNING location_id', [loc, 'Telangana']);
        }
        const locId = locRes.rows[0].location_id;

        let deptRes = await pool.query('SELECT department_id FROM department WHERE department_name = $1', [dept]);
        if (deptRes.rows.length === 0) {
            deptRes = await pool.query('INSERT INTO department (department_name, location_id) VALUES ($1, $2) RETURNING department_id', [dept, locId]);
        }
        const deptId = deptRes.rows[0].department_id;

        let empRes = await pool.query('SELECT employee_id FROM employee WHERE employee_id = $1', [id]);
        if (empRes.rows.length === 0) {
            const nameParts = name.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '';
            const email = `${id.toLowerCase()}@company.com`;
            await pool.query(
                'INSERT INTO employee (employee_id, first_name, last_name, email, job_role, department_id) VALUES ($1, $2, $3, $4, $5, $6)',
                [id, firstName, lastName, email, 'Engineer', deptId]
            );
        }

        let certRes = await pool.query('SELECT certification_id FROM certification_program WHERE title = $1', [cert]);
        if (certRes.rows.length === 0) {
            certRes = await pool.query(
                'INSERT INTO certification_program (title, description, validity_months, provider_id) VALUES ($1, $2, $3, $4) RETURNING certification_id',
                [cert, 'Professional Certification', 36, 1]
            );
        }
        const certId = certRes.rows[0].certification_id;

        const finalIssueDate = issueDate || new Date().toISOString().split('T')[0];

        await pool.query(
            'INSERT INTO employee_certification (employee_id, certification_id, issue_date, expiry_date) VALUES ($1, $2, $3, $4)',
            [id, certId, finalIssueDate, expiry]
        );

        res.status(201).json({ success: true, message: 'Record saved to database!' });
    } catch (err) {
        console.error('Error inserting record:', err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Database request failed. Check server logs.' : err.message });
    }
});

app.delete('/api/records/:id', async (req, res) => {
    if (demoMode) {
        const id = Number(req.params.id);
        const before = demoRecords.length;
        demoRecords = demoRecords.filter(record => record.record_id !== id);
        if (demoRecords.length === before) return res.status(404).json({ error: 'Record not found' });
        return res.json({ success: true, message: 'Demo record deleted.' });
    }
    try {
        await pool.query('DELETE FROM employee_certification WHERE record_id = $1', [req.params.id]);
        res.json({ success: true, message: 'Record deleted' });
    } catch (err) {
        console.error('Error deleting record:', err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Database request failed. Check server logs.' : err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (demoMode) console.log('DEMO MODE: using sample in-memory data; set DATABASE_URL to connect Supabase.');
});