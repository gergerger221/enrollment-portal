// ═══════════════════════════════════════════════════════════════
//  Admin Dashboard — admin.js
//  JJKings Academy of Biringan Enrollment System
// ═══════════════════════════════════════════════════════════════

'use strict';

// ─── State ────────────────────────────────────────────────────
let allStudents        = [];      // All student records from DB (excl. system admins)
let enrollmentFilter   = 'all';   // 'all' | 'pending' | 'under-review' | 'rejected'
let studentLevelFilter = 'all';   // 'all' | 'junior' | 'senior'
let currentReviewId    = null;    // DB id of student currently in review modal

// ─── SweetAlert2 Mixin ────────────────────────────────────────
const baseSwal = window.Swal.mixin({
    customClass: {
        popup:         'rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800',
        title:         'text-xl font-bold text-slate-800 dark:text-white',
        htmlContainer: 'text-slate-500 dark:text-slate-300 text-sm leading-relaxed mt-1',
        confirmButton: 'bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition font-semibold text-sm border-none outline-none mx-1 cursor-pointer',
        cancelButton:  'bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl hover:bg-slate-300 transition font-semibold text-sm border-none outline-none mx-1 cursor-pointer',
        denyButton:    'bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 transition font-semibold text-sm border-none outline-none mx-1 cursor-pointer',
    },
    buttonsStyling: false,
});

const Swal = {
    fire: function(options) {
        const isDark = document.documentElement.classList.contains('admin-dark');
        let swalOptions = typeof options === 'string' ? { title: options } : { ...options };
        
        if (isDark) {
            swalOptions.background = '#1e293b'; // slate-800 background
            swalOptions.color = '#ffffff';
        } else {
            swalOptions.background = '#ffffff';
            swalOptions.color = '#1e293b';
        }
        
        return baseSwal.fire(swalOptions);
    },
    showLoading: function() {
        return baseSwal.showLoading();
    }
};

// ─── Utility Helpers ──────────────────────────────────────────
/** Return value or fallback when null/undefined/empty */
const v = (val, fallback = 'N/A') =>
    (val !== null && val !== undefined && val !== '') ? val : fallback;

/** Format a date string to a human-readable PH locale date */
function fmtDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleDateString('en-PH', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

/** Generate animated skeleton table rows */
function skeletonRows(cols, count = 5) {
    const widths = ['w-28', 'w-36', 'w-24', 'w-20', 'w-16'];
    return Array.from({ length: count }, (_, r) => `
        <tr class="border-b border-slate-100 animate-pulse">
            ${Array.from({ length: cols }, (_, c) => `
                <td class="px-4 py-3.5">
                    <div class="h-3.5 bg-slate-200 rounded-full ${widths[(r + c) % widths.length]}"></div>
                </td>`).join('')}
        </tr>`).join('');
}

/** Render a coloured status pill */
function statusBadge(status) {
    const styles = {
        approved:       'bg-green-100 text-green-700 border-green-200',
        pending:        'bg-yellow-100 text-yellow-700 border-yellow-200',
        rejected:       'bg-red-100 text-red-600 border-red-200',
        'under-review': 'bg-blue-100 text-blue-700 border-blue-200',
    };
    const labels = {
        approved: 'Approved', pending: 'Pending',
        rejected: 'Rejected', 'under-review': 'Under Review',
    };
    const cls = styles[status] || 'bg-slate-100 text-slate-600 border-slate-200';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}">${labels[status] || status}</span>`;
}

/** Render a single label–value row inside a section card */
function infoRow(label, value) {
    const display = v(value);
    return `
        <div class="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b border-slate-100 last:border-0">
            <span class="text-[11px] font-semibold text-slate-400 sm:min-w-[160px] uppercase tracking-wide pt-px flex-shrink-0">${label}</span>
            <span class="text-sm text-slate-800">${display}</span>
        </div>`;
}

/** Render a titled card wrapping a list of infoRows */
function sectionCard(icon, title, rows) {
    return `
        <div class="rounded-xl border border-slate-200 overflow-hidden">
            <div class="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                <i class="${icon} text-blue-500 text-xs"></i>
                <span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">${title}</span>
            </div>
            <div class="px-4 divide-y divide-slate-50">${rows}</div>
        </div>`;
}

/** Compute a sensible default class section from level/strand/gradeLevel */
function getDefaultSection(student) {
    const level      = (student.level      || '').toLowerCase();
    const strand     = (student.strand     || '').toUpperCase();
    const gradeLevel = student.grade_level || '7';

    if (level.includes('senior')) {
        return `${gradeLevel}-${strand}-A`;
    } else {
        return `${gradeLevel}-A`;
    }
}

// ─── Data Loading ─────────────────────────────────────────────
async function loadAllStudents(silent = false) {
    if (!silent) {
        document.getElementById('enrollmentsTableBody').innerHTML = skeletonRows(7);
        document.getElementById('studentsTableBody').innerHTML    = skeletonRows(8);
    }

    try {
        const res  = await fetch('php/api.php?action=students');
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
            // Strip out hard-coded admin email accounts
            allStudents = json.data.filter(s =>
                s.email !== 'admin@university.local' && s.email !== 'admin@biringan.edu'
            );
            updateStats();
            renderCharts();
            renderEnrollmentsTable();
            renderStudentsTable();
        } else {
            if (!silent) {
                showTableError('enrollmentsTableBody', 7, 'Failed to load enrollment data.');
                showTableError('studentsTableBody',    8, 'Failed to load student data.');
            }
        }
    } catch {
        if (!silent) {
            showTableError('enrollmentsTableBody', 7, 'Network error. Please refresh the page.');
            showTableError('studentsTableBody',    8, 'Network error. Please refresh the page.');
        }
    }
}

function showTableError(tbodyId, cols, msg) {
    document.getElementById(tbodyId).innerHTML =
        `<tr><td colspan="${cols}" class="px-4 py-10 text-center text-slate-400 text-sm">${msg}</td></tr>`;
}

// ─── Charts Engine ─────────────────────────────────────────

const chartInstances = {}; // track chart instances for cleanup

function isDarkMode() {
    return document.documentElement.classList.contains('admin-dark');
}

function chartTheme() {
    const dark = isDarkMode();
    return {
        textColor:   dark ? '#8b949e' : '#64748b',
        gridColor:   dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        tooltipBg:   dark ? '#1c2128' : '#1e293b',
        tooltipText: '#f8fafc',
    };
}

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

function renderCharts() {
    if (typeof Chart === 'undefined') return; // Chart.js not loaded yet
    renderTrendChart();
    renderStrandChart();
    renderStatusChart();
}

/* ─────────────────────────────────────────
   Chart 1 — Monthly Enrollment Trend (line)
   Shows how many applications arrived each month
   over the past 6 months.
───────────────────────────────────────── */
function renderTrendChart() {
    destroyChart('trend');
    const t = chartTheme();

    // Build last-6-months buckets
    const now    = new Date();
    const labels = [];
    const counts = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }));
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        counts.push(allStudents.filter(s => {
            if (!s.created_at) return false;
            return s.created_at.startsWith(monthStr);
        }).length);
    }

    const ctx = document.getElementById('chartTrend');
    if (!ctx) return;

    chartInstances.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Applications',
                data: counts,
                fill: true,
                backgroundColor: 'rgba(59,130,246,0.08)',
                borderColor: '#3b82f6',
                borderWidth: 2.5,
                pointBackgroundColor: '#3b82f6',
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: t.tooltipBg,
                    titleColor: t.tooltipText,
                    bodyColor: t.tooltipText,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} application${ctx.parsed.y !== 1 ? 's' : ''}`,
                    },
                },
            },
            scales: {
                x: {
                    grid: { color: t.gridColor },
                    ticks: { color: t.textColor, font: { size: 11 } },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: t.gridColor },
                    ticks: { color: t.textColor, font: { size: 11 }, stepSize: 1, precision: 0 },
                },
            },
        },
    });
}

/* ─────────────────────────────────────────
   Chart 2 — Strand / Level Distribution (donut)
   Shows how enrolled students are spread across
   JHS, STEM, ABM, HUMSS, TVL-HE, TVL-ICT, TVL-IA.
───────────────────────────────────────── */
function renderStrandChart() {
    destroyChart('strand');
    const t = chartTheme();

    const approved = allStudents.filter(s => s.status === 'approved');

    // Bucket by level/strand label
    const buckets = {
        'JHS':      0,
        'STEM':     0,
        'ABM':      0,
        'HUMSS':    0,
        'TVL-HE':   0,
        'TVL-ICT':  0,
        'TVL-IA':   0,
        'Other':    0,
    };

    approved.forEach(s => {
        const level  = (s.level  || '').toLowerCase();
        const strand = (s.strand || '').toLowerCase();

        if (level.includes('junior')) {
            buckets['JHS']++;
        } else if (strand.includes('stem')) {
            buckets['STEM']++;
        } else if (strand.includes('abm')) {
            buckets['ABM']++;
        } else if (strand.includes('humss')) {
            buckets['HUMSS']++;
        } else if (strand.includes('he') || strand.includes('home')) {
            buckets['TVL-HE']++;
        } else if (strand.includes('ict') || strand.includes('tech')) {
            buckets['TVL-ICT']++;
        } else if (strand.includes('ia') || strand.includes('industrial')) {
            buckets['TVL-IA']++;
        } else {
            buckets['Other']++;
        }
    });

    const labels = Object.keys(buckets).filter(k => buckets[k] > 0);
    const data   = labels.map(k => buckets[k]);

    const palette = [
        '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
        '#ef4444', '#06b6d4', '#f97316', '#64748b',
    ];

    const ctx = document.getElementById('chartStrand');
    if (!ctx) return;

    chartInstances.strand = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: palette.slice(0, labels.length),
                borderColor: isDarkMode() ? '#161b22' : '#ffffff',
                borderWidth: 3,
                hoverOffset: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: t.textColor,
                        font: { size: 10 },
                        padding: 10,
                        usePointStyle: true,
                        pointStyleWidth: 8,
                    },
                },
                tooltip: {
                    backgroundColor: t.tooltipBg,
                    titleColor: t.tooltipText,
                    bodyColor: t.tooltipText,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed} student${ctx.parsed !== 1 ? 's' : ''}`,
                    },
                },
            },
        },
    });
}

