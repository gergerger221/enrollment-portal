// Student Dashboard JavaScript

// Customize SweetAlert2 to match the landing page modal design
const baseSwal = window.Swal.mixin({
    customClass: {
        popup: 'rounded-xl shadow-2xl p-8 border border-gray-100 dark:border-slate-800 max-w-md w-full',
        title: 'text-2xl font-bold text-gray-800 dark:text-white',
        htmlContainer: 'text-gray-600 dark:text-gray-300 text-sm leading-relaxed mt-2',
        confirmButton: 'bg-[#007dfe] text-white px-6 py-2.5 rounded-lg hover:bg-[#004b87] transition font-medium focus:ring-2 focus:ring-blue-300 border-none outline-none mx-2 cursor-pointer',
        cancelButton: 'bg-gray-500 text-white px-6 py-2.5 rounded-lg hover:bg-gray-600 transition font-medium focus:ring-2 focus:ring-gray-300 border-none outline-none mx-2 cursor-pointer'
    },
    buttonsStyling: false
});

const Swal = {
    fire: function(options) {
        const isDark = document.documentElement.classList.contains('dark-mode');
        let swalOptions = typeof options === 'string' ? { title: options } : { ...options };
        
        if (isDark) {
            swalOptions.background = '#181832';
            swalOptions.color = '#ffffff';
        } else {
            swalOptions.background = '#ffffff';
            swalOptions.color = '#1f2937';
        }
        
        return baseSwal.fire(swalOptions);
    },
    showLoading: function() {
        return baseSwal.showLoading();
    }
};

// Check active student session on page load
async function checkStudentSession() {
    try {
        const response = await fetch('php/api.php?action=current_user');
        const result = await response.json();
        
        if (result.success && result.user) {
            // Update dashboard profile info
            updateStudentDashboard(result.user);
            
            // Set the semester select value based on student's active_semester
            const selector = document.getElementById('semesterSelector');
            if (selector && result.user.active_semester) {
                selector.value = result.user.active_semester;
            }
            
            // Load DB grades, schedules, and billing details
            loadGrades();
            loadSchedule();
            loadBillingDetails();
        } else {
            // No active session - redirect to home/login
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Session validation error:', error);
        window.location.href = 'index.html';
    }
}

// Student Logout Functions
function logoutStudent() {
    Swal.fire({
        title: 'Logout',
        text: 'Are you sure you want to logout?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, logout',
        cancelButtonText: 'No'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('php/api.php?action=logout')
                .then(() => {
                    window.location.href = 'index.html';
                })
                .catch(() => {
                    window.location.href = 'index.html';
                });
        }
    });
}

// Navigate to Home (refresh student dashboard)
function navigateToHome() {
    window.location.reload();
}

// Load grades data from DB API
async function loadGrades() {
    const gradesTableBody = document.getElementById('gradesTableBody');
    if (!gradesTableBody) return;
    
    try {
        const response = await fetch('php/api.php?action=getGrades');
        const result = await response.json();
        
        if (result.success && result.data) {
            if (result.data.length === 0) {
                gradesTableBody.innerHTML = '<tr class="border-b"><td colspan="7" class="px-4 py-3 text-center text-gray-500">No grades available yet</td></tr>';
            } else {
                gradesTableBody.innerHTML = result.data.map(grade => {
                    const finalGrade = parseFloat(grade.final) || 0;
                    const pass = finalGrade >= 75;
                    const colors = getSubjectColors(grade.subject);
                    
                    const getGradeClass = (val) => {
                        const num = parseFloat(val) || 0;
                        if (num >= 90) return 'text-emerald-600 dark:text-emerald-400 font-bold';
                        if (num >= 85) return 'text-blue-600 dark:text-blue-400 font-semibold';
                        if (num >= 75) return 'text-slate-700 dark:text-slate-300';
                        return 'text-red-500 font-bold';
                    };
                    
                    return `
                        <tr class="border-b border-slate-100 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors duration-200">
                            <td class="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <div class="w-1.5 h-6 rounded-full ${colors.bg.split(' ')[0]}"></div>
                                ${grade.subject}
                            </td>
                            <td class="px-4 py-3.5 text-center ${getGradeClass(grade.q1)}">${grade.q1}</td>
                            <td class="px-4 py-3.5 text-center ${getGradeClass(grade.q2)}">${grade.q2}</td>
                            <td class="px-4 py-3.5 text-center ${getGradeClass(grade.q3)}">${grade.q3}</td>
                            <td class="px-4 py-3.5 text-center ${getGradeClass(grade.q4)}">${grade.q4}</td>
                            <td class="px-4 py-3.5 text-center font-black ${pass ? 'text-blue-600 dark:text-blue-400 text-sm' : 'text-red-500 text-sm'}">${grade.final}</td>
                            <td class="px-4 py-3.5 text-center">
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm inline-flex items-center gap-1 ${
                                    pass 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/50' 
                                    : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800/50'
                                }">
                                    <span class="w-1.5 h-1.5 rounded-full ${pass ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}"></span>
                                    ${grade.remarks}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        } else {
            gradesTableBody.innerHTML = '<tr class="border-b"><td colspan="7" class="px-4 py-3 text-center text-red-500">Failed to load grades data</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching grades:', error);
        gradesTableBody.innerHTML = '<tr class="border-b"><td colspan="7" class="px-4 py-3 text-center text-red-500">Error loading grades</td></tr>';
    }
}

// Get color styling for class schedules based on subject category
function getSubjectColors(subject) {
    const sub = (subject || '').toLowerCase();
    const isDark = document.documentElement.classList.contains('dark-mode');
    
    if (isDark) {
        if (sub.includes('math') || sub.includes('algebra') || sub.includes('geometry') || sub.includes('calculus') || sub.includes('stat')) {
            return {
                bg: 'bg-blue-950/40 border-blue-800/80 hover:bg-blue-900/40 text-blue-200',
                text: 'text-blue-100 font-bold',
                icon: 'text-blue-400'
            };
        }
        if (sub.includes('science') || sub.includes('physics') || sub.includes('chemistry') || sub.includes('biology') || sub.includes('stem') || sub.includes('specialized')) {
            return {
                bg: 'bg-emerald-950/40 border-emerald-800/80 hover:bg-emerald-900/40 text-emerald-200',
                text: 'text-emerald-100 font-bold',
                icon: 'text-emerald-400'
            };
        }
        if (sub.includes('english') || sub.includes('literature') || sub.includes('reading') || sub.includes('oral') || sub.includes('communication')) {
            return {
                bg: 'bg-purple-950/40 border-purple-800/80 hover:bg-purple-900/40 text-purple-200',
                text: 'text-purple-100 font-bold',
                icon: 'text-purple-400'
            };
        }
        if (sub.includes('history') || sub.includes('social') || sub.includes('araling') || sub.includes('filipino') || sub.includes('philippine') || sub.includes('applied')) {
            return {
                bg: 'bg-amber-950/40 border-amber-800/80 hover:bg-amber-900/40 text-amber-200',
                text: 'text-amber-100 font-bold',
                icon: 'text-amber-400'
            };
        }
        return {
            bg: 'bg-slate-800/40 border-slate-700 text-slate-200 hover:bg-slate-700/40',
            text: 'text-slate-100 font-bold',
            icon: 'text-slate-400'
        };
    } else {
        if (sub.includes('math') || sub.includes('algebra') || sub.includes('geometry') || sub.includes('calculus') || sub.includes('stat')) {
            return {
                bg: 'bg-blue-50/60 border-blue-200/80 hover:bg-blue-50 text-blue-900',
                text: 'text-blue-950 font-bold',
                icon: 'text-blue-500'
            };
        }
        if (sub.includes('science') || sub.includes('physics') || sub.includes('chemistry') || sub.includes('biology') || sub.includes('stem') || sub.includes('specialized')) {
            return {
                bg: 'bg-emerald-50/60 border-emerald-200/80 hover:bg-emerald-50 text-emerald-900',
                text: 'text-emerald-950 font-bold',
                icon: 'text-emerald-500'
            };
        }
        if (sub.includes('english') || sub.includes('literature') || sub.includes('reading') || sub.includes('oral') || sub.includes('communication')) {
            return {
                bg: 'bg-purple-50/60 border-purple-200/80 hover:bg-purple-50 text-purple-900',
                text: 'text-purple-950 font-bold',
                icon: 'text-purple-500'
            };
        }
        if (sub.includes('history') || sub.includes('social') || sub.includes('araling') || sub.includes('filipino') || sub.includes('philippine') || sub.includes('applied')) {
            return {
                bg: 'bg-amber-50/60 border-amber-200/80 hover:bg-amber-50 text-amber-900',
                text: 'text-amber-950 font-bold',
                icon: 'text-amber-500'
            };
        }
        return {
            bg: 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-900',
            text: 'text-slate-950 font-bold',
            icon: 'text-slate-500'
        };
    }
}

// Load schedule data from DB API
// Toggle schedule view (card vs table)
function toggleScheduleView(viewType) {
    const cardContainer = document.getElementById('scheduleContainer');
    const tableContainer = document.getElementById('scheduleTableView');
    const btnCard = document.getElementById('btnCardView');
    const btnTable = document.getElementById('btnTableView');
    if (!cardContainer || !tableContainer || !btnCard || !btnTable) return;
    
    if (viewType === 'card') {
        cardContainer.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        
        btnCard.className = "px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm transition";
        btnTable.className = "px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition";
    } else {
        cardContainer.classList.add('hidden');
        tableContainer.classList.remove('hidden');
        
        btnTable.className = "px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm transition";
        btnCard.className = "px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition";
    }
}

// Load schedule data from DB API
async function loadSchedule() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    try {
        const response = await fetch('php/api.php?action=getSchedule');
        const result = await response.json();
        
        if (result.success && result.data) {
            days.forEach(day => {
                const daySchedule = document.getElementById(day + 'Schedule');
                if (!daySchedule) return;
                
                const classes = result.data[day] || [];
                
                if (classes.length > 0) {
                    daySchedule.innerHTML = classes.map(cls => {
                        const colors = getSubjectColors(cls.subject);
                        const isDark = document.documentElement.classList.contains('dark-mode');
                        return `
                            <div class="${colors.bg} border-l-4 rounded-xl p-3.5 text-xs shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] flex flex-col gap-2 cursor-pointer group">
                                <div class="font-extrabold ${colors.text.split(' ')[0]} leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">${cls.subject}</div>
                                <div class="space-y-1 mt-1 text-[10px] ${isDark ? 'text-slate-300' : 'text-slate-600'}">
                                    <div class="flex items-center gap-2">
                                        <i class="far fa-clock text-[9px] ${colors.icon}"></i>
                                        <span>${cls.time}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-door-open text-[9px] text-slate-400"></i>
                                        <span>Room ${cls.room_raw || cls.room.split(' ')[0]}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-user-tie text-[9px] text-slate-400"></i>
                                        <span>${cls.teacher || 'TBA'}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                } else {
                    daySchedule.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">No classes</p>';
                }
            });
            
            // Populate Table View
            const tableBody = document.getElementById('scheduleTableBody');
            if (tableBody) {
                let tableRows = [];
                days.forEach(day => {
                    const classes = result.data[day] || [];
                    classes.forEach(cls => {
                        const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1);
                        tableRows.push(`
                            <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td class="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">${dayCapitalized}</td>
                                <td class="px-4 py-3 text-slate-600 dark:text-slate-400">${cls.time}</td>
                                <td class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">${cls.subject}</td>
                                <td class="px-4 py-3 text-slate-600 dark:text-slate-400">Room ${cls.room_raw || cls.room.split(' ')[0]}</td>
                                <td class="px-4 py-3 text-slate-600 dark:text-slate-400">${cls.teacher || 'TBA'}</td>
                            </tr>
                        `);
                    });
                });
                
                if (tableRows.length > 0) {
                    tableBody.innerHTML = tableRows.join('');
                } else {
                    tableBody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400 dark:text-slate-500">No classes scheduled.</td></tr>';
                }
            }
            
            // Populate upcoming classes list and next class stats card
            populateUpcomingClasses(result.data);
        }
    } catch (error) {
        console.error('Error fetching schedule:', error);
    }
}