/* ─────────────────────────────────────────
   Chart 3 — Status Breakdown (grouped bar)
   Shows Approved / Pending / Under Review / Rejected
   counts split by JHS vs SHS.
───────────────────────────────────────── */
function renderStatusChart() {
    destroyChart('status');
    const t = chartTheme();

    const statuses = ['approved', 'pending', 'under-review', 'rejected'];
    const labels   = ['Approved', 'Pending', 'Under Review', 'Rejected'];

    function countBy(levelFilter, status) {
        return allStudents.filter(s => {
            const lv = (s.level || '').toLowerCase();
            const matchLevel = levelFilter === 'jhs'
                ? lv.includes('junior')
                : lv.includes('senior') || (!lv.includes('junior') && s.strand);
            return matchLevel && s.status === status;
        }).length;
    }

    const jhsData = statuses.map(st => countBy('jhs', st));
    const shsData = statuses.map(st => countBy('shs', st));

    const barColors = {
        approved:      { bg: 'rgba(16,185,129,0.75)',  border: '#10b981' },
        pending:       { bg: 'rgba(245,158,11,0.75)',  border: '#f59e0b' },
        'under-review':{ bg: 'rgba(59,130,246,0.75)',  border: '#3b82f6' },
        rejected:      { bg: 'rgba(239,68,68,0.75)',   border: '#ef4444' },
    };

    const ctx = document.getElementById('chartStatus');
    if (!ctx) return;

    chartInstances.status = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Junior High',
                    data: jhsData,
                    backgroundColor: statuses.map(s => barColors[s].bg),
                    borderColor:     statuses.map(s => barColors[s].border),
                    borderWidth: 1.5,
                    borderRadius: 6,
                    borderSkipped: false,
                },
                {
                    label: 'Senior High',
                    data: shsData,
                    backgroundColor: statuses.map(s => barColors[s].bg.replace('0.75', '0.4')),
                    borderColor:     statuses.map(s => barColors[s].border),
                    borderWidth: 1.5,
                    borderRadius: 6,
                    borderSkipped: false,
                    borderDash: [4, 2],
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: t.textColor,
                        font: { size: 11 },
                        usePointStyle: true,
                        pointStyleWidth: 8,
                        padding: 12,
                    },
                },
                tooltip: {
                    backgroundColor: t.tooltipBg,
                    titleColor: t.tooltipText,
                    bodyColor: t.tooltipText,
                    padding: 10,
                    cornerRadius: 8,
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: t.textColor, font: { size: 11 } },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: t.gridColor },
                    ticks: { color: t.textColor, font: { size: 11 }, precision: 0, stepSize: 1 },
                },
            },
        },
    });
}