// Populate the upcoming classes panel and the Next Class stats card dynamically
function populateUpcomingClasses(scheduleData) {
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayIndex = new Date().getDay();
    let todayName = daysOfWeek[todayIndex];
    
    // If today is Sunday (0) or Saturday (6), or there are no classes today, default to Monday
    if (todayName === 'sunday' || todayName === 'saturday' || !scheduleData[todayName] || scheduleData[todayName].length === 0) {
        todayName = 'monday';
    }
    
    const classes = scheduleData[todayName] || [];
    const listContainer = document.getElementById('upcomingClassesList');
    if (!listContainer) return;
    
    if (classes.length === 0) {
        listContainer.innerHTML = '<p class="text-xs text-slate-400 py-6 text-center">No upcoming classes scheduled</p>';
        
        // Update next class card to "No classes"
        const nextSub = document.getElementById('nextClassSubject');
        const nextTime = document.getElementById('nextClassTimeRoom');
        if (nextSub) nextSub.textContent = 'Free Day';
        if (nextTime) nextTime.textContent = 'No classes today';
        return;
    }
    
    // Sort classes chronologically by start time (e.g. "07:00 AM")
    classes.sort((a, b) => {
        const timeA = parseInt(a.time) || 0;
        const timeB = parseInt(b.time) || 0;
        return timeA - timeB;
    });
    
    // Set Next Class Card (Card 4)
    const firstClass = classes[0];
    const nextSub = document.getElementById('nextClassSubject');
    const nextTime = document.getElementById('nextClassTimeRoom');
    if (nextSub) nextSub.textContent = firstClass.subject;
    if (nextTime) nextTime.textContent = `${firstClass.time} | Room ${firstClass.room}`;
    
    // Populate upcoming classes list
    listContainer.innerHTML = classes.map(cls => {
        const colors = getSubjectColors(cls.subject);
        return `
            <div class="flex items-center justify-between p-3 border border-slate-100 hover:bg-[#f8fafc] rounded-xl transition cursor-pointer group">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg ${colors.bg.split(' ')[0]} ${colors.icon} flex items-center justify-center text-xs">
                  <i class="fas fa-graduation-cap"></i>
                </div>
                <div>
                  <h5 class="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">${cls.subject}</h5>
                  <p class="text-[10px] text-slate-400 mt-0.5"><i class="far fa-clock mr-1"></i>${cls.time} &nbsp;&bull;&nbsp; <i class="fas fa-door-open mr-0.5"></i> Room ${cls.room}</p>
                </div>
              </div>
              <i class="fas fa-chevron-right text-[10px] text-slate-300 group-hover:text-blue-500 transition-colors"></i>
            </div>
        `;
    }).join('');
}

// Update student dashboard layout with profile
function updateStudentDashboard(data) {
    studentStatus = data.status;
    studentSection = data.section || 'N/A';
    updateEnrollmentProgressTracker(studentStatus, studentSection, currentRemainingBalance);

    // Welcoming header with student's actual database name
    const header = document.querySelector('main h2');
    if (header) {
        header.textContent = `Hello, ${data.name}!`;
    }
    
    const welcomeHeader = document.getElementById('welcomeHeader');
    if (welcomeHeader) {
        welcomeHeader.textContent = `Welcome back, ${data.name}!`;
    }
    
    // Correctly identify if the student is Senior High School or Junior High School
    const isSenior = data.level && data.level.toLowerCase().startsWith('senior');

    // Show/hide semester selector and divider based on academic level (JHS has no semesters)
    const semWrapper = document.getElementById('semesterSelectorWrapper');
    const semDivider = document.getElementById('semesterDivider');
    if (semWrapper) {
        semWrapper.style.display = isSenior ? 'flex' : 'none';
    }
    if (semDivider) {
        semDivider.style.display = isSenior ? 'block' : 'none';
    }

    // Show/hide voucher card container (JHS has no vouchers)
    const voucherCard = document.getElementById('voucherCardContainer');
    if (voucherCard) {
        voucherCard.style.display = isSenior ? 'flex' : 'none';
    }

    // Update navbar profile badge name & academic type text
    const navName = document.getElementById('studentNavName');
    if (navName) {
        navName.textContent = data.name || 'Student';
    }

    const navSub = document.getElementById('studentNavSub');
    if (navSub) {
        navSub.textContent = isSenior ? 'Senior High School' : 'Junior High School';
    }

    // Update academic level
    const dashboardLevel = document.getElementById('dashboardLevel');
    if (dashboardLevel) {
        if (!isSenior) {
            dashboardLevel.textContent = 'Junior High';
        } else if (data.level === 'senior-high-11') {
            dashboardLevel.textContent = 'Grade 11';
        } else if (data.level === 'senior-high-12') {
            dashboardLevel.textContent = 'Grade 12';
        } else {
            dashboardLevel.textContent = 'Senior High';
        }
    }

    const dashboardStrand = document.getElementById('dashboardStrand');
    if (dashboardStrand) {
        if (!isSenior) {
            // Extract the grade number from "grade-7", "grade-8" etc.
            let gradeNum = '7';
            if (data.level && data.level.startsWith('grade-')) {
                gradeNum = data.level.replace('grade-', '');
            }
            dashboardStrand.textContent = 'Grade ' + gradeNum;
        } else {
            dashboardStrand.textContent = data.strand ? data.strand.toUpperCase() + ' Strand' : 'N/A';
        }
    }
    
    // Update voucher status
    const dashboardVoucherStatus = document.getElementById('dashboardVoucherStatus');
    if (dashboardVoucherStatus) dashboardVoucherStatus.textContent = data.status === 'approved' ? 'Approved' : 'Pending';
    
    const dashboardVoucherType = document.getElementById('dashboardVoucherType');
    if (dashboardVoucherType) {
        if (data.voucher_eligibility === 'public-school') {
            dashboardVoucherType.textContent = 'Public Graduate';
        } else if (data.voucher_eligibility === 'private-school') {
            dashboardVoucherType.textContent = 'Private Graduate';
        } else if (data.voucher_eligibility === 'same-school') {
            dashboardVoucherType.textContent = 'AB Graduate';
        } else {
            dashboardVoucherType.textContent = 'None';
        }
    }
    
    // Update billing ledger dynamically
    const billingLedger = document.getElementById('dashboardBillingLedger');
    if (billingLedger) {
        const isSeniorHigh = data.level && data.level.toLowerCase().includes('senior');
        const voucherType = data.voucher_eligibility || '';
        
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
                voucherDeduction = tuition + registration + lab + library + idFee; // Full tuition + fees covered
            } else if (voucherType === 'private-school') {
                voucherDeduction = 17500; // Standard private voucher subsidy
            }
        }
        
        let totalToPay = subtotal - voucherDeduction;
        
        // Update statistics cards
        const dashboardPaymentStatus = document.getElementById('dashboardPaymentStatus');
        if (dashboardPaymentStatus) {
            dashboardPaymentStatus.textContent = '₱' + totalToPay.toLocaleString();
        }
        
        let html = `
            <div class="space-y-3">
                <div class="flex justify-between items-center py-2.5 px-3 border-b border-slate-100 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition rounded-lg">
                    <span class="text-xs text-slate-500 font-medium">Tuition Fee</span>
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">₱${tuition.toLocaleString()}</span>
                </div>
                <div class="flex justify-between items-center py-2.5 px-3 border-b border-slate-100 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition rounded-lg">
                    <span class="text-xs text-slate-500 font-medium">Registration Fee</span>
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">₱${registration.toLocaleString()}</span>
                </div>
                <div class="flex justify-between items-center py-2.5 px-3 border-b border-slate-100 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition rounded-lg">
                    <span class="text-xs text-slate-500 font-medium">Laboratory Fee</span>
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">₱${lab.toLocaleString()}</span>
                </div>
                <div class="flex justify-between items-center py-2.5 px-3 border-b border-slate-100 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition rounded-lg">
                    <span class="text-xs text-slate-500 font-medium">Library Fee</span>
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">₱${library.toLocaleString()}</span>
                </div>
                <div class="flex justify-between items-center py-2.5 px-3 border-b border-slate-100 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition rounded-lg">
                    <span class="text-xs text-slate-500 font-medium">Student ID Fee</span>
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">₱${idFee.toLocaleString()}</span>
                </div>
        `;
        
        if (isSeniorHigh && uniform > 0) {
            html += `
                <div class="flex justify-between items-center py-2.5 px-3 border-b border-slate-100 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition rounded-lg">
                    <span class="text-xs text-slate-500 font-medium">Uniform Fee</span>
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">₱${uniform.toLocaleString()}</span>
                </div>
            `;
        }
        
        if (voucherDeduction > 0) {
            html += `
                <div class="flex justify-between items-center py-2.5 px-3 border border-emerald-100 rounded-lg text-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-800/40">
                    <span class="text-xs font-semibold flex items-center gap-1.5"><i class="fas fa-gift text-[10px]"></i> Voucher Subsidy</span>
                    <span class="text-xs font-extrabold">-₱${voucherDeduction.toLocaleString()}</span>
                </div>
            `;
        }
        
        html += `
                <div class="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/10 flex justify-between items-center">
                    <div>
                        <span class="text-[9px] uppercase tracking-wider font-bold text-blue-100 block">Total Due Balance</span>
                        <span class="text-xs font-bold leading-none">Total to Pay</span>
                    </div>
                    <span class="text-lg font-black">₱${totalToPay.toLocaleString()}</span>
                </div>
            </div>
        `;
        
        billingLedger.innerHTML = html;
    }
    
    const dashboardVoucherEligibility = document.getElementById('dashboardVoucherEligibility');
    if (dashboardVoucherEligibility) {
        if (data.voucher_eligibility === 'public-school') {
            dashboardVoucherEligibility.textContent = 'From Public School (Voucher Eligible)';
        } else if (data.voucher_eligibility === 'private-school') {
            dashboardVoucherEligibility.textContent = 'From Private School (No Voucher)';
        } else if (data.voucher_eligibility === 'same-school') {
            dashboardVoucherEligibility.textContent = 'AB Graduate (Apply for Voucher)';
        } else {
            dashboardVoucherEligibility.textContent = 'Not Eligible (Junior High)';
        }
    }
    
    const dashboardVoucherVerification = document.getElementById('dashboardVoucherVerification');
    if (dashboardVoucherVerification) {
        if (data.level === 'junior-high') {
            dashboardVoucherVerification.textContent = 'Not Applicable';
        } else {
            dashboardVoucherVerification.textContent = data.status === 'approved' ? 'Verified' : 'Under Verification';
        }
    }
    
    // Update progress workflows
    updateStatusWorkflow(data.status);
}

// Update status workflow progress steps
function updateStatusWorkflow(status) {
    const step1 = document.querySelector('.flex.justify-between.mt-4 .text-center:nth-child(1) div');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');
    const statusText = document.getElementById('currentStatusText');
    const statusPercent = document.getElementById('statusPercent');
    const statusBar = document.getElementById('statusBar');
    
    if (status === 'pending' || status === 'submitted') {
        if (step1) step1.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step2) step2.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step3) step3.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step4) step4.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (statusText) statusText.textContent = 'Current Status: Submitted';
        if (statusPercent) statusPercent.textContent = '25%';
        if (statusBar) statusBar.style.width = '25%';
    } else if (status === 'under-review') {
        if (step1) step1.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step2) step2.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step3) step3.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step4) step4.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (statusText) statusText.textContent = 'Current Status: Under Review';
        if (statusPercent) statusPercent.textContent = '50%';
        if (statusBar) statusBar.style.width = '50%';
    } else if (status === 'approved') {
        if (step1) step1.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step2) step2.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step3) step3.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step4) step4.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (statusText) statusText.textContent = 'Current Status: Approved / Enrolled';
        if (statusPercent) statusPercent.textContent = '100%';
        if (statusBar) statusBar.style.width = '100%';
    } else if (status === 'rejected') {
        if (step1) step1.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step2) step2.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step3) step3.className = 'w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step4) step4.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (statusText) statusText.textContent = 'Current Status: Rejected';
        if (statusPercent) statusPercent.textContent = '75%';
        if (statusBar) statusBar.style.width = '75%';
    }
}

// Check active student session on page load
document.addEventListener('DOMContentLoaded', function() {
    const isDark = localStorage.getItem('darkMode') === 'enabled';
    applyDarkMode(isDark);
    populateNotifications();
    checkStudentSession();
});