// ─── Stats Cards ──────────────────────────────────────────────
function updateStats() {
    const total    = allStudents.length;
    const enrolled = allStudents.filter(s => s.status === 'approved').length;
    const pending  = allStudents.filter(s => s.status === 'pending' || s.status === 'under-review').length;
    const rejected = allStudents.filter(s => s.status === 'rejected').length;
    const pendingOnly = allStudents.filter(s => s.status === 'pending').length;

    document.getElementById('statTotalStudents').textContent = total;
    document.getElementById('statEnrolled').textContent      = enrolled;
    document.getElementById('statPending').textContent       = pending;
    document.getElementById('statRejected').textContent      = rejected;

    const badge = document.getElementById('pendingBadge');
    if (pendingOnly > 0) {
        badge.textContent = pendingOnly;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// ─── Enrollment Applications Tab ──────────────────────────────
const enrollFilterDefaultClasses = {
    all:            'bg-white text-slate-600 border-slate-300 hover:bg-slate-50',
    pending:        'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100',
    'under-review': 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100',
    rejected:       'bg-red-50 text-red-700 border-red-300 hover:bg-red-100',
};

function setEnrollmentFilter(status, btn) {
    enrollmentFilter = status;
    document.querySelectorAll('.enroll-filter').forEach(b => {
        const key = b.dataset.filter || 'all';
        b.className = `enroll-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${enrollFilterDefaultClasses[key] || enrollFilterDefaultClasses.all}`;
    });
    btn.className = 'enroll-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition bg-slate-800 text-white border-slate-700';
    renderEnrollmentsTable();
}

function renderEnrollmentsTable() {
    const query = (document.getElementById('searchEnrollments').value || '').toLowerCase().trim();

    // Only show non-approved students in this tab
    let rows = allStudents.filter(s => s.status !== 'approved');

    if (enrollmentFilter !== 'all') {
        rows = rows.filter(s => s.status === enrollmentFilter);
    }

    if (query) {
        rows = rows.filter(s => {
            const name = `${s.first_name} ${s.last_name}`.toLowerCase();
            return name.includes(query)
                || (s.email  || '').toLowerCase().includes(query)
                || (s.level  || '').toLowerCase().includes(query)
                || (s.strand || '').toLowerCase().includes(query);
        });
    }

    const tbody = document.getElementById('enrollmentsTableBody');

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-10 text-center text-slate-400 text-sm">No applications found.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(s => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="px-4 py-3 font-medium text-slate-800">${v(s.first_name)} ${v(s.last_name)}</td>
            <td class="px-4 py-3 text-slate-500 text-xs">${v(s.email)}</td>
            <td class="px-4 py-3 text-slate-600 text-xs">${v(s.level)}</td>
            <td class="px-4 py-3 text-slate-600 text-xs">${v(s.strand)}</td>
            <td class="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">${fmtDate(s.created_at)}</td>
            <td class="px-4 py-3">${statusBadge(s.status)}</td>
            <td class="px-4 py-3">
                <button onclick="openEnrollmentReviewModal(${s.id})"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold rounded-lg transition">
                    <i class="fas fa-search text-[10px]"></i> Review
                </button>
            </td>
        </tr>`).join('');
}

// ─── Enrolled Students Tab ────────────────────────────────────
const studentFilterDefaultClasses = {
    all:    'bg-white text-slate-600 border-slate-300 hover:bg-slate-50',
    junior: 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100',
    senior: 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100',
};

function setStudentFilter(level, btn) {
    studentLevelFilter = level;
    document.querySelectorAll('.student-filter').forEach(b => {
        const key = b.dataset.filter || 'all';
        b.className = `student-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${studentFilterDefaultClasses[key] || studentFilterDefaultClasses.all}`;
    });
    btn.className = 'student-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition bg-slate-800 text-white border-slate-700';
    renderStudentsTable();
}

function renderStudentsTable() {
    const query = (document.getElementById('searchStudents').value || '').toLowerCase().trim();

    let rows = allStudents.filter(s => s.status === 'approved');

    if (studentLevelFilter === 'junior') {
        rows = rows.filter(s => (s.level || '').toLowerCase().includes('junior'));
    } else if (studentLevelFilter === 'senior') {
        rows = rows.filter(s => (s.level || '').toLowerCase().includes('senior'));
    }

    if (query) {
        rows = rows.filter(s => {
            const name = `${s.first_name} ${s.last_name}`.toLowerCase();
            return name.includes(query)
                || (s.student_id   || '').toLowerCase().includes(query)
                || (s.email        || '').toLowerCase().includes(query)
                || (s.class_section|| '').toLowerCase().includes(query)
                || (s.strand       || '').toLowerCase().includes(query);
        });
    }

    const tbody = document.getElementById('studentsTableBody');

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-10 text-center text-slate-400 text-sm">No enrolled students found.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(s => {
        const isSeniorHigh = s.level && s.level.toLowerCase().includes('senior');
        const voucherType = s.voucher_eligibility || '';
        
        let tuition = isSeniorHigh ? 20000 : 12000;
        let registration = 500;
        let lab = isSeniorHigh ? 1500 : 500;
        let library = isSeniorHigh ? 500 : 300;
        let idFee = 200;
        let uniform = isSeniorHigh ? 3000 : 0;
        
        let subtotal = tuition + registration + lab + library + idFee + uniform;
        let voucherDeduction = 0;
        
        if (isSeniorHigh) {
            if (voucherType === 'public-school' || voucherType === 'same-school') {
                voucherDeduction = tuition + registration + lab + library + idFee;
            } else if (voucherType === 'private-school') {
                voucherDeduction = 17500;
            }
        }
        
        const totalToPay = subtotal - voucherDeduction;
        const totalPaid = parseFloat(s.total_paid) || 0;
        const remaining = Math.max(0, totalToPay - totalPaid);
        
        let badgeClass = '';
        let statusText = '';
        if (totalPaid === 0) {
            badgeClass = 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border-red-200';
            statusText = `Unpaid (₱${totalToPay.toLocaleString('en-US')})`;
        } else if (remaining > 0) {
            badgeClass = 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200';
            statusText = `Partial (Bal: ₱${remaining.toLocaleString('en-US')})`;
        } else {
            badgeClass = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200';
            statusText = 'Paid In Full';
        }

        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="px-4 py-3 font-mono text-xs text-slate-600 font-semibold whitespace-nowrap">${v(s.student_id)}</td>
            <td class="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">${v(s.first_name)} ${v(s.last_name)}</td>
            <td class="px-4 py-3 text-slate-500 text-xs">${v(s.email)}</td>
            <td class="px-4 py-3 text-xs">
                <span class="block font-medium text-slate-700">${v(s.level)}</span>
                ${s.strand ? `<span class="text-slate-400">${s.strand}</span>` : ''}
            </td>
            <td class="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">${s.class_section ? s.class_section.split('-').slice(3).join('-') : 'N/A'}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}">
                    ${statusText}
                </span>
            </td>
            <td class="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">${fmtDate(s.approved_at || s.created_at)}</td>
            <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                    <button onclick="openProfileDrawer(${s.id})"
                        class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold rounded-lg transition" title="View Student Profile">
                        <i class="fas fa-user text-[10px]"></i> View
                    </button>
                    <button onclick="openAdminCashierPaymentModal(${s.id})"
                        class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-lg transition" title="Record Cashier Payment">
                        <i class="fas fa-cash-register text-[10px]"></i> Pay
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ─── Enrollment Review Modal ──────────────────────────────────
function openEnrollmentReviewModal(studentId) {
    currentReviewId = studentId;

    const modal = document.getElementById('enrollmentReviewModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('reviewStudentDetails').innerHTML = skeletonRows(1, 10);
    document.getElementById('reviewModalSubtitle').textContent = 'Loading applicant data…';

    const student = allStudents.find(s => s.id == studentId);
    if (student) {
        populateReviewModal(student);
    } else {
        fetch(`php/api.php?action=getStudent&id=${studentId}`)
            .then(r => r.json())
            .then(json => {
                if (json.success && json.data) populateReviewModal(json.data);
                else document.getElementById('reviewStudentDetails').innerHTML =
                    `<p class="text-center text-slate-400 py-10">Failed to load student data.</p>`;
            })
            .catch(() => {
                document.getElementById('reviewStudentDetails').innerHTML =
                    `<p class="text-center text-slate-400 py-10">Network error. Please try again.</p>`;
            });
    }
}

function populateReviewModal(s) {
    document.getElementById('reviewModalSubtitle').textContent =
        `Reviewing: ${s.first_name} ${s.last_name}  ·  Applied ${fmtDate(s.created_at)}`;

    const fatherName = s.father_deceased
        ? '<em class="text-slate-400">Deceased</em>'
        : `${v(s.father_first_name)} ${v(s.father_middle_name, '')} ${v(s.father_last_name)}`.trim();

    const motherName = s.mother_deceased
        ? '<em class="text-slate-400">Deceased</em>'
        : `${v(s.mother_first_name)} ${v(s.mother_middle_name, '')} ${v(s.mother_last_name)}`.trim();

    document.getElementById('reviewStudentDetails').innerHTML = `
        <div class="flex flex-wrap gap-2 mb-1">
            ${statusBadge(s.status)}
            ${s.level ? `<span class="text-xs bg-slate-600 text-white px-2.5 py-0.5 rounded-md shadow-sm font-semibold border border-transparent">${s.level}</span>` : ''}
            ${s.strand ? `<span class="text-xs bg-indigo-600 text-white px-2.5 py-0.5 rounded-md shadow-sm font-semibold border border-transparent">${s.strand}</span>` : ''}
        </div>

        ${sectionCard('fas fa-user-circle', 'Personal Information', `
            ${infoRow('Full Name', `${v(s.first_name)} ${v(s.middle_name,'')} ${v(s.last_name)}${s.suffix ? ' '+s.suffix : ''}`)}
            ${infoRow('Date of Birth', fmtDate(s.dob))}
            ${infoRow('Gender', s.gender)}
            ${infoRow('Civil Status', s.civil_status)}
            ${infoRow('Nationality', s.nationality)}
            ${infoRow('Religion', s.religion)}
            ${infoRow('Dialect / Language', s.dialect)}
            ${infoRow('Place of Birth', s.place_of_birth)}
        `)}

        ${sectionCard('fas fa-map-marker-alt', 'Contact & Address', `
            ${infoRow('Email', s.email)}
            ${infoRow('Phone', s.phone)}
            ${infoRow('Landline', s.landline)}
            ${infoRow('Address', s.address)}
            ${infoRow('Zip Code', s.zip_code)}
        `)}

        ${sectionCard('fas fa-school', 'Educational Background', `
            ${infoRow('LRN (Learner Reference No.)', s.lrn)}
            ${infoRow('Elementary School', s.elementary_school)}
            ${infoRow('Elementary Year finished', s.elementary_year_graduated)}
            ${s.high_school                 ? infoRow('Previous School', s.high_school) : ''}
            ${s.high_school_year_graduated  ? infoRow('Previous School Year finished', s.high_school_year_graduated) : ''}
            ${infoRow('Public School Graduate', s.public_school_graduate)}
        `)}

        ${sectionCard('fas fa-graduation-cap', 'Enrollment Details', `
            ${infoRow('Level', s.level)}
            ${infoRow('Grade Level', s.grade_level)}
            ${infoRow('Strand', s.strand)}
            ${infoRow('Voucher Eligibility', s.voucher_eligibility)}
            ${infoRow('Data Privacy Agreed', s.data_privacy_agreed ? 'Yes' : 'No')}
        `)}

        ${sectionCard('fas fa-user-friends', "Father's Information", `
            ${infoRow('Name', fatherName)}
            ${!s.father_deceased ? infoRow('Phone', s.father_phone) : ''}
            ${!s.father_deceased ? infoRow('Occupation', s.father_occupation) : ''}
            ${!s.father_deceased ? infoRow('Address', s.father_address) : ''}
        `)}

        ${sectionCard('fas fa-heart', "Mother's Information", `
            ${infoRow('Name', motherName)}
            ${!s.mother_deceased ? infoRow('Phone', s.mother_phone) : ''}
            ${!s.mother_deceased ? infoRow('Occupation', s.mother_occupation) : ''}
            ${!s.mother_deceased ? infoRow('Address', s.mother_address) : ''}
        `)}

        ${sectionCard('fas fa-shield-alt', "Guardian's Information", `
            ${infoRow('Name', `${v(s.guardian_first_name)} ${v(s.guardian_middle_name,'')} ${v(s.guardian_last_name)}`.trim())}
            ${infoRow('Phone', s.guardian_phone)}
            ${infoRow('Occupation', s.guardian_occupation)}
            ${infoRow('Address', s.guardian_address)}
        `)}

        ${sectionCard('fas fa-file-alt', 'Submitted Documents', `
            ${s.birth_cert_path ? infoRow('Birth Certificate', `<a href="${s.birth_cert_path}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1.5"><i class="fas fa-external-link-alt text-[10px]"></i> View Birth Certificate</a>`) : infoRow('Birth Certificate', '<span class="text-slate-400">Not Uploaded</span>')}
            ${s.report_card_path ? infoRow('Report Card', `<a href="${s.report_card_path}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1.5"><i class="fas fa-external-link-alt text-[10px]"></i> View Report Card</a>`) : infoRow('Report Card', '<span class="text-slate-400">Not Uploaded</span>')}
            ${s.good_moral_path ? infoRow('Good Moral Certificate', `<a href="${s.good_moral_path}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1.5"><i class="fas fa-external-link-alt text-[10px]"></i> View Good Moral Cert</a>`) : infoRow('Good Moral Certificate', '<span class="text-slate-400">Not Uploaded</span>')}
            ${s.voucher_path ? infoRow('Voucher Certificate', `<a href="${s.voucher_path}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1.5"><i class="fas fa-external-link-alt text-[10px]"></i> View Voucher Certificate</a>`) : ''}
        `)}
    `;

    // Auto-fill action fields
    document.getElementById('reviewSection').value = getDefaultSection(s);
    document.getElementById('reviewEmail').value   = s.email || '';
    ['verifyPublicSchool', 'verifyLRN', 'verifyPreviousSchool'].forEach(id => {
        document.getElementById(id).checked = false;
    });
    document.getElementById('adminNotes').value = '';

    // Calculate total assessed tuition fee
    const isSeniorHigh = s.level && s.level.toLowerCase().includes('senior');
    const voucherType = s.voucher_eligibility || '';
    let tuition = isSeniorHigh ? 20000 : 12000;
    let registration = 500;
    let lab = isSeniorHigh ? 1500 : 500;
    let library = isSeniorHigh ? 500 : 300;
    let idFee = 200;
    let uniform = isSeniorHigh ? 3000 : 0;
    let subtotal = tuition + registration + lab + library + idFee + uniform;
    let voucherDeduction = 0;
    if (isSeniorHigh) {
        if (voucherType === 'public-school' || voucherType === 'same-school') {
            voucherDeduction = tuition + registration + lab + library + idFee;
        } else if (voucherType === 'private-school') {
            voucherDeduction = 17500;
        }
    }
    const totalToPay = subtotal - voucherDeduction;
    s._calculatedTotalToPay = totalToPay;

    // Prefill Mandatory Initial Downpayment & Auto OR
    const defaultInit = Math.min(2000, totalToPay);
    const amountInput = document.getElementById('initialPaymentAmount');
    if (amountInput) amountInput.value = defaultInit > 0 ? defaultInit : 1000;
    generateAutoOR();
    updateApprovalLiveBalance(totalToPay);

    // Hide approve/reject for already-decided students
    const isDecided = s.status === 'approved' || s.status === 'rejected';
    document.getElementById('approveBtn').style.display    = isDecided ? 'none' : '';
    document.getElementById('underReviewBtn').style.display = (s.status === 'under-review') ? 'none' : (isDecided ? 'none' : '');
    document.getElementById('rejectBtn').style.display     = isDecided ? 'none' : '';
}

function generateAutoOR() {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    const orInput = document.getElementById('initialPaymentOR');
    if (orInput) {
        orInput.value = `OR-${year}-${rand}`;
    }
}
window.generateAutoOR = generateAutoOR;

function updateApprovalLiveBalance(totalToPayVal) {
    if (typeof totalToPayVal === 'undefined' && currentReviewId) {
        const student = allStudents.find(s => s.id == currentReviewId);
        if (student) {
            totalToPayVal = student._calculatedTotalToPay;
        }
    }
    const totalAssessed = typeof totalToPayVal === 'number' ? totalToPayVal : 13500;
    const paidInput = parseFloat(document.getElementById('initialPaymentAmount')?.value) || 0;
    const remaining = Math.max(0, totalAssessed - paidInput);

    const assessedEl = document.getElementById('approvalTotalAssessed');
    const remainingEl = document.getElementById('approvalLiveRemaining');
    if (assessedEl) assessedEl.textContent = `₱${totalAssessed.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    if (remainingEl) remainingEl.textContent = `₱${remaining.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
}
window.updateApprovalLiveBalance = updateApprovalLiveBalance;

function closeEnrollmentReviewModal() {
    const modal = document.getElementById('enrollmentReviewModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    currentReviewId = null;
}

// ─── Approve ──────────────────────────────────────────────────
async function approveEnrollment() {
    if (!currentReviewId) return;

    const sectionVal = document.getElementById('reviewSection').value.trim();
    const emailVal   = document.getElementById('reviewEmail').value.trim();

    if (!sectionVal || !emailVal) {
        Swal.fire({ icon: 'warning', title: 'Required Fields', text: 'Please assign a section and verify the portal email before approving.' });
        return;
    }

    const initAmount  = parseFloat(document.getElementById('initialPaymentAmount')?.value) || 0;
    const initOR      = document.getElementById('initialPaymentOR')?.value.trim() || '';
    const initMethod  = document.getElementById('initialPaymentMethod')?.value || 'Cash';

    if (initAmount <= 0) {
        Swal.fire({ icon: 'warning', title: 'Downpayment Required', text: 'Please enter a valid initial downpayment amount (minimum ₱1.00) to approve enrollment.' });
        return;
    }

    if (!initOR) {
        Swal.fire({ icon: 'warning', title: 'Official Receipt (OR) Required', text: 'Please enter an Official Receipt (OR) # or click "Auto OR" to generate one.' });
        return;
    }

    const { isConfirmed } = await Swal.fire({
        icon: 'question',
        title: 'Approve Enrollment?',
        html: `This will approve the student with section <strong>${sectionVal}</strong>.<br><span class="text-xs text-emerald-700 font-bold">Initial Cash Downpayment: ₱${initAmount.toLocaleString('en-US', {minimumFractionDigits:2})} (OR: ${initOR})</span>`,
        showCancelButton: true,
        confirmButtonText: 'Yes, Approve & Issue Receipt',
        cancelButtonText: 'Cancel',
        customClass: {
            confirmButton: 'bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs',
            cancelButton: 'bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-xs'
        }
    });
    if (!isConfirmed) return;

    Swal.fire({ title: 'Approving application & logging payment…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res    = await fetch('php/api.php?action=updateStatus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                studentId: currentReviewId, 
                status: 'approved', 
                email: emailVal, 
                section: sectionVal,
                initialPayment: initAmount,
                initialPaymentOR: initOR,
                initialPaymentMethod: initMethod
            }),
        });
        const result = await res.json();

        if (result.success) {
            safeCloseSwal();

            const studentObj = allStudents.find(st => st.id == currentReviewId);
            const studentName = studentObj ? `${studentObj.first_name} ${studentObj.last_name}` : 'Approved Student';
            const totalAssessedFee = studentObj ? (studentObj._calculatedTotalToPay || 13500) : 13500;
            const remaining = Math.max(0, totalAssessedFee - initAmount);

            closeEnrollmentReviewModal();
            await Promise.all([loadAllStudents(), loadAllSections()]);

            // Automatically open the Official Receipt Modal for immediate printing!
            openOfficialReceiptModal({
                orNumber: initOR,
                studentName: studentName,
                studentId: result.studentId || '—',
                method: initMethod,
                amountPaid: initAmount,
                remainingBalance: remaining
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Approval Failed', text: result.message || 'Failed to approve enrollment.' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Network Error', text: 'Please check your connection and try again.' });
    }
}

// ─── Reject ───────────────────────────────────────────────────
async function rejectEnrollment() {
    if (!currentReviewId) return;

    const { isConfirmed, value: reason } = await Swal.fire({
        icon: 'warning',
        title: 'Reject Enrollment',
        input: 'textarea',
        inputLabel: 'Reason for rejection (required)',
        inputPlaceholder: 'Please provide a clear reason…',
        showCancelButton: true,
        confirmButtonText: 'Confirm Rejection',
        cancelButtonText: 'Cancel',
        inputValidator: val => (!val || !val.trim()) ? 'Please provide a rejection reason.' : null,
        customClass: {
            confirmButton: 'bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 transition font-semibold text-sm border-none outline-none mx-1 cursor-pointer',
            cancelButton:  'bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl hover:bg-slate-300 transition font-semibold text-sm border-none outline-none mx-1 cursor-pointer',
        },
    });
    if (!isConfirmed) return;

    Swal.fire({ title: 'Processing…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res    = await fetch('php/api.php?action=updateStatus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: currentReviewId, status: 'rejected', reason }),
        });
        const result = await res.json();

        if (result.success) {
            await Swal.fire({ icon: 'info', title: 'Application Rejected', text: 'The enrollment has been rejected and the record updated.' });
            closeEnrollmentReviewModal();
            await loadAllStudents();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'Failed to reject enrollment.' });
        }
    } catch {
        Swal.fire({ icon: 'error', title: 'Network Error', text: 'Please check your connection and try again.' });
    }
}

// ─── Student Profile Drawer ───────────────────────────────────
function openProfileDrawer(studentId) {
    const overlay = document.getElementById('profileDrawerOverlay');
    const drawer  = document.getElementById('profileDrawer');

    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
        drawer.classList.remove('translate-x-full');
    });

    document.getElementById('drawerStudentName').textContent = 'Loading…';
    document.getElementById('drawerStudentId').textContent   = '—';
    document.getElementById('drawerContent').innerHTML = `
        <div class="space-y-4 animate-pulse">
            ${[1, 2, 3, 4].map(() => `
                <div class="rounded-xl border border-slate-200 p-4 space-y-2">
                    <div class="h-3 bg-slate-200 rounded-full w-1/3 mb-4"></div>
                    ${[1, 2, 3].map(() => `<div class="h-3 bg-slate-100 rounded-full w-full"></div>`).join('')}
                </div>`).join('')}
        </div>`;

    // Always fetch latest data from backend to ensure transactions are populated
    fetch(`php/api.php?action=getStudent&id=${studentId}`)
        .then(r => r.json())
        .then(json => {
            if (json.success && json.data) populateProfileDrawer(json.data);
            else document.getElementById('drawerContent').innerHTML =
                `<p class="text-center text-slate-400 py-12">Failed to load student data.</p>`;
        })
        .catch(() => {
            document.getElementById('drawerContent').innerHTML =
                `<p class="text-center text-slate-400 py-12">Network error. Please try again.</p>`;
        });
}

function closeProfileDrawer() {
    const overlay = document.getElementById('profileDrawerOverlay');
    const drawer  = document.getElementById('profileDrawer');
    drawer.classList.add('translate-x-full');
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

function populateProfileDrawer(s) {
    document.getElementById('drawerStudentName').textContent =
        `${s.first_name}${s.middle_name ? ' ' + s.middle_name.charAt(0) + '.' : ''} ${s.last_name}${s.suffix ? ' ' + s.suffix : ''}`;
    document.getElementById('drawerStudentId').textContent =
        s.student_id ? `ID: ${s.student_id}` : 'Student ID Pending';

    const fatherName = s.father_deceased
        ? '<em class="text-slate-400">Deceased</em>'
        : `${v(s.father_first_name)} ${v(s.father_middle_name,'')} ${v(s.father_last_name)}`.trim();

    const motherName = s.mother_deceased
        ? '<em class="text-slate-400">Deceased</em>'
        : `${v(s.mother_first_name)} ${v(s.mother_middle_name,'')} ${v(s.mother_last_name)}`.trim();

    // Calculate billing & payment numbers matching server
    const isSeniorHigh = s.level && s.level.toLowerCase().includes('senior');
    const voucherType = s.voucher_eligibility || '';
    
    let tuition = isSeniorHigh ? 20000 : 12000;
    let registration = 500;
    let lab = isSeniorHigh ? 1500 : 500;
    let library = isSeniorHigh ? 500 : 300;
    let idFee = 200;
    let uniform = isSeniorHigh ? 3000 : 0;
    
    let subtotal = tuition + registration + lab + library + idFee + uniform;
    let voucherDeduction = 0;
    
    if (isSeniorHigh) {
        if (voucherType === 'public-school' || voucherType === 'same-school') {
            voucherDeduction = tuition + registration + lab + library + idFee;
        } else if (voucherType === 'private-school') {
            voucherDeduction = 17500;
        }
    }
    
    const totalToPay = subtotal - voucherDeduction;
    const totalPaid = parseFloat(s.total_paid) || 0;
    const remaining = Math.max(0, totalToPay - totalPaid);

    let paymentHistoryHtml = '';
    if (!s.payments || s.payments.length === 0) {
        paymentHistoryHtml = `<p class="text-[10px] text-slate-400 italic mt-1.5">No payment transactions recorded yet.</p>`;
    } else {
        paymentHistoryHtml = `
            <div class="space-y-1.5 mt-2 max-h-40 overflow-y-auto pr-1">
                ${s.payments.map(p => `
                    <div class="flex justify-between items-center text-[10px] p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100/50 transition">
                        <div>
                            <span class="font-mono font-bold text-slate-700 block">${p.reference_no}</span>
                            <span class="text-[8px] text-slate-400 block">${new Date(p.created_at).toLocaleString()}</span>
                            <span class="text-[8px] text-slate-400 block font-mono">Card: ${p.card_number_masked}</span>
                        </div>
                        <span class="font-extrabold text-slate-800">₱${parseFloat(p.amount).toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    document.getElementById('drawerContent').innerHTML = `
        <!-- Status & Badges -->
        <div class="flex flex-wrap gap-2">
            ${statusBadge(s.status)}
            ${s.class_section ? `<span class="text-xs font-mono bg-blue-600 text-white px-2.5 py-0.5 rounded-md shadow-sm font-semibold border border-transparent">${s.class_section}</span>` : ''}
            ${s.level  ? `<span class="text-xs bg-slate-600 text-white px-2.5 py-0.5 rounded-md shadow-sm font-semibold border border-transparent">${s.level}</span>` : ''}
            ${s.strand ? `<span class="text-xs bg-indigo-600 text-white px-2.5 py-0.5 rounded-md shadow-sm font-semibold border border-transparent">${s.strand}</span>` : ''}
        </div>

        ${sectionCard('fas fa-calculator', 'Billing & Payments', `
            ${infoRow('Total Fees Assessed', '₱' + totalToPay.toLocaleString())}
            ${infoRow('Total Amount Paid', '₱' + totalPaid.toLocaleString())}
            ${infoRow('Outstanding Balance', '₱' + remaining.toLocaleString())}
            
            <div class="mt-3">
                <button type="button" onclick="openAdminCashierPaymentModal(${s.id})" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                    <i class="fas fa-cash-register"></i> Record Cashier / Walk-in Payment
                </button>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction History</p>
                ${paymentHistoryHtml}
            </div>
        `)}

        ${sectionCard('fas fa-user', 'Personal Information', `
            ${infoRow('Full Name', `${v(s.first_name)} ${v(s.middle_name,'')} ${v(s.last_name)}${s.suffix ? ' '+s.suffix : ''}`)}
            ${infoRow('Date of Birth', fmtDate(s.dob))}
            ${infoRow('Gender', s.gender)}
            ${infoRow('Civil Status', s.civil_status)}
            ${infoRow('Nationality', s.nationality)}
            ${infoRow('Religion', s.religion)}
            ${infoRow('Dialect', s.dialect)}
            ${infoRow('Place of Birth', s.place_of_birth)}
        `)}

        ${sectionCard('fas fa-map-marker-alt', 'Contact & Address', `
            ${infoRow('Email', s.email)}
            ${infoRow('Phone', s.phone)}
            ${infoRow('Landline', s.landline)}
            ${infoRow('Address', s.address)}
            ${infoRow('Zip Code', s.zip_code)}
        `)}

        ${sectionCard('fas fa-school', 'Educational Background', `
            ${infoRow('LRN', s.lrn)}
            ${infoRow('Elementary School', s.elementary_school)}
            ${infoRow('Elementary Year finished', s.elementary_year_graduated)}
            ${infoRow('Previous School', s.high_school)}
            ${infoRow('Previous School Year finished', s.high_school_year_graduated)}
            ${infoRow('Public School Graduate', s.public_school_graduate)}
        `)}

        ${sectionCard('fas fa-graduation-cap', 'Enrollment Information', `
            ${infoRow('Level', s.level)}
            ${infoRow('Grade Level', s.grade_level)}
            ${infoRow('Strand', s.strand)}
            ${infoRow('Section', s.class_section)}
            ${infoRow('Student ID', s.student_id)}
            ${infoRow('Voucher Eligibility', s.voucher_eligibility)}
            ${infoRow('Applied On', fmtDate(s.created_at))}
            ${infoRow('Approved On', fmtDate(s.approved_at))}
        `)}

        ${sectionCard('fas fa-user-friends', 'Parents & Guardian', `
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2 pb-1">Father</p>
            ${infoRow('Name', fatherName)}
            ${!s.father_deceased ? infoRow('Phone', s.father_phone) : ''}
            ${!s.father_deceased ? infoRow('Occupation', s.father_occupation) : ''}
            ${!s.father_deceased ? infoRow('Address', s.father_address) : ''}
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-3 pb-1">Mother</p>
            ${infoRow('Name', motherName)}
            ${!s.mother_deceased ? infoRow('Phone', s.mother_phone) : ''}
            ${!s.mother_deceased ? infoRow('Occupation', s.mother_occupation) : ''}
            ${!s.mother_deceased ? infoRow('Address', s.mother_address) : ''}
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-3 pb-1">Guardian</p>
            ${infoRow('Name', `${v(s.guardian_first_name)} ${v(s.guardian_middle_name,'')} ${v(s.guardian_last_name)}`.trim())}
            ${infoRow('Phone', s.guardian_phone)}
            ${infoRow('Occupation', s.guardian_occupation)}
            ${infoRow('Address', s.guardian_address)}
        `)}

        ${sectionCard('fas fa-file-alt', 'Submitted Documents', `
            ${s.birth_cert_path ? infoRow('Birth Certificate', `<a href="${s.birth_cert_path}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1.5"><i class="fas fa-external-link-alt text-[10px]"></i> View Birth Certificate</a>`) : infoRow('Birth Certificate', '<span class="text-slate-400">Not Uploaded</span>')}
            ${s.report_card_path ? infoRow('Report Card', `<a href="${s.report_card_path}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1.5"><i class="fas fa-external-link-alt text-[10px]"></i> View Report Card</a>`) : infoRow('Report Card', '<span class="text-slate-400">Not Uploaded</span>')}
            ${s.good_moral_path ? infoRow('Good Moral Certificate', `<a href="${s.good_moral_path}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1.5"><i class="fas fa-external-link-alt text-[10px]"></i> View Good Moral Cert</a>`) : infoRow('Good Moral Certificate', '<span class="text-slate-400">Not Uploaded</span>')}
            ${s.voucher_path ? infoRow('Voucher Certificate', `<a href="${s.voucher_path}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1.5"><i class="fas fa-external-link-alt text-[10px]"></i> View Voucher Certificate</a>`) : ''}
        `)}
    `;
}

// ─── Curriculum Tab ───────────────────────────────────────────
let allSubjects = [];

async function loadAllSubjects() {
    try {
        const response = await fetch('php/api.php?action=getSubjects');
        const result = await response.json();
        if (result.success) {
            allSubjects = result.data || [];
            renderCurriculumSubjects();
        } else {
            console.error('Failed to load subjects:', result.message);
        }
    } catch (err) {
        console.error('Error fetching subjects:', err);
    }
}


function renderCurriculumSubjects() {
    const levelSelect = document.getElementById('curriculumLevelSelect');
    const grid        = document.getElementById('curriculumGrid');
    if (!levelSelect || !grid) return;

    const selectedLevel = levelSelect.value;
    const subjects = allSubjects.filter(s => s.level_strand === selectedLevel);
    
    if (!subjects.length) {
        grid.innerHTML = `<div class="col-span-full text-center text-slate-400 py-8">No subjects found for this track.</div>`;
        return;
    }

    grid.innerHTML = subjects.map(sub => `
        <div class="bg-white rounded-xl border border-slate-200 p-5 flex flex-col hover:shadow-md transition duration-200 relative group">
            <div class="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                <button onclick="editSubject(${sub.id})" class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition">
                    <i class="fas fa-edit text-xs"></i>
                </button>
                <button onclick="deleteSubject(${sub.id})" class="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition">
                    <i class="fas fa-trash-alt text-xs"></i>
                </button>
            </div>
            <div class="mb-3 pr-16">
                <span class="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-100 uppercase">${sub.code}</span>
            </div>
            <h4 class="font-bold text-slate-800 text-sm mb-1.5 pr-2">${sub.name}</h4>
            <p class="text-xs text-slate-500 leading-relaxed">${v(sub.description, '')}</p>
        </div>`).join('');
}

// ─── Subject Management (CRUD) ───────────────────────────────────

function openSubjectModal() {
    document.getElementById('subjectForm').reset();
    document.getElementById('subjectId').value = '';
    const levelStrand = document.getElementById('curriculumLevelSelect').value;
    document.getElementById('subjectLevelStrand').value = levelStrand;
    
    document.getElementById('subjectModalTitle').innerHTML = '<i class="fas fa-book mr-2 text-blue-500"></i>Add Subject';
    const modal = document.getElementById('subjectModal');
    const content = document.getElementById('subjectModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function editSubject(id) {
    const subject = allSubjects.find(s => s.id == id);
    if (!subject) return;

    document.getElementById('subjectId').value = subject.id;
    document.getElementById('subjectLevelStrand').value = subject.level_strand;
    document.getElementById('subjectCode').value = subject.code;
    document.getElementById('subjectName').value = subject.name;
    document.getElementById('subjectDescription').value = subject.description;

    document.getElementById('subjectModalTitle').innerHTML = '<i class="fas fa-edit mr-2 text-blue-500"></i>Edit Subject';
    const modal = document.getElementById('subjectModal');
    const content = document.getElementById('subjectModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideSubjectModal() {
    const modal = document.getElementById('subjectModal');
    const content = document.getElementById('subjectModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

async function saveSubject(e) {
    e.preventDefault();
    
    const id = document.getElementById('subjectId').value;
    const isEdit = !!id;
    const action = isEdit ? 'updateSubject' : 'addSubject';
    
    const payload = {
        action: action,
        level_strand: document.getElementById('subjectLevelStrand').value,
        code: document.getElementById('subjectCode').value.trim(),
        name: document.getElementById('subjectName').value.trim(),
        description: document.getElementById('subjectDescription').value.trim()
    };
    if (isEdit) payload.id = id;

    hideSubjectModal();
    
    try {
        const response = await fetch('php/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            Swal.fire({
                title: 'Saved!',
                text: 'The subject has been ' + (isEdit ? 'updated' : 'added') + ' successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            await loadAllSubjects();
        } else {
            Swal.fire('Error', result.message || 'Failed to save subject', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Network error occurred.', 'error');
    }
}

function deleteSubject(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This subject will be permanently deleted.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch('php/api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'deleteSubject', id: id })
                });
                const res = await response.json();
                
                if (res.success) {
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Subject has been deleted.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    await loadAllSubjects();
                } else {
                    Swal.fire('Error', res.message || 'Failed to delete subject', 'error');
                }
            } catch (err) {
                Swal.fire('Error', 'Network error occurred.', 'error');
            }
        }
    });
}

// ─── Sections Management ──────────────────────────────────────
let allSections = [];
let sectionLevelFilter = 'junior';

async function loadAllSections() {
    try {
        const res = await fetch('php/api.php?action=getSections');
        const json = await res.json();
        if (json.success) {
            allSections = json.data || [];
            if(document.getElementById('sectionsTab') && !document.getElementById('sectionsTab').classList.contains('hidden')) {
                renderSectionsTab();
            }
        }
    } catch (e) {
        console.error("Failed to load sections", e);
    }
}

function updateSectionStrandVisibility() {
    const level = document.getElementById('sectionLevelSelect').value;
    const strandSelect = document.getElementById('sectionStrandSelect');
    if (level === 'senior') {
        strandSelect.classList.remove('hidden');
    } else {
        strandSelect.classList.add('hidden');
    }
    updateSectionGradeOptions();
}

function updateSectionGradeOptions() {
    const level = document.getElementById('sectionLevelSelect').value;
    const gradeSelect = document.getElementById('sectionGradeSelect');
    gradeSelect.innerHTML = '';
    if (level === 'junior') {
        ['7', '8', '9', '10'].forEach(g => {
            gradeSelect.innerHTML += `<option value="${g}">Grade ${g}</option>`;
        });
    } else {
        ['11', '12'].forEach(g => {
            gradeSelect.innerHTML += `<option value="${g}">Grade ${g}</option>`;
        });
    }
}

function renderSectionsTab() {
    const levelVal = document.getElementById('sectionLevelSelect').value;   // 'junior' | 'senior'
    const grade    = document.getElementById('sectionGradeSelect').value;
    const strandVal = levelVal === 'senior' ? document.getElementById('sectionStrandSelect').value : null;

    // Map dropdown shorthand → DB full strings
    const levelFull  = levelVal === 'junior' ? 'Junior High School' : 'Senior High School';
    const strandLow  = strandVal ? strandVal.toLowerCase() : null;   // DB stores lowercase

    // Filter sections
    let filteredSections = allSections.filter(s =>
        s.level === levelFull && String(s.grade_level) === String(grade)
    );
    if (strandLow) filteredSections = filteredSections.filter(s =>
        (s.strand || '').toLowerCase() === strandLow
    );

    // Render Section Cards
    const grid = document.getElementById('sectionsGrid');
    if (!filteredSections.length) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <i class="fas fa-layer-group text-3xl mb-3 block opacity-30"></i>
            No sections found for this filter.
        </div>`;
    } else {
        grid.innerHTML = filteredSections.map(sec => {
            const isFull = sec.student_count >= sec.max_students;
            const strandLabel = sec.strand ? `<span class="text-xs font-semibold uppercase tracking-wide text-indigo-500">${sec.strand}</span> &bull; ` : '';
            const schedHtml = (sec.schedules && sec.schedules.length > 0)
                ? sec.schedules.map(sch => {
                    const fmt = t => { const [h,m] = t.split(':'); const d = new Date(); d.setHours(h,m); return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}); };
                    return `<div class="flex items-start gap-2 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <span class="shrink-0 text-[10px] font-bold text-white bg-blue-500 rounded px-1.5 py-0.5 mt-0.5 w-[30px] text-center">${sch.day.slice(0,3).toUpperCase()}</span>
                        <div class="min-w-0">
                            <div class="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">${sch.subject_code}</div>
                            <div class="text-[10px] text-slate-400 dark:text-slate-500">${fmt(sch.start_time)} – ${fmt(sch.end_time)} &bull; ${sch.teacher_name}${sch.room ? ' &bull; ' + sch.room : ''}</div>
                        </div>
                    </div>`;
                  }).join('')
                : `<div class="text-[11px] text-slate-400 dark:text-slate-500 text-center py-3 italic">No schedule yet — click <i class="fas fa-calendar-alt"></i> to add</div>`;

             return `
            <div class="bg-white dark:bg-[#181f30] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-md">
                <!-- Card Header -->
                <div class="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-[#151f32] dark:to-[#181f30] flex justify-between items-start group cursor-pointer" onclick="openRosterModal(${sec.id})">
                    <div class="min-w-0">
                        <h5 class="font-bold text-slate-800 dark:text-white text-base leading-tight">${sec.name}</h5>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${strandLabel}Grade ${sec.grade_level} &bull; ${sec.level}</p>
                    </div>
                    <div class="flex items-center gap-2 ml-2 shrink-0">
                        <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${isFull ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'}">
                            <i class="fas fa-users mr-1"></i>${sec.student_count}/${sec.max_students}
                        </span>
                        <button onclick="event.stopPropagation(); openScheduleModal(${sec.id}, '${sec.name}', '${levelVal}', '${strandVal || ''}')" class="text-blue-400 hover:text-blue-600 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 p-1.5 rounded-lg transition" title="Manage Schedule">
                            <i class="fas fa-calendar-alt text-xs"></i>
                        </button>
                        <button onclick="event.stopPropagation(); deleteSection(${sec.id})" class="text-slate-300 hover:text-red-500 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg transition" title="Delete Section">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                </div>

                <div class="px-3 pt-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Schedule</span>
                        <span class="text-[10px] text-blue-500 cursor-pointer hover:underline" onclick="openScheduleModal(${sec.id}, '${sec.name}', '${levelVal}', '${strandVal || ''}')">Manage &rsaquo;</span>
                    </div>
                    <div class="space-y-0 max-h-28 overflow-y-auto pr-0.5">${schedHtml}</div>
                </div>

                <div class="p-3 bg-slate-50 dark:bg-[#151f32]/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                    <div class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <i class="fas fa-user-graduate text-slate-400 dark:text-slate-500"></i>
                        <span>${sec.student_count} Enrolled</span>
                    </div>
                    <button onclick="openRosterModal(${sec.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-sm">
                        <i class="fas fa-users text-[10px]"></i> Show Students
                    </button>
                </div>
            </div>`;
        }).join('');
    }





    // Populate Target Section Dropdown
    const targetSelect = document.getElementById('assignTargetSection');
    targetSelect.innerHTML = `<option value="">-- Select Target Section --</option>` +
        filteredSections.map(sec => {
            const secCode = `${sec.level}-${sec.grade_level}-${(sec.strand || '').toLowerCase()}-${sec.name}`;
            return `<option value="${secCode}">${sec.name} (${sec.student_count}/${sec.max_students})</option>`;
        }).join('');

    document.getElementById('sectionAssignTools').classList.remove('hidden');

    // Render Unassigned Students
    renderUnassignedStudents(levelVal, grade, strandLow);
}


function renderUnassignedStudents(levelVal, grade, strandLow) {
    const list = document.getElementById('unassignedStudentsList');
    const levelFull = levelVal === 'junior' ? 'Junior High School' : 'Senior High School';

    // Find approved students with no section, matching level
    let unassigned = allStudents.filter(s =>
        s.status === 'approved' &&
        (!s.class_section || s.class_section.trim() === '') &&
        (s.level || '').toLowerCase().includes(levelVal.toLowerCase())
    );

    if (levelVal === 'senior' && strandLow) {
        unassigned = unassigned.filter(s => (s.strand || '').toLowerCase() === strandLow);
    }

    if (!unassigned.length) {
        list.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm">All students in this group are assigned.</div>`;
        return;
    }

    list.innerHTML = unassigned.map(st => `
        <div class="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center hover:border-blue-300 transition shadow-sm">
            <div class="overflow-hidden pr-2">
                <p class="text-sm font-semibold text-slate-800 truncate" title="${st.first_name} ${st.last_name}">${st.first_name} ${st.last_name}</p>
                <p class="text-xs text-slate-500 truncate mt-0.5">${st.email}</p>
            </div>
            <button onclick="assignStudentToSelectedSection(${st.id})" class="shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-sm" title="Assign">
                <i class="fas fa-arrow-left text-xs"></i>
            </button>
        </div>
    `).join('');
}

function selectSectionForAssign(sectionId) {
    const sec = allSections.find(s => s.id == sectionId);
    if (!sec) return;
    const secCode = `${sec.level}-${sec.grade_level}-${sec.strand || ''}-${sec.name}`;
    const targetSelect = document.getElementById('assignTargetSection');
    targetSelect.value = secCode;
    
    // Highlight the selection
    targetSelect.classList.add('ring-2', 'ring-blue-500');
    setTimeout(() => targetSelect.classList.remove('ring-2', 'ring-blue-500'), 500);
}

async function assignStudentToSelectedSection(studentId) {
    const targetSelect = document.getElementById('assignTargetSection');
    const sectionCode = targetSelect.value;
    
    if (!sectionCode) {
        Swal.fire({ icon: 'warning', title: 'No Section Selected', text: 'Please select a target section from the dropdown or click on a section card.' });
        return;
    }

    try {
        const res = await fetch('php/api.php?action=assignSection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, sectionCode })
        });
        const json = await res.json();
        if (json.success) {
            await Promise.all([loadAllSections(), loadAllStudents()]);
            Swal.fire({ icon: 'success', title: 'Assigned', text: 'Student assigned successfully.', timer: 1500, showConfirmButton: false });
        } else {
            Swal.fire('Error', json.message || 'Failed to assign student', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Network error.', 'error');
    }
}

async function unassignStudent(studentId, fromRoster = false) {
    const { isConfirmed } = await Swal.fire({
        icon: 'warning',
        title: 'Remove Student?',
        text: 'Are you sure you want to remove this student from their assigned section?',
        showCancelButton: true,
        confirmButtonText: 'Yes, Remove',
        confirmButtonColor: '#dc2626',
        cancelButtonText: 'Cancel'
    });
    if (!isConfirmed) return;

    Swal.fire({ title: 'Removing student...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch('php/api.php?action=assignSection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, sectionCode: null }) // null means unassign
        });
        const json = await res.json();
        if (json.success) {
            await Promise.all([loadAllSections(), loadAllStudents()]);
            if (fromRoster && typeof currentRosterSectionId !== 'undefined' && currentRosterSectionId) {
                updateRosterDOM(currentRosterSectionId);
            }
            Swal.fire({
                icon: 'success',
                title: 'Removed!',
                text: 'Student has been removed from the section.',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            Swal.fire('Error', json.message || 'Failed to remove student', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Network error.', 'error');
    }
}

async function moveStudentSection(studentId, currentSectionId, studentName, level, gradeLevel, strand, fromRoster = false) {
    // Filter sections of the same level, grade, and strand (excluding current section)
    const targetSections = allSections.filter(s =>
        s.level === level &&
        String(s.grade_level) === String(gradeLevel) &&
        (level === 'Junior High School' || String(s.strand).toLowerCase() === String(strand).toLowerCase()) &&
        s.id != currentSectionId
    );

    if (targetSections.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'No other sections',
            text: 'There are no other sections available for this grade level.'
        });
        return;
    }

    // Build option map for the SweetAlert select dropdown
    const options = {};
    targetSections.forEach(sec => {
        const secCode = `${sec.level}-${sec.grade_level}-${(sec.strand || '').toLowerCase()}-${sec.name}`;
        options[secCode] = `${sec.name} (${sec.student_count}/${sec.max_students})`;
    });

    const { value: newSectionCode } = await Swal.fire({
        title: `Move ${studentName}`,
        text: 'Select a target section relative to their current grade level:',
        input: 'select',
        inputOptions: options,
        inputPlaceholder: '-- Select Target Section --',
        showCancelButton: true,
        confirmButtonText: 'Move Student',
        confirmButtonColor: '#2563eb',
        inputValidator: (value) => {
            if (!value) {
                return 'You need to select a section!';
            }
        }
    });

    if (newSectionCode) {
        Swal.fire({ title: 'Moving student...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const res = await fetch('php/api.php?action=assignSection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, sectionCode: newSectionCode })
            });
            const json = await res.json();
            if (json.success) {
                await Promise.all([loadAllSections(), loadAllStudents()]);
                if (fromRoster && typeof currentRosterSectionId !== 'undefined' && currentRosterSectionId) {
                    updateRosterDOM(currentRosterSectionId);
                }
                Swal.fire({
                    icon: 'success',
                    title: 'Moved!',
                    text: `${studentName} has been moved successfully.`,
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Error', json.message || 'Failed to move student', 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'Network error.', 'error');
        }
    }
}

let currentRosterSectionId = null;

function openRosterModal(sectionId) {
    currentRosterSectionId = sectionId;
    updateRosterDOM(sectionId);

    const modal = document.getElementById('sectionRosterModal');
    const content = document.getElementById('sectionRosterModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideRosterModal() {
    const modal = document.getElementById('sectionRosterModal');
    const content = document.getElementById('sectionRosterModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        currentRosterSectionId = null;
    }, 300);
}

function updateRosterDOM(sectionId) {
    const sec = allSections.find(s => s.id == sectionId);
    if (!sec) return;

    // Set Section details
    document.getElementById('rosterSectionNameTitle').textContent = sec.name;
    const strandText = sec.strand ? ` · ${sec.strand.toUpperCase()} Strand` : '';
    document.getElementById('rosterSectionSubtitle').textContent = `${sec.level} · Grade ${sec.grade_level}${strandText}`;

    // Capacity progress bar
    const count = sec.student_count || 0;
    const max = sec.max_students || 40;
    const pct = Math.min((count / max) * 100, 100);
    document.getElementById('rosterCapacityText').textContent = `${count} / ${max} Students`;
    const bar = document.getElementById('rosterCapacityBar');
    bar.style.width = `${pct}%`;
    if (pct >= 100) {
        bar.className = "bg-red-500 h-2 rounded-full transition-all duration-500";
    } else if (pct >= 85) {
        bar.className = "bg-yellow-500 h-2 rounded-full transition-all duration-500";
    } else {
        bar.className = "bg-blue-600 h-2 rounded-full transition-all duration-500";
    }

    // Set Timetable button action
    const lvlVal = sec.level.includes('Senior') ? 'senior' : 'junior';
    const strVal = sec.strand || '';
    document.getElementById('rosterEditScheduleBtn').onclick = () => {
        hideRosterModal();
        setTimeout(() => openScheduleModal(sec.id, sec.name, lvlVal, strVal), 300);
    };

    // Render enrolled students
    const rosterStudentsContainer = document.getElementById('rosterStudentsContainer');
    document.getElementById('rosterCountBadge').textContent = count;

    if (!sec.students || sec.students.length === 0) {
        rosterStudentsContainer.innerHTML = `
            <div class="text-center py-12 text-slate-400">
                <i class="fas fa-user-slash text-3xl mb-2 block opacity-30"></i>
                No students enrolled in this section yet.
            </div>`;
    } else {
        rosterStudentsContainer.innerHTML = `
            <div class="overflow-x-auto min-h-0">
                <table class="w-full text-xs text-left">
                    <thead>
                        <tr class="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                            <th class="px-3 py-2">Student ID</th>
                            <th class="px-3 py-2">Name</th>
                            <th class="px-3 py-2">Email</th>
                            <th class="px-3 py-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${sec.students.map(st => `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="px-3 py-2.5 font-mono font-medium text-slate-500">${st.student_id || 'N/A'}</td>
                                <td class="px-3 py-2.5 font-semibold text-slate-700">${st.first_name} ${st.last_name}</td>
                                <td class="px-3 py-2.5 text-slate-400">${st.email}</td>
                                <td class="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                                    <button onclick="moveStudentSection(${st.id}, ${sec.id}, '${st.first_name.replace(/'/g, "\\'")} ${st.last_name.replace(/'/g, "\\'")}', '${sec.level}', '${sec.grade_level}', '${sec.strand || ''}', true)" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-2 py-1 rounded text-[10px] font-semibold transition" title="Move Section">
                                        <i class="fas fa-exchange-alt mr-0.5"></i> Move
                                    </button>
                                    <button onclick="unassignStudent(${st.id}, true)" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded text-[10px] font-semibold transition" title="Unassign Student">
                                        <i class="fas fa-times mr-0.5"></i> Remove
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    }

    // Render unassigned list (relative to grade level/strand)
    const rosterUnassignedList = document.getElementById('rosterUnassignedList');
    const matchingUnassigned = allStudents.filter(s =>
        s.status === 'approved' &&
        (!s.class_section || s.class_section.trim() === '') &&
        s.level === sec.level &&
        String(s.grade_level) === String(sec.grade_level) &&
        (sec.level === 'Junior High School' || String(s.strand).toLowerCase() === String(sec.strand).toLowerCase())
    );

    if (matchingUnassigned.length === 0) {
        rosterUnassignedList.innerHTML = `
            <div class="text-center py-10 text-slate-400 text-xs">
                All matching students for this grade are already assigned.
            </div>`;
    } else {
        rosterUnassignedList.innerHTML = matchingUnassigned.map(st => `
            <div class="bg-white border border-slate-200 rounded-lg p-2.5 flex justify-between items-center shadow-sm hover:border-blue-300 transition">
                <div class="min-w-0 flex-1 pr-2">
                    <p class="text-xs font-bold text-slate-700 truncate" title="${st.first_name} ${st.last_name}">${st.first_name} ${st.last_name}</p>
                    <p class="text-[10px] text-slate-400 truncate mt-0.5">${st.email}</p>
                </div>
                <button onclick="assignStudentFromRoster(${st.id}, '${sec.level}', '${sec.grade_level}', '${sec.strand || ''}', '${sec.name}')" class="shrink-0 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white w-7 h-7 rounded-full flex items-center justify-center transition shadow-sm" title="Add to Section">
                    <i class="fas fa-plus text-xs"></i>
                </button>
            </div>
        `).join('');
    }
}

async function assignStudentFromRoster(studentId, level, gradeLevel, strand, name) {
    const sectionCode = `${level}-${gradeLevel}-${(strand || '').toLowerCase()}-${name}`;
    Swal.fire({ title: 'Assigning student...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch('php/api.php?action=assignSection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, sectionCode })
        });
        const json = await res.json();
        if (json.success) {
            await Promise.all([loadAllSections(), loadAllStudents()]);
            if (currentRosterSectionId) {
                updateRosterDOM(currentRosterSectionId);
            }
            Swal.fire({
                icon: 'success',
                title: 'Assigned!',
                text: 'Student has been added to this section.',
                timer: 1000,
                showConfirmButton: false
            });
        } else {
            Swal.fire('Error', json.message || 'Failed to assign student', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Network error.', 'error');
    }
}



function openSectionModal() {
    document.getElementById('sectionForm').reset();
    const modal = document.getElementById('sectionModal');
    const content = document.getElementById('sectionModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideSectionModal() {
    const modal = document.getElementById('sectionModal');
    const content = document.getElementById('sectionModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

async function saveSection(event) {
    event.preventDefault();
    const name = document.getElementById('sectionName').value.trim().toUpperCase();
    const max_students = document.getElementById('sectionMaxStudents').value;
    const levelVal = document.getElementById('sectionLevelSelect').value;
    const level = levelVal === 'junior' ? 'Junior High School' : 'Senior High School';
    const grade_level = document.getElementById('sectionGradeSelect').value;
    const strand = levelVal === 'senior' ? document.getElementById('sectionStrandSelect').value.toLowerCase() : null;

    if (!name) return;

    Swal.fire({ title: 'Saving…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch('php/api.php?action=addSection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, level, grade_level, strand, max_students })
        });
        const json = await res.json();
        
        if (json.success) {
            Swal.fire({ icon: 'success', title: 'Saved', text: 'Section added successfully.', timer: 1500, showConfirmButton: false });
            hideSectionModal();
            await loadAllSections();
        } else {
            Swal.fire('Error', json.message || 'Failed to add section', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Network error.', 'error');
    }
}

async function deleteSection(id) {
    Swal.fire({
        title: 'Delete Section?',
        text: 'Are you sure you want to delete this section?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('php/api.php?action=deleteSection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire({ icon: 'success', title: 'Deleted', text: 'Section deleted.', timer: 1500, showConfirmButton: false });
                    await loadAllSections();
                } else {
                    Swal.fire('Error', json.message || 'Failed to delete section', 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Network error.', 'error');
            }
        }
    });
}


// ─── Tab Navigation ───────────────────────────────────────────
function showAdminTab(tabName, button) {
    document.querySelectorAll('.admin-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
    });

    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) tabContent.classList.remove('hidden');

    button.classList.remove('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
    button.classList.add('bg-blue-600', 'text-white');

    // Show top dashboard widgets ONLY on the dashboard tab
    document.querySelectorAll('.dashboard-widget').forEach(widget => {
        if (tabName === 'dashboard') {
            widget.classList.remove('hidden');
        } else {
            widget.classList.add('hidden');
        }
    });

    // Hide the main content card if we are on the dashboard tab
    const mainCard = document.getElementById('mainContentCard');
    if (mainCard) {
        if (tabName === 'dashboard') mainCard.classList.add('hidden');
        else mainCard.classList.remove('hidden');
    }

    const titles = {
        dashboard:   'Admin Dashboard',
        enrollments: 'Enrollment Applications',
        students:    'Enrolled Students',
        sections:    'Manage Class Sections',
        curriculum:  'Curriculum & Subjects',
        fees:        'Tuition & Voucher Settings',
    };
    const titleEl = document.getElementById('topbarPageTitle');
    if (titleEl) titleEl.textContent = titles[tabName] || 'Admin Dashboard';

    if (tabName === 'curriculum') renderCurriculumSubjects();
    if (tabName === 'sections') renderSectionsTab();

    // Auto-close sidebar on mobile
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay && !overlay.classList.contains('hidden')) toggleSidebar();
}

function toggleSidebar() {
    if (window.innerWidth < 768) {
        document.getElementById('adminSidebar').classList.toggle('-translate-x-full');
        document.getElementById('sidebarOverlay').classList.toggle('hidden');
    } else {
        document.body.classList.toggle('sidebar-collapsed');
    }
}

// ─── Session & Auth ───────────────────────────────────────────
async function checkAdminSession() {
    try {
        const res    = await fetch('php/api.php?action=current_user');
        const result = await res.json();

        if (result.success && result.user && result.user.role === 'admin') {
            const adminName = result.user.first_name || result.user.name || 'Administrator';
            document.getElementById('adminDisplayName').textContent = result.user.name || adminName;
            
            const welcomeEl = document.getElementById('welcomeAdminName');
            if (welcomeEl) welcomeEl.textContent = adminName;

            loadAllStudents();
            loadAllSubjects();
            loadAllSections();
            
            // Poll student changes and payments every 5 seconds silently
            setInterval(() => {
                loadAllStudents(true);
            }, 5000);
        } else {
            window.location.href = 'index.html';
        }
    } catch {
        window.location.href = 'index.html';
    }
}

function logoutAdmin() {
    Swal.fire({
        title: 'Logout',
        text: 'Are you sure you want to logout?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, logout',
        cancelButtonText: 'Cancel',
    }).then(result => {
        if (result.isConfirmed) {
            fetch('php/api.php?action=logout').finally(() => {
                window.location.href = 'index.html';
            });
        }
    });
}

// ─── Change Password ──────────────────────────────────────────
function showChangePasswordModal() {
    const modal   = document.getElementById('changePasswordModal');
    const content = document.getElementById('changePasswordModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    requestAnimationFrame(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    });
}

function hideChangePasswordModal() {
    const modal   = document.getElementById('changePasswordModal');
    const content = document.getElementById('changePasswordModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        document.getElementById('changePasswordForm').reset();
    }, 300);
}

function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon  = document.getElementById(iconId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

async function submitChangePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('changeCurrentPassword').value;
    const newPassword     = document.getElementById('changeNewPassword').value;
    const confirmPassword = document.getElementById('changeConfirmPassword').value;

    if (newPassword !== confirmPassword) {
        Swal.fire({ icon: 'error', title: "Passwords Don't Match", text: 'New passwords do not match.' });
        return;
    }
    if (newPassword.length < 6) {
        Swal.fire({ icon: 'error', title: 'Password Too Short', text: 'New password must be at least 6 characters.' });
        return;
    }

    Swal.fire({ title: 'Updating…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res  = await fetch('php/api.php?action=change_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();

        if (data.success) {
            await Swal.fire({ icon: 'success', title: 'Password Updated!', text: 'Your password has been changed successfully.' });
            hideChangePasswordModal();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to update password.' });
        }
    } catch {
        Swal.fire({ icon: 'error', title: 'Network Error', text: 'Please try again.' });
    }
}

// ─ Dark Mode ──────────────────────────────────────────────

function initAdminDarkMode() {
    const isDark = localStorage.getItem('adminDarkMode') === 'true';
    if (isDark) applyAdminDark(true);
}

function toggleAdminDarkMode() {
    const isDark = document.documentElement.classList.contains('admin-dark');
    applyAdminDark(!isDark);
}

function applyAdminDark(dark) {
    const html = document.documentElement;
    const icon = document.getElementById('darkModeIcon');
    if (dark) {
        html.classList.add('admin-dark');
        if (icon) { icon.classList.replace('fa-moon', 'fa-sun'); }
    } else {
        html.classList.remove('admin-dark');
        if (icon) { icon.classList.replace('fa-sun', 'fa-moon'); }
    }
    localStorage.setItem('adminDarkMode', dark ? 'true' : 'false');
    // Re-render charts so grid/axis/tooltip colors match the new theme
    if (allStudents.length) renderCharts();
}

// ─── Date Display ─────────────────────────────────────────────
function updateDateTime() {
    const el = document.getElementById('currentDateTime');
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

// ─── TEACHERS MANAGEMENT ─────────────────────────────────────
let allTeachers = [];

async function loadAllTeachers() {
    try {
        const res = await fetch('php/api.php?action=getTeachers');
        const json = await res.json();
        if (json.success) {
            allTeachers = json.data;
            if (document.getElementById('teachersTableBody')) renderTeachersTab();
        }
    } catch (e) {
        console.error('Error loading teachers:', e);
    }
}

function renderTeachersTab() {
    const tbody = document.getElementById('teachersTableBody');
    if (!tbody) return;

    const searchInput = document.getElementById('searchTeachers');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filteredTeachers = allTeachers;
    if (query) {
        filteredTeachers = allTeachers.filter(t => t.name.toLowerCase().includes(query));
    }

    if (filteredTeachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-slate-400">No teachers found.</td></tr>';
        return;
    }
    tbody.innerHTML = filteredTeachers.map(t => `
        <tr class="hover:bg-slate-50 transition">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">${t.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${t.department || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="deleteTeacher(${t.id})" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openTeacherModal() {
    document.getElementById('teacherForm').reset();
    const modal = document.getElementById('teacherModal');
    const content = document.getElementById('teacherModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideTeacherModal() {
    const modal = document.getElementById('teacherModal');
    const content = document.getElementById('teacherModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

async function saveTeacher(event) {
    event.preventDefault();
    const name = document.getElementById('teacherName').value.trim();
    const department = document.getElementById('teacherDepartment').value.trim();
    if (!name) return;

    Swal.fire({ title: 'Saving…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch('php/api.php?action=addTeacher', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, department })
        });
        const json = await res.json();
        if (json.success) {
            Swal.fire({ icon: 'success', title: 'Saved', text: 'Teacher added successfully.', timer: 1500, showConfirmButton: false });
            hideTeacherModal();
            await loadAllTeachers();
        } else {
            Swal.fire('Error', json.message || 'Failed to add teacher', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Network error.', 'error');
    }
}

async function deleteTeacher(id) {
    Swal.fire({
        title: 'Delete Teacher?',
        text: 'Are you sure you want to delete this teacher?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('php/api.php?action=deleteTeacher', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire('Deleted!', 'Teacher has been deleted.', 'success');
                    await loadAllTeachers();
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Network error.', 'error');
            }
        }
    });
}

// ─── SECTION SCHEDULES ────────────────────────────────────────
let currentScheduleSectionId = null;

async function openScheduleModal(sectionId, sectionName, level, strand) {
    currentScheduleSectionId = sectionId;
    document.getElementById('scheduleSectionNameTitle').textContent = sectionName;
    document.getElementById('schedSectionId').value = sectionId;
    document.getElementById('scheduleForm').reset();

    // Map level/strand to subject level_strand
    let subjectKey = level === 'junior' ? 'jhs' : (strand ? strand.toLowerCase() : '');

    // Populate Subjects Dropdown
    const subjectSelect = document.getElementById('schedSubject');
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    const relevantSubjects = allSubjects.filter(sub => sub.level_strand === subjectKey || sub.level_strand.includes('core'));
    relevantSubjects.forEach(sub => {
        subjectSelect.innerHTML += `<option value="${sub.id}">${sub.code} - ${sub.name}</option>`;
    });

    // Populate Teachers Dropdown
    const teacherSelect = document.getElementById('schedTeacher');
    teacherSelect.innerHTML = '<option value="">-- Select Teacher --</option>';
    allTeachers.forEach(t => {
        teacherSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });

    // Populate Clone Dropdown
    const cloneSelect = document.getElementById('cloneScheduleSelect');
    if (cloneSelect) {
        cloneSelect.innerHTML = '<option value="">-- Clone From --</option>';
        allSections.forEach(s => {
            if (s.id !== sectionId && s.level === level) {
                cloneSelect.innerHTML += `<option value="${s.id}">Grade ${s.grade_level} - ${s.name}</option>`;
            }
        });
    }

    const modal = document.getElementById('scheduleModal');
    const content = document.getElementById('scheduleModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);

    await loadSectionSchedule(sectionId);
}

function hideScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    const content = document.getElementById('scheduleModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

async function loadSectionSchedule(sectionId) {
    try {
        const res = await fetch(`php/api.php?action=getSectionSchedule&section_id=${sectionId}`);
        const json = await res.json();
        if (json.success) {
            renderScheduleList(json.data);
        }
    } catch (e) {
        console.error('Error loading schedule:', e);
    }
}

function renderScheduleList(scheduleList) {
    const container = document.getElementById('scheduleListContainer');
    if (!scheduleList.length) {
        container.innerHTML = '<div class="text-center py-8 text-slate-400">No classes scheduled yet.</div>';
        return;
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let html = '';

    days.forEach(day => {
        const dayClasses = scheduleList.filter(s => s.day === day);
        if (dayClasses.length > 0) {
            html += `
                <div class="mb-4">
                    <h4 class="font-bold text-sm text-slate-800 bg-slate-200 px-3 py-1.5 rounded-lg mb-2">${day}</h4>
                    <div class="space-y-2">
                        ${dayClasses.map(c => {
                            const formatTime = (time24) => {
                                const [h, m] = time24.split(':');
                                const d = new Date();
                                d.setHours(h, m);
                                return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                            };
                            return `
                            <div class="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center shadow-sm">
                                <div>
                                    <div class="font-bold text-blue-600 text-sm">${c.subject_code} - ${c.subject_name}</div>
                                    <div class="text-xs text-slate-500 mt-0.5"><i class="far fa-clock mr-1"></i>${formatTime(c.start_time)} - ${formatTime(c.end_time)}</div>
                                    <div class="text-xs text-slate-500 mt-0.5"><i class="fas fa-chalkboard-teacher mr-1"></i>${c.teacher_name} ${c.room ? `• <i class="fas fa-map-marker-alt mx-1"></i>${c.room}` : ''}</div>
                                </div>
                                <button onclick="deleteSchedule(${c.id})" class="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition" title="Remove Class">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    });
    container.innerHTML = html;
}

async function saveSchedule(event) {
    event.preventDefault();
    const section_id = document.getElementById('schedSectionId').value;
    const subject_id = document.getElementById('schedSubject').value;
    const teacher_id = document.getElementById('schedTeacher').value;
    const day = document.getElementById('schedDay').value;
    const start_time = document.getElementById('schedStartTime').value;
    const end_time = document.getElementById('schedEndTime').value;
    const room = document.getElementById('schedRoom').value.trim();

    if (start_time >= end_time) {
        Swal.fire('Invalid Time', 'Start time must be before end time.', 'warning');
        return;
    }

    Swal.fire({ title: 'Saving…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch('php/api.php?action=addSectionSchedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section_id, subject_id, teacher_id, day, start_time, end_time, room })
        });
        const json = await res.json();
        if (json.success) {
            Swal.fire({ icon: 'success', title: 'Added', text: 'Class scheduled successfully.', timer: 1500, showConfirmButton: false });
            await loadSectionSchedule(section_id);
            document.getElementById('scheduleForm').reset();
            document.getElementById('schedSectionId').value = section_id;
        } else {
            Swal.fire('Conflict Detected', json.message, 'warning');
        }
    } catch (e) {
        Swal.fire('Error', 'Network error.', 'error');
    }
}

async function deleteSchedule(id) {
    Swal.fire({
        title: 'Remove Class?',
        text: 'Are you sure you want to remove this class from the schedule?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, remove'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('php/api.php?action=deleteSectionSchedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire('Removed!', 'Class has been removed.', 'success');
                    await loadSectionSchedule(currentScheduleSectionId);
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Network error.', 'error');
            }
        }
    });
}

// ─── BULK OPERATIONS ──────────────────────────────────────────

async function autoAssignStudents() {
    const level = document.getElementById('sectionLevelSelect').value;
    const grade = document.getElementById('sectionGradeSelect').value;
    const strand = level === 'senior' ? document.getElementById('sectionStrandSelect').value : null;

    Swal.fire({
        title: 'Auto-Assign Students?',
        text: `This will assign all unassigned students in Grade ${grade} to available sections.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, auto-assign'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Assigning...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                const res = await fetch('php/api.php?action=autoAssignStudents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ level, grade, strand })
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire('Success', json.message, 'success');
                    await Promise.all([loadAllSections(), loadAllStudents()]);
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Network error.', 'error');
            }
        }
    });
}

async function cloneSchedule() {
    const sourceSectionId = document.getElementById('cloneScheduleSelect').value;
    if (!sourceSectionId) {
        Swal.fire('Error', 'Please select a section to clone from.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Clone Schedule?',
        text: 'This will copy the schedule from the selected section. Some classes may be skipped if there are time/teacher conflicts.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, clone'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Cloning...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                const res = await fetch('php/api.php?action=cloneSectionSchedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source_section_id: sourceSectionId, target_section_id: currentScheduleSectionId })
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire('Success', json.message, 'success');
                    await loadSectionSchedule(currentScheduleSectionId);
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Network error.', 'error');
            }
        }
    });
}

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initAdminDarkMode();
    updateDateTime();
    updateSectionGradeOptions();
    checkAdminSession();
    loadAllTeachers();

    // Search hotkey shortcut ('/' or 'Ctrl+K')
    document.addEventListener('keydown', (e) => {
        if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            const searchInput = document.getElementById('searchStudents') || document.getElementById('searchEnrollments');
            if (searchInput) searchInput.focus();
        }
    });
});