// Change Password Modal functions
function showChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    const content = document.getElementById('changePasswordModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
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
    const icon = document.getElementById(iconId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

async function submitChangePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('changeCurrentPassword').value;
    const newPassword = document.getElementById('changeNewPassword').value;
    const confirmPassword = document.getElementById('changeConfirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'New passwords do not match',
            confirmButtonColor: '#007dfe'
        });
        return;
    }
    
    if (newPassword.length < 6) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'New password must be at least 6 characters',
            confirmButtonColor: '#007dfe'
        });
        return;
    }
    
    Swal.fire({
        title: 'Updating...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        const response = await fetch('php/api.php?action=change_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Password updated successfully!',
                confirmButtonColor: '#007dfe'
            });
            hideChangePasswordModal();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Failed to update password',
                confirmButtonColor: '#007dfe'
            });
        }
    } catch (error) {
        console.error('Error changing password:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred. Please try again.',
            confirmButtonColor: '#007dfe'
        });
    }
}

// Dark Mode Toggling Functions
function toggleDarkMode() {
    const isDark = !document.documentElement.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    applyDarkMode(isDark);
    
    // Re-render schedule to update dynamic timetable colors
    loadSchedule();
}

function applyDarkMode(isDark) {
    const icon = document.getElementById('darkModeIcon');
    if (isDark) {
        document.documentElement.classList.add('dark-mode');
        document.documentElement.classList.add('dark');
        if (document.body) {
            document.body.style.backgroundColor = '#1a1a2e';
            document.body.style.color = '#ffffff';
            document.body.classList.remove('bg-[#f5f8fb]');
            document.body.classList.add('bg-[#1a1a2e]');
        }
        if (icon) {
            icon.className = 'fas fa-sun text-lg text-yellow-400';
        }
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.documentElement.classList.remove('dark');
        if (document.body) {
            document.body.style.backgroundColor = '#f5f8fb';
            document.body.style.color = '#2c3e50';
            document.body.classList.remove('bg-[#1a1a2e]');
            document.body.classList.add('bg-[#f5f8fb]');
        }
        if (icon) {
            icon.className = 'far fa-moon text-lg text-slate-400';
        }
    }
}

// Toggle Sidebar Collapse
function toggleSidebar() {
    const sidebar = document.getElementById('sidebarAside');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// ─── Academic Calendar Logic ─────────────────────────────────
const schoolEvents = [
    {
        id: 1,
        title: 'Enrollment Period Opens',
        date: '2026-07-01',
        category: 'admissions',
        color: '#007dfe',
        bgClass: 'bg-[#007dfe]/10 border-l-4 border-[#007dfe]',
        textClass: 'text-[#007dfe]',
        badgeClass: 'bg-[#007dfe] text-white',
        desc: 'Start of enrollment for School Year 2026-2027. Early enrollees get 10% discount on tuition fees.'
    },
    {
        id: 2,
        title: 'Sports Tryouts',
        date: '2026-07-20',
        category: 'extracurricular',
        color: '#ef4444',
        bgClass: 'bg-[#ef4444]/10 border-l-4 border-[#ef4444]',
        textClass: 'text-[#ef4444]',
        badgeClass: 'bg-red-500 text-white',
        desc: 'Basketball and Volleyball tryouts at Academy Gymnasium. Open to all enrolled students.'
    },
    {
        id: 3,
        title: 'Enrollment Deadline',
        date: '2026-07-31',
        category: 'admissions',
        color: '#fbc707',
        bgClass: 'bg-[#fbc707]/10 border-l-4 border-[#fbc707]',
        textClass: 'text-[#fbc707]',
        badgeClass: 'bg-[#fbc707] text-[#004b87]',
        desc: 'Last day to submit enrollment applications. Late applications may not be accepted.'
    },
    {
        id: 4,
        title: 'First Day of Classes',
        date: '2026-08-15',
        category: 'academic',
        color: '#22c55e',
        bgClass: 'bg-[#22c55e]/10 border-l-4 border-[#22c55e]',
        textClass: 'text-[#22c55e]',
        badgeClass: 'bg-green-500 text-white',
        desc: 'Classes begin for School Year 2026-2027. New student orientation on August 12-14.'
    },
    {
        id: 5,
        title: 'First Quarter Exams',
        date: '2026-10-30',
        category: 'exams',
        color: '#a855f7',
        bgClass: 'bg-[#a855f7]/10 border-l-4 border-[#a855f7]',
        textClass: 'text-[#a855f7]',
        badgeClass: 'bg-purple-500 text-white',
        desc: 'First periodic examinations for all grade levels. Review schedules will be posted in classrooms.'
    },
    {
        id: 6,
        title: 'Christmas Break',
        date: '2026-12-20',
        category: 'holiday',
        color: '#f97316',
        bgClass: 'bg-[#f97316]/10 border-l-4 border-[#f97316]',
        textClass: 'text-[#f97316]',
        badgeClass: 'bg-orange-500 text-white',
        desc: 'Christmas vacation starts. Classes resume on January 4, 2027.'
    }
];

let currentCalendarDate = new Date(2026, 6, 1); // July 2026

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const headerTitle = document.getElementById('calendarMonthYear');
    if (headerTitle) {
        headerTitle.textContent = `${monthNames[month]} ${year}`;
    }

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();

    const calendarDaysContainer = document.getElementById('calendarDays');
    if (!calendarDaysContainer) return;
    calendarDaysContainer.innerHTML = '';

    // Render empty spaces for previous month's ending days
    for (let x = firstDayIndex; x > 0; x--) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'py-3 text-slate-400 opacity-40 select-none text-center';
        dayDiv.textContent = prevLastDay - x + 1;
        calendarDaysContainer.appendChild(dayDiv);
    }

    // Render current month's days
    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'py-3 rounded-xl text-center font-bold relative cursor-pointer transition hover:bg-blue-100/60 hover:text-blue-700 text-slate-700';
        dayDiv.textContent = i;
        
        const formattedMonth = String(month + 1).padStart(2, '0');
        const formattedDay = String(i).padStart(2, '0');
        const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

        const dayEvents = schoolEvents.filter(e => e.date === dateStr);

        if (dayEvents.length > 0) {
            const event = dayEvents[0];
            dayDiv.style.backgroundColor = event.color + '20'; // Light transparent bg
            dayDiv.style.color = event.color;
            dayDiv.className = 'py-3 rounded-xl text-center font-black relative cursor-pointer border border-current shadow-sm';
            
            const dot = document.createElement('span');
            dot.style.backgroundColor = event.color;
            dot.className = 'absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full';
            dayDiv.appendChild(dot);

            dayDiv.onclick = () => showCalendarEventDetail(event);
            dayDiv.title = event.title;
        }

        calendarDaysContainer.appendChild(dayDiv);
    }

    // Render next month's starting days to fill grid
    const totalRenderedCells = firstDayIndex + lastDay;
    const remainingCells = 42 - totalRenderedCells;

    for (let j = 1; j <= (remainingCells > 7 ? remainingCells % 7 : remainingCells); j++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'py-3 text-slate-400 opacity-40 select-none text-center';
        dayDiv.textContent = j;
        calendarDaysContainer.appendChild(dayDiv);
    }

    renderMonthEventsList(year, month);
}

function prevCalendarMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
}

function nextCalendarMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
}

function renderMonthEventsList(year, month) {
    const eventsListContainer = document.getElementById('calendarEventsList');
    if (!eventsListContainer) return;
    eventsListContainer.innerHTML = '';

    const formattedMonth = String(month + 1).padStart(2, '0');
    const monthPrefix = `${year}-${formattedMonth}`;
    
    const monthEvents = schoolEvents.filter(e => e.date.startsWith(monthPrefix));

    if (monthEvents.length === 0) {
        eventsListContainer.innerHTML = `
            <div class="text-center py-8 text-slate-400">
                <i class="fas fa-calendar-times text-2xl mb-2 text-slate-300"></i>
                <p class="text-xs">No scheduled events for this month</p>
            </div>
        `;
        return;
    }

    monthEvents.forEach(event => {
        const eventDate = new Date(event.date);
        const dayNum = String(eventDate.getDate()).padStart(2, '0');
        const monthShort = eventDate.toLocaleString('default', { month: 'short' });

        const eventCard = document.createElement('div');
        eventCard.className = `rounded-xl p-3.5 border hover:shadow-md transition cursor-pointer flex items-start space-x-3 ${event.bgClass}`;
        eventCard.onclick = () => showCalendarEventDetail(event);
        
        eventCard.innerHTML = `
            <div class="${event.badgeClass} px-3 py-2 rounded-lg text-center min-w-[55px] font-bold shadow-sm shrink-0">
                <div class="text-base">${dayNum}</div>
                <div class="text-[9px] uppercase tracking-wider">${monthShort}</div>
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-700 text-xs truncate mb-0.5">${event.title}</h4>
                <p class="text-slate-500 text-[10px] line-clamp-2 leading-relaxed">${event.desc}</p>
            </div>
        `;
        eventsListContainer.appendChild(eventCard);
    });
}