function exportDatabaseSQL() {
    window.location.href = 'php/api.php?action=exportDatabaseSQL';
}

// ─── Walk-in Cashier Payments & Receipts ─────────────────────

function toggleInitialPaymentFields() {
    const isChecked = document.getElementById('toggleInitialPayment')?.checked;
    const fieldsDiv = document.getElementById('initialPaymentFields');
    if (fieldsDiv) {
        if (isChecked) {
            fieldsDiv.classList.remove('hidden');
        } else {
            fieldsDiv.classList.add('hidden');
        }
    }
}
window.toggleInitialPaymentFields = toggleInitialPaymentFields;

function openAdminCashierPaymentModal(studentId) {
    const student = allStudents.find(s => s.id == studentId);
    if (!student) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Student record not found.' });
        return;
    }

    const isSeniorHigh = student.level && student.level.toLowerCase().includes('senior');
    const voucherType = student.voucher_eligibility || '';
    
    let tuition = isSeniorHigh ? 20000 : 12000;
    let registration = 500;
    let lab = isSeniorHigh ? 1500 : 500;
    let library = isSeniorHigh ? 500 : 300;
    let idFee = 200;
    let uniform = isSeniorHigh ? 3000 : 0;
    
    let subtotal = tuition + registration + lab + library + idFee + uniform;
    let voucherDeduction = 0;
    
    if (isSeniorHigh) {
        if (voucherType === 'public-school' || voucherType === 'same-school') {
            voucherDeduction = tuition + registration + lab + library + idFee;
        } else if (voucherType === 'private-school') {
            voucherDeduction = 17500;
        }
    }
    
    const totalToPay = subtotal - voucherDeduction;
    const totalPaid = parseFloat(student.total_paid) || 0;
    const remaining = Math.max(0, totalToPay - totalPaid);

    document.getElementById('cashierStudentId').value = student.id;
    document.getElementById('cashierStudentName').textContent = `${student.first_name} ${student.last_name}`;
    document.getElementById('cashierStudentIdNum').textContent = student.student_id ? `ID: ${student.student_id}` : 'ID Pending';
    document.getElementById('cashierCurrentBalance').textContent = `₱${remaining.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    
    document.getElementById('cashierAmount').value = remaining > 0 ? remaining : '';
    document.getElementById('cashierOR').value = '';
    document.getElementById('cashierNotes').value = '';
    document.getElementById('cashierMethod').value = 'Cash';

    const modal = document.getElementById('adminCashierPaymentModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}
window.openAdminCashierPaymentModal = openAdminCashierPaymentModal;

function closeAdminCashierPaymentModal() {
    const modal = document.getElementById('adminCashierPaymentModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}
window.closeAdminCashierPaymentModal = closeAdminCashierPaymentModal;

async function submitAdminCashierPayment(event) {
    if (event) event.preventDefault();

    const studentId     = document.getElementById('cashierStudentId').value;
    const amount        = parseFloat(document.getElementById('cashierAmount').value) || 0;
    const paymentMethod = document.getElementById('cashierMethod').value;
    const orNumber      = document.getElementById('cashierOR').value.trim();
    const notes         = document.getElementById('cashierNotes').value.trim();

    if (!studentId || amount <= 0) {
        Swal.fire({ icon: 'warning', title: 'Invalid Payment', text: 'Please enter a valid payment amount greater than zero.' });
        return;
    }

    Swal.fire({ title: 'Processing cash payment…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch('php/api.php?action=recordAdminPayment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, amount, paymentMethod, orNumber, notes })
        });
        
        const rawText = await res.text();
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (parseErr) {
            Swal.fire({ icon: 'error', title: 'Server Error', text: 'Server response error: ' + rawText.substring(0, 150) });
            return;
        }

        if (result.success) {
            safeCloseSwal();
            closeAdminCashierPaymentModal();
            
            // Refresh student data & drawer if open
            await loadAllStudents();
            if (typeof currentReviewId !== 'undefined' && currentReviewId == studentId) {
                openProfileDrawer(studentId);
            }

            // Show Official Receipt Modal
            openOfficialReceiptModal({
                orNumber: result.reference_no,
                studentName: result.student_name,
                studentId: result.student_id_num || '—',
                method: result.payment_method,
                amountPaid: result.amount,
                remainingBalance: typeof result.remaining_balance === 'number' ? result.remaining_balance : 0
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Payment Failed', text: result.message || 'Could not record cashier payment.' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Network Error', text: err.message || 'Failed to communicate with server. Please try again.' });
    }
}
window.submitAdminCashierPayment = submitAdminCashierPayment;

function openOfficialReceiptModal(data) {
    document.getElementById('receiptOR').textContent = data.orNumber || '—';
    document.getElementById('receiptStudentName').textContent = data.studentName || '—';
    document.getElementById('receiptStudentId').textContent = data.studentId || '—';
    document.getElementById('receiptMethod').textContent = data.method || 'Cash';
    document.getElementById('receiptDateTime').textContent = new Date().toLocaleString();
    
    document.getElementById('receiptAmountPaid').textContent = `₱${parseFloat(data.amountPaid).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    
    const remBal = typeof data.remainingBalance === 'number' ? data.remainingBalance : 0;
    document.getElementById('receiptRemainingBalance').textContent = `₱${remBal.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;

    const modal = document.getElementById('officialReceiptModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}
window.openOfficialReceiptModal = openOfficialReceiptModal;

function closeOfficialReceiptModal() {
    const modal = document.getElementById('officialReceiptModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}
window.closeOfficialReceiptModal = closeOfficialReceiptModal;

function printReceipt() {
    const receiptContent = document.getElementById('printableReceiptArea').innerHTML;
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Official Receipt - JJKings Academy</title>
            <script src="javascript/tailwind.js"></script>
            <style>
                body { font-family: sans-serif; padding: 20px; background: #fff; color: #000; }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body onload="window.print(); setTimeout(() => window.close(), 500);">
            <div style="max-width: 400px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; border-radius: 12px;">
                \${receiptContent}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}
window.printReceipt = printReceipt;

function safeCloseSwal() {
    try {
        if (typeof Swal !== 'undefined') {
            if (typeof Swal.close === 'function') Swal.close();
            else if (typeof Swal.closeModal === 'function') Swal.closeModal();
            else if (typeof Swal.clickConfirm === 'function' && Swal.isVisible && Swal.isVisible()) Swal.clickConfirm();
        }
        if (typeof swal !== 'undefined' && typeof swal.close === 'function') {
            swal.close();
        }
    } catch(e) {
        // Silently ignore
    }
}
window.safeCloseSwal = safeCloseSwal;