function showCalendarEventDetail(event) {
    Swal.fire({
        title: event.title,
        html: `
            <div class="text-left mt-2 space-y-3 font-sans text-xs text-slate-600 dark:text-slate-300">
                <p><strong class="text-slate-800 dark:text-white">Date:</strong> ${new Date(event.date).toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong class="text-slate-800 dark:text-white">Category:</strong> <span class="capitalize px-2.5 py-0.5 rounded text-[10px] font-bold" style="background-color: ${event.color}20; color: ${event.color}">${event.category}</span></p>
                <p class="leading-relaxed mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">${event.desc}</p>
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'Close',
        confirmButtonColor: '#007dfe'
    });
}

// Expose handlers globally
window.prevCalendarMonth = prevCalendarMonth;
window.nextCalendarMonth = nextCalendarMonth;
window.renderCalendar = renderCalendar;

// ─── Student Portal Notifications Logic ───────────────────────
const sampleNotifications = [
    {
        id: 1,
        icon: 'fas fa-chart-line text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20',
        title: 'Grades Updated',
        text: 'Your final grades for 1st Quarter are now available.',
        time: '2 hours ago'
    },
    {
        id: 2,
        icon: 'fas fa-tasks text-blue-500 bg-blue-50 dark:bg-blue-950/20',
        title: 'Enrollment Complete',
        text: 'Your enrollment files have been verified and approved.',
        time: '1 day ago'
    },
    {
        id: 3,
        icon: 'fas fa-bullhorn text-purple-500 bg-purple-50 dark:bg-purple-950/20',
        title: 'New Announcement',
        text: 'Welcome message and campus policies posted to portal.',
        time: '3 days ago'
    }
];

function toggleNotificationsDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

function populateNotifications() {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    
    if (sampleNotifications.length === 0) {
        list.innerHTML = `
            <div class="px-4 py-6 text-center text-slate-400">
                <i class="fas fa-bell-slash text-xl mb-1"></i>
                <p class="text-[10px]">No new notifications</p>
            </div>
        `;
        const badge = document.getElementById('notifBadge');
        if (badge) badge.classList.add('hidden');
        return;
    }
    
    list.innerHTML = sampleNotifications.map(n => `
        <div class="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition cursor-pointer flex gap-3 items-start">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] ${n.icon}">
                <i class="${n.icon.split(' ')[0]}"></i>
            </div>
            <div class="flex-1 min-w-0">
                <h5 class="text-[11px] font-bold text-slate-800 dark:text-white leading-tight mb-0.5">${n.title}</h5>
                <p class="text-[10px] text-slate-500 dark:text-slate-300 leading-normal line-clamp-2">${n.text}</p>
                <span class="text-[8px] text-slate-400 block mt-1"><i class="far fa-clock mr-0.5"></i> ${n.time}</span>
            </div>
        </div>
    `).join('');
}

function clearNotifications() {
    sampleNotifications.length = 0;
    populateNotifications();
}

// Close dropdown on click outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('notificationsDropdown');
    const bellBtn = document.querySelector('button[onclick*="toggleNotificationsDropdown"]');
    if (dropdown && !dropdown.classList.contains('hidden') && !dropdown.contains(event.target) && !bellBtn.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

// Change active semester
async function changeSemester(semester) {
    try {
        const response = await fetch('php/api.php?action=updateActiveSemester', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ semester: parseInt(semester) })
        });
        const result = await response.json();
        if (result.success) {
            // Reload schedule and grades
            await Promise.all([loadSchedule(), loadGrades()]);
        } else {
            console.error('Failed to update active semester:', result.message);
        }
    } catch (error) {
        console.error('Error changing active semester:', error);
    }
}

let currentRemainingBalance = 0;
let studentStatus = 'pending';
let studentSection = 'N/A';

// Dynamic Enrollment Progress Tracker Updater
function updateEnrollmentProgressTracker(userStatus, userSection, remainingBalance) {
    const progressBar = document.getElementById('enrollmentProgressBar');
    if (!progressBar) return;
    
    // Step status variables
    const step2Completed = userStatus === 'approved';
    const step3Completed = step2Completed && userSection && userSection !== 'N/A' && userSection !== '';
    const step4Completed = step3Completed && remainingBalance <= 0;
    
    // Calculate progress percentage
    let percentage = 0;
    if (step4Completed) percentage = 100;
    else if (step3Completed) percentage = 66;
    else if (step2Completed) percentage = 33;
    
    progressBar.style.width = percentage + '%';
    
    // Update Step 2 (Verification)
    const circle2 = document.getElementById('epCircle-2');
    const label2 = document.getElementById('epLabel-2');
    if (circle2 && label2) {
        if (step2Completed) {
            circle2.className = 'w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm border-4 border-green-100 dark:border-green-950 transition-all';
            circle2.innerHTML = '<i class="fas fa-check"></i>';
            label2.className = 'text-[10px] font-bold mt-2 text-green-500';
            label2.textContent = 'Verified';
        } else {
            circle2.className = 'w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm border-4 border-white dark:border-slate-800 transition-all';
            circle2.innerHTML = '2';
            label2.className = 'text-[10px] font-bold mt-2 text-slate-400';
            label2.textContent = 'Verified';
        }
    }
    
    // Update Step 3 (Section Assignment)
    const circle3 = document.getElementById('epCircle-3');
    const label3 = document.getElementById('epLabel-3');
    if (circle3 && label3) {
        if (step3Completed) {
            circle3.className = 'w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm border-4 border-green-100 dark:border-green-950 transition-all';
            circle3.innerHTML = '<i class="fas fa-check"></i>';
            label3.className = 'text-[10px] font-bold mt-2 text-green-500';
        } else {
            circle3.className = 'w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm border-4 border-white dark:border-slate-800 transition-all';
            circle3.innerHTML = '3';
            label3.className = 'text-[10px] font-bold mt-2 text-slate-400';
        }
    }
    
    // Update Step 4 (Fully Paid)
    const circle4 = document.getElementById('epCircle-4');
    const label4 = document.getElementById('epLabel-4');
    if (circle4 && label4) {
        if (step4Completed) {
            circle4.className = 'w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm border-4 border-green-100 dark:border-green-950 transition-all';
            circle4.innerHTML = '<i class="fas fa-check"></i>';
            label4.className = 'text-[10px] font-bold mt-2 text-green-500';
        } else {
            circle4.className = 'w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm border-4 border-white dark:border-slate-800 transition-all';
            circle4.innerHTML = '4';
            label4.className = 'text-[10px] font-bold mt-2 text-slate-400';
        }
    }
}

async function loadBillingDetails() {
    try {
        const response = await fetch('php/api.php?action=getBilling');
        const billing = await response.json();
        
        if (!billing.success) {
            console.error('Failed to load billing:', billing.message);
            return;
        }
        
        currentRemainingBalance = parseFloat(billing.remaining_balance);
        updateEnrollmentProgressTracker(studentStatus, studentSection, currentRemainingBalance);
        
        // Update stats cards
        const dashboardPaymentStatus = document.getElementById('dashboardPaymentStatus');
        if (dashboardPaymentStatus) {
            dashboardPaymentStatus.textContent = currentRemainingBalance > 0 
                ? '₱' + currentRemainingBalance.toLocaleString() 
                : 'Paid In Full';
        }
        
        const billingLedger = document.getElementById('dashboardBillingLedger');
        if (billingLedger) {
            let html = `
                <div class="space-y-3">
                    <div class="flex justify-between items-center py-2 px-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition rounded-lg">
                        <span class="text-xs text-slate-500 font-medium">Tuition Fee</span>
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">₱${parseFloat(billing.tuition).toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between items-center py-2 px-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition rounded-lg">
                        <span class="text-xs text-slate-500 font-medium">Registration Fee</span>
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">₱${parseFloat(billing.registration).toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between items-center py-2 px-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition rounded-lg">
                        <span class="text-xs text-slate-500 font-medium">Laboratory Fee</span>
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">₱${parseFloat(billing.lab).toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between items-center py-2 px-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition rounded-lg">
                        <span class="text-xs text-slate-500 font-medium">Library Fee</span>
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">₱${parseFloat(billing.library).toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between items-center py-2 px-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition rounded-lg">
                        <span class="text-xs text-slate-500 font-medium">Student ID Fee</span>
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">₱${parseFloat(billing.id_fee).toLocaleString()}</span>
                    </div>
            `;
            
            if (parseFloat(billing.uniform) > 0) {
                html += `
                    <div class="flex justify-between items-center py-2 px-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition rounded-lg">
                        <span class="text-xs text-slate-500 font-medium">Uniform Fee</span>
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">₱${parseFloat(billing.uniform).toLocaleString()}</span>
                    </div>
                `;
            }
            
            if (parseFloat(billing.voucher_deduction) > 0) {
                html += `
                    <div class="flex justify-between items-center py-2 px-3 border border-emerald-100 rounded-lg text-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-800/40">
                        <span class="text-xs font-semibold flex items-center gap-1.5"><i class="fas fa-gift text-[10px]"></i> Voucher Subsidy</span>
                        <span class="text-xs font-extrabold">-₱${parseFloat(billing.voucher_deduction).toLocaleString()}</span>
                    </div>
                `;
            }
            
            if (parseFloat(billing.total_paid) > 0) {
                html += `
                    <div class="flex justify-between items-center py-2 px-3 border border-blue-100 rounded-lg text-blue-600 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-800/40">
                        <span class="text-xs font-semibold flex items-center gap-1.5"><i class="fas fa-check-circle text-[10px]"></i> Total Paid</span>
                        <span class="text-xs font-extrabold">-₱${parseFloat(billing.total_paid).toLocaleString()}</span>
                    </div>
                `;
            }
            
            html += `
                    <div class="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/10 flex justify-between items-center">
                        <div>
                            <span class="text-[9px] uppercase tracking-wider font-bold text-blue-100 block">Remaining Due Balance</span>
                            <span class="text-xs font-bold leading-none">Remaining Balance</span>
                        </div>
                        <span class="text-lg font-black">₱${parseFloat(billing.remaining_balance).toLocaleString()}</span>
                    </div>
                </div>
            `;
            
            billingLedger.innerHTML = html;
        }
        
        // Update Pay Online button
        const payBtn = document.getElementById('payOnlineBtn');
        if (payBtn) {
            if (currentRemainingBalance <= 0) {
                payBtn.disabled = true;
                payBtn.className = 'w-full mt-4 bg-slate-200 text-slate-400 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-not-allowed border border-transparent';
                payBtn.innerHTML = '<i class="fas fa-check-circle text-emerald-500"></i> Paid In Full';
            } else {
                payBtn.disabled = false;
                payBtn.className = 'w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20';
                payBtn.innerHTML = '<i class="fas fa-credit-card"></i> Pay Tuition Online (Simulation)';
            }
        }
        
        // Update Payment History
        const historyBody = document.getElementById('paymentHistoryBody');
        if (historyBody) {
            if (!billing.payments || billing.payments.length === 0) {
                historyBody.innerHTML = `
                    <tr class="border-b border-slate-100 dark:border-slate-800">
                        <td class="px-4 py-3 text-center text-slate-400" colspan="5">No payment transactions recorded yet.</td>
                    </tr>
                `;
            } else {
                historyBody.innerHTML = billing.payments.map(p => `
                    <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td class="px-4 py-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">${p.reference_no}</td>
                        <td class="px-4 py-3 text-slate-500">${new Date(p.created_at).toLocaleString()}</td>
                        <td class="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">${p.card_number_masked}</td>
                        <td class="px-4 py-3 text-slate-600 dark:text-slate-400">${p.cardholder_name}</td>
                        <td class="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100">₱${parseFloat(p.amount).toLocaleString()}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading billing details:', error);
    }
}

function openPaymentModal() {
    const modal = document.getElementById('paymentModal');
    const content = document.getElementById('paymentModalContent');
    const balanceDisplay = document.getElementById('paymentModalBalance');
    const payAmountInput = document.getElementById('payAmount');
    
    if (balanceDisplay) {
        balanceDisplay.textContent = '₱' + currentRemainingBalance.toLocaleString();
    }
    if (payAmountInput) {
        payAmountInput.value = currentRemainingBalance;
        payAmountInput.max = currentRemainingBalance;
        payAmountInput.min = Math.min(2000, currentRemainingBalance);
    }
    
    if (modal && content) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        // Trigger reflow for animations
        void modal.offsetWidth;
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    const content = document.getElementById('paymentModalContent');
    
    if (modal && content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
            document.getElementById('paymentForm').reset();
        }, 300);
    }
}

async function submitPayment(event) {
    event.preventDefault();
    
    const amount = parseFloat(document.getElementById('payAmount').value);
    const cardholder = document.getElementById('payCardholder').value;
    const cardNo = document.getElementById('payCardNo').value.replace(/\s+/g, '');
    const expiry = document.getElementById('payExpiry').value;
    const cvv = document.getElementById('payCVV').value;
    
    const minPayment = Math.min(2000, currentRemainingBalance);
    if (isNaN(amount) || amount < minPayment || amount > currentRemainingBalance) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Payment Amount',
            text: `The minimum payment amount is ₱${minPayment.toLocaleString()} (and cannot exceed your remaining balance of ₱${currentRemainingBalance.toLocaleString()}).`
        });
        return;
    }
    
    // Mask / validate card number
    if (cardNo.length < 13 || isNaN(cardNo)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Card',
            text: 'Please enter a valid credit card number.'
        });
        return;
    }
    
    Swal.fire({
        title: 'Processing Payment...',
        html: 'Simulating transaction secure check...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        const response = await fetch('php/api.php?action=simulatePayment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amount,
                cardholder_name: cardholder,
                card_number: cardNo
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Payment Successful',
                html: `
                    <div class="text-left bg-slate-50 rounded-xl p-4 mt-2 space-y-2 text-sm border border-slate-200">
                        <div class="flex justify-between">
                            <span class="text-slate-500">Ref Number:</span>
                            <span class="font-mono font-bold text-slate-800">${result.reference_no}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-500">Amount Simulated:</span>
                            <span class="font-bold text-slate-800">₱${amount.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-500">Status:</span>
                            <span class="text-emerald-600 font-bold">Simulated Success</span>
                        </div>
                    </div>
                `,
                confirmButtonText: 'Done'
            });
            closePaymentModal();
            await loadBillingDetails();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Transaction Declined',
                text: result.message || 'Payment simulation failed.'
            });
        }
    } catch (error) {
        console.error('Error simulating payment:', error);
        Swal.fire({
            icon: 'error',
            title: 'Declined',
            text: 'Declined by simulation gateway. Please verify card details.'
        });
    }
}

function setupPaymentInputConstraints() {
    const cardInput = document.getElementById('payCardNo');
    if (cardInput) {
        cardInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
            if (value.length > 16) {
                value = value.substring(0, 16);
            }
            const matches = value.match(/.{1,4}/g);
            e.target.value = matches ? matches.join(' ') : value;
        });
    }

    const expiryInput = document.getElementById('payExpiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
            if (value.length > 4) {
                value = value.substring(0, 4);
            }
            if (value.length > 2) {
                e.target.value = value.substring(0, 2) + '/' + value.substring(2);
            } else {
                e.target.value = value;
            }
        });
    }

    const cvvInput = document.getElementById('payCVV');
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
            if (value.length > 3) {
                value = value.substring(0, 3);
            }
            e.target.value = value;
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPaymentInputConstraints);
} else {
    setupPaymentInputConstraints();
}

// Expose notification and semester functions globally
window.toggleNotificationsDropdown = toggleNotificationsDropdown;
window.clearNotifications = clearNotifications;
window.populateNotifications = populateNotifications;
window.changeSemester = changeSemester;
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.submitPayment = submitPayment;
window.loadBillingDetails = loadBillingDetails;
