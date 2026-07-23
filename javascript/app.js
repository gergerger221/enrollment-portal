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
    }
};

// App State
let currentUser = null;
let students = [];
let allStudents = [];
let approvedStudents = [];
let pendingStudents = [];
let enrollments = [];
let slides = [];
let dots = [];
let progressBar = null;
let sliderInterval = null;
let courses = [
    { id: 1, code: 'CS101', name: 'Introduction to Computer Science', description: 'Learn the basics of programming and computer science concepts' },
    { id: 2, code: 'MATH201', name: 'Calculus I', description: 'Differential and integral calculus fundamentals' },
    { id: 3, code: 'ENG102', name: 'English Composition', description: 'Academic writing and critical thinking skills' },
    { id: 4, code: 'PHY101', name: 'Physics Fundamentals', description: 'Introduction to mechanics and thermodynamics' },
    { id: 5, code: 'BIO201', name: 'Biology I', description: 'Cell biology and genetics' }
];

const isRegisterPage = window.location.pathname.endsWith('register.html');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize dark mode
    const isDark = localStorage.getItem('darkMode') === 'enabled';
    applyDarkMode(isDark);

    // Check if we are on the standalone register page
    if (isRegisterPage) {
        // Restore saved language
        const savedLang = localStorage.getItem('selectedLanguage') || 'en';
        changeLanguage(savedLang);
        
        const registerModalForm = document.getElementById('registerModalForm');
        if (registerModalForm) {
            registerModalForm.addEventListener('submit', handleModalRegistration);
            loadFormData();
            restoreStep();
        }
        return;
    }

    initializeSlider();
    
    // Restore saved language
    const savedLang = localStorage.getItem('selectedLanguage') || 'en';
    changeLanguage(savedLang);
    
    await checkCurrentUser();
    if (!currentUser) showWelcome();
    renderCourses();
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) registrationForm.addEventListener('submit', handleRegistration);
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    const registerModalForm = document.getElementById('registerModalForm');
    if (registerModalForm) registerModalForm.addEventListener('submit', handleModalRegistration);
    // Admin functions - only load when admin logs in
    // await fetchApprovedStudents();
    // await fetchPendingStudents();
    // loadStudentSelect();
    startAutoSlider();
    
    // Check URL parameters for initial states
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'true') {
        showLoginModal();
    } else if (urlParams.get('faq') === 'true') {
        showFAQModal();
    } else {
        const tabParam = urlParams.get('tab');
        if (tabParam) {
            switchTab(tabParam);
        }
    }

    setTimeout(() => {
        const enrollButton = document.getElementById('enrollNowButton');
        if (enrollButton) {
            enrollButton.addEventListener('click', function(e) {
                e.preventDefault();
                showRegisterModal();
                return false;
            });
        }
    }, 1000);
});

// Show Welcome Page
function showWelcome() {
    const welcomeNav = document.getElementById('welcomeNav');
    if (welcomeNav) welcomeNav.classList.remove('hidden');
    
    const mainNav = document.getElementById('mainNav');
    if (mainNav) mainNav.classList.add('hidden');
    
    const tabNavigation = document.getElementById('tabNavigation');
    if (tabNavigation) tabNavigation.classList.remove('hidden');
    
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    const welcome = document.getElementById('welcome');
    if (welcome) welcome.classList.remove('hidden');
    
    // Ensure landing extras (news, footer) are visible
    const newsSection = document.getElementById('news');
    if (newsSection) newsSection.classList.remove('hidden');
    const siteFooter = document.querySelector('footer');
    if (siteFooter) siteFooter.classList.remove('hidden');

    showSection('home');
    stopAutoSlider();
    startAutoSlider();
}

function showAuthenticatedView(user) {
    if (!user) {
        showLoginModal();
        return;
    }

    currentUser = user;
    
    // Redirect to separate dashboard files
    if (user.role === 'admin') {
        window.location.href = 'admin-dashboard.html';
    } else {
        window.location.href = 'student-dashboard.html';
    }
}

function showLogoutConfirmation() {
    const modal = document.getElementById('logoutConfirmationModal');
    const content = document.getElementById('logoutConfirmationContent');
    if (!modal || !content) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideLogoutConfirmation() {
    const modal = document.getElementById('logoutConfirmationModal');
    const content = document.getElementById('logoutConfirmationContent');
    if (!modal || !content) return;
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function confirmLogout() {
    hideLogoutConfirmation();
    if (currentUser && currentUser.role === 'admin') {
        logoutAdmin();
    } else {
        logoutUser();
    }
}

function logoutUser() {
    currentUser = null;
    
    // Show login/enroll/FAQ buttons, hide logout button
    const loginBtn = document.getElementById('navLoginBtn');
    const enrollBtn = document.getElementById('navEnrollBtn');
    const faqBtn = document.querySelector('button[onclick="showFAQModal()"]');
    const logoutBtn = document.getElementById('navLogoutBtn');
    
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (enrollBtn) enrollBtn.classList.remove('hidden');
    if (faqBtn) faqBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    
    const welcomeNav = document.getElementById('welcomeNav');
    const mainNav = document.getElementById('mainNav');
    const sidebarNav = document.getElementById('sidebarNav');
    if (welcomeNav) welcomeNav.classList.remove('hidden');
    if (mainNav) mainNav.classList.add('hidden');
    if (sidebarNav) sidebarNav.classList.remove('hidden');
    
    showWelcome();
    // Restore landing extras on logout
    const newsSection = document.getElementById('news');
    if (newsSection) newsSection.classList.remove('hidden');
    const siteFooter = document.querySelector('footer');
    if (siteFooter) siteFooter.classList.remove('hidden');
    showToast('Logged out successfully', 'success');
}

// Navigation
function showSection(sectionId) {
    if (sectionId === 'home') {
        sectionId = 'welcome';
    }
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
        sectionElement.classList.remove('hidden');
    }
    if (sectionId === 'enroll') {
        renderCourses();
    } else if (sectionId === 'admin') {
        updateAdminDashboard();
    }
}

// Admin Tabs
function showAdminTab(tabId, button) {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
        tab.classList.add('text-gray-500');
    });
    if (button) {
        button.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
        button.classList.remove('text-gray-500');
    }
    
    document.querySelectorAll('.admin-content').forEach(content => {
        content.classList.add('hidden');
    });
    const tab = document.getElementById(tabId + 'Tab');
    if (tab) {
        tab.classList.remove('hidden');
    }
}

// Toast Notification
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    let toastMessage = document.getElementById('toastMessage');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg translate-y-20 opacity-0 transition-all duration-300 z-50 text-center';
        
        toastMessage = document.createElement('span');
        toastMessage.id = 'toastMessage';
        
        toast.appendChild(toastMessage);
        document.body.appendChild(toast);
    }
    
    toast.className = `fixed bottom-4 right-4 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300 z-50 text-center`;
    toastMessage.textContent = message;
    
    toast.classList.remove('translate-y-20', 'opacity-0');
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// Enrollment Form
async function handleRegistration(e) {
    e.preventDefault();

    const guardianFullName = (document.getElementById('guardianName')?.value || 'Guardian').trim();
    const guardianParts = guardianFullName.split(' ');
    const guardianFirstName = guardianParts[0] || 'Guardian';
    const guardianLastName = guardianParts.slice(1).join(' ') || 'Guardian';

    const data = {
        lastName: document.getElementById('lastName').value,
        firstName: document.getElementById('firstName').value,
        middleName: document.getElementById('middleName')?.value || '',
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        dob: document.getElementById('dob').value,
        gender: 'Male',
        civilStatus: 'Single',
        nationality: 'Filipino',
        religion: 'N/A',
        dialect: 'Tagalog',
        placeOfBirth: 'N/A',
        address: document.getElementById('address').value,
        elementarySchool: 'N/A',
        elementaryYearGraduated: '2020',
        lrn: '000000000000',
        level: document.getElementById('programSelect')?.value || 'Junior High School',
        gradeLevel: '7',
        strand: '',
        guardianLastName: guardianLastName,
        guardianFirstName: guardianFirstName,
        guardianPhone: document.getElementById('guardianPhone')?.value || document.getElementById('phone').value,
        guardianOccupation: 'Guardian',
        guardianAddress: document.getElementById('guardianAddress')?.value || document.getElementById('address').value,
        dataPrivacyAgreed: 1
    };

    try {
        const response = await fetch('php/api.php?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) {
            showToast(result.message, 'error');
            return;
        }

        document.getElementById('registrationForm').reset();
        showToast(result.message, 'success');
        showSection('home');
    } catch (error) {
        showToast('Failed to submit registration. Please try again.', 'error');
    }
}


async function checkCurrentUser() {
    try {
        const response = await fetch('php/api.php?action=current_user');
        const result = await response.json();
        if (result.success && result.user) {
            currentUser = result.user;
            if (result.user.role === 'student') {
                window.location.href = 'student-dashboard.html';
            } else {
                showAuthenticatedView(result.user);
            }
        } else {
            currentUser = null;
            showWelcome();
        }
    } catch (error) {
        currentUser = null;
        showWelcome();
    }
}

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    const content = document.getElementById('loginModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    const content = document.getElementById('loginModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
    }, 300);
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Please enter both email and password', 'error');
        return;
    }

    // 1. Try local/demo student fallbacks first based on email matching
    const demoStudents = [
        { email: 'student1@biringan.edu', password: 'student123', name: 'Juan Dela Cruz', level: 'Grade 11', strand: 'STEM' },
        { email: 'student2@biringan.edu', password: 'student123', name: 'Maria Santos', level: 'Grade 12', strand: 'ABM' },
        { email: 'student3@biringan.edu', password: 'student123', name: 'Jose Rizal', level: 'Grade 11', strand: 'TVL-HE' }
    ];
    const demoStudent = demoStudents.find(s => s.email === email && s.password === password);
    if (demoStudent) {
        currentUser = { email, role: 'student', name: demoStudent.name, level: demoStudent.level, strand: demoStudent.strand };
        hideLoginModal();
        showToast('Student login successful', 'success');
        setTimeout(() => {
            window.location.href = 'student-dashboard.html';
        }, 500);
        return;
    }

    // 3. Make real database API request to authenticate
    try {
        const response = await fetch('php/api.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (!result.success) {
            showToast(result.message, 'error');
            return;
        }

        currentUser = result.user;
        hideLoginModal();
        
        // Auto-detect role and redirect to the correct dashboard
        if (currentUser.role === 'admin') {
            showToast('Admin login successful', 'success');
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 500);
        } else {
            showToast('Login successful', 'success');
            setTimeout(() => {
                window.location.href = 'student-dashboard.html';
            }, 500);
        }
    } catch (error) {
        showToast('Login failed. Please try again.', 'error');
    }
}

function showStudentDashboard() {
    console.log('Showing student dashboard');
    
    // Hide welcome section
    const welcomeSection = document.getElementById('welcome');
    if (welcomeSection) {
        welcomeSection.style.display = 'none';
        welcomeSection.classList.add('hidden');
    }
    
    // Hide all tab contents except dashboard
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    // Show dashboard tab content
    const dashboardTab = document.getElementById('dashboard-tab');
    if (dashboardTab) {
        dashboardTab.classList.add('active');
        dashboardTab.style.display = 'block';
    }
    
    // Show dashboard section
    const dashboardSection = document.getElementById('dashboard');
    if (dashboardSection) {
        dashboardSection.style.display = 'block';
        dashboardSection.classList.remove('hidden');
    } else {
        console.error('Dashboard section not found');
    }
    
    // Load student dashboard data
    loadStudentDashboard();
    
    console.log('Student dashboard should now be visible');
}

function showAdminDashboard() {
    console.log('Showing admin dashboard');
    
    // Hide all sections first
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
        section.style.display = 'none';
        section.style.visibility = 'hidden';
    });
    
    // Hide main content wrapper
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.style.display = 'none';
    }
    
    // Hide welcome navigation (the original top nav)
    const welcomeNav = document.getElementById('welcomeNav');
    if (welcomeNav) {
        welcomeNav.classList.add('hidden');
        welcomeNav.style.display = 'none';
    }
    
    // Create admin navigation if it doesn't exist
    let adminNav = document.getElementById('adminNav');
    if (!adminNav) {
        adminNav = document.createElement('nav');
        adminNav.id = 'adminNav';
        adminNav.className = 'bg-blue-600 shadow-lg fixed top-0 left-0 right-0 z-50';
        adminNav.innerHTML = `
            <div class="max-w-7xl mx-auto px-4">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center space-x-3">
                        <img src="img/new-logo.png" alt="Academy of Biringan Logo" class="h-10 w-auto" />
                        <span class="text-white font-bold text-xl">JJKings Academy of Biringan - Admin</span>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-white font-medium">Welcome, Admin</span>
                        <button onclick="handleLogoutClick()" class="bg-white text-[#004b87] px-4 py-2 rounded-lg hover:bg-gray-100 transition font-bold">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(adminNav);
    } else {
        adminNav.classList.remove('hidden');
        adminNav.style.display = 'block';
    }
    
    // Show admin section - move it to body to ensure it displays
    const adminSection = document.getElementById('admin');
    if (adminSection) {
        // Move admin section to body if it's not already there
        if (adminSection.parentElement !== document.body) {
            document.body.appendChild(adminSection);
        }
        
        adminSection.classList.remove('hidden');
        adminSection.style.display = 'block';
        adminSection.style.visibility = 'visible';
        adminSection.style.position = 'relative';
        adminSection.style.marginTop = '80px';
        adminSection.style.paddingTop = '20px';
        adminSection.style.minHeight = 'calc(100vh - 80px)';
        adminSection.style.backgroundColor = '#f3f4f6';
        adminSection.style.width = '100%';
        adminSection.style.zIndex = '10';
        adminSection.style.overflow = 'auto';
        console.log('Admin section shown and moved to body');
    } else {
        console.error('Admin section not found');
    }
    
    // Hide tab navigation for admin
    const tabNav = document.getElementById('tabNavigation');
    if (tabNav) {
        tabNav.classList.add('hidden');
        tabNav.style.display = 'none';
    }
    
    // Hide footer for admin
    const footer = document.querySelector('footer');
    if (footer) {
        footer.classList.add('hidden');
        footer.style.display = 'none';
    }
    
    // Hide search overlay
    const searchOverlay = document.getElementById('searchOverlay');
    if (searchOverlay) {
        searchOverlay.classList.add('hidden');
        searchOverlay.style.display = 'none';
    }
    
    // Hide search trigger button
    const searchTriggerButtons = document.querySelectorAll('button[onclick="openSearch()"]');
    searchTriggerButtons.forEach(btn => {
        btn.classList.add('hidden');
        btn.style.display = 'none';
    });
    
    // Hide dark mode toggle
    const darkModeToggle = document.querySelector('button[onclick="toggleDarkMode()"]');
    if (darkModeToggle) {
        darkModeToggle.classList.add('hidden');
        darkModeToggle.style.display = 'none';
    }
    
    // Hide language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.classList.add('hidden');
        languageSelect.style.display = 'none';
    }
    
    // Hide main navigation bar
    const mainNav = document.getElementById('mainNav');
    if (mainNav) {
        mainNav.classList.add('hidden');
        mainNav.style.display = 'none';
    }
    
    // Hide login button, show logout button
    const loginBtn = document.getElementById('navLoginBtn');
    const logoutBtn = document.getElementById('navLogoutBtn');
    const enrollBtn = document.getElementById('navEnrollBtn');
    const faqBtn = document.querySelector('button[onclick="showFAQModal()"]');
    
    if (loginBtn) {
        loginBtn.classList.add('hidden');
        loginBtn.style.display = 'none';
    }
    if (logoutBtn) {
        logoutBtn.classList.remove('hidden');
        logoutBtn.style.display = 'block';
        logoutBtn.onclick = handleLogoutClick;
    }
    if (enrollBtn) {
        enrollBtn.classList.add('hidden');
        enrollBtn.style.display = 'none';
    }
    if (faqBtn) {
        faqBtn.classList.add('hidden');
        faqBtn.style.display = 'none';
    }
    
    // Update navigation for admin
    const authButtons = document.getElementById('authButtons');
    if (authButtons) {
        authButtons.classList.remove('hidden');
        authButtons.style.display = 'flex';
    }
    
    const userNav = document.getElementById('userNav');
    if (userNav) {
        userNav.classList.remove('hidden');
        userNav.style.display = 'flex';
    }
    
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = 'Admin';
    }
    
    // Load admin data
    loadEnrollmentApplications();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleLogoutClick() {
    showLogoutConfirmation();
}

function logoutAdmin() {
    // Show main content wrapper
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    // Hide admin section
    const adminSection = document.getElementById('admin');
    if (adminSection) {
        adminSection.classList.add('hidden');
        adminSection.style.display = 'none';
        adminSection.style.marginTop = '0';
    }
    
    // Hide admin navigation
    const adminNav = document.getElementById('adminNav');
    if (adminNav) {
        adminNav.classList.add('hidden');
        adminNav.style.display = 'none';
    }
    
    // Show welcome navigation (the original top nav)
    const welcomeNav = document.getElementById('welcomeNav');
    if (welcomeNav) {
        welcomeNav.classList.remove('hidden');
        welcomeNav.style.display = 'block';
    }
    
    // Show sidebar navigation
    const tabNav = document.getElementById('sidebarNav');
    if (tabNav) {
        tabNav.classList.remove('hidden');
        tabNav.style.display = 'flex';
    }
    
    // Show footer
    const footer = document.querySelector('footer');
    if (footer) {
        footer.classList.remove('hidden');
        footer.style.display = 'block';
    }
    
    // Show search trigger button
    const searchTriggerButtons = document.querySelectorAll('button[onclick="openSearch()"]');
    searchTriggerButtons.forEach(btn => {
        btn.classList.remove('hidden');
        btn.style.display = 'flex';
    });
    
    // Show dark mode toggle
    const darkModeToggle = document.querySelector('button[onclick="toggleDarkMode()"]');
    if (darkModeToggle) {
        darkModeToggle.classList.remove('hidden');
        darkModeToggle.style.display = 'block';
    }
    
    // Show language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.classList.remove('hidden');
        languageSelect.style.display = 'block';
    }
    
    // Hide main navigation bar (if it exists)
    const mainNav = document.getElementById('mainNav');
    if (mainNav) {
        mainNav.classList.add('hidden');
        mainNav.style.display = 'none';
    }
    
    // Reset welcome navigation buttons
    const loginBtn = document.getElementById('navLoginBtn');
    const logoutBtn = document.getElementById('navLogoutBtn');
    const enrollBtn = document.getElementById('navEnrollBtn');
    const faqBtn = document.querySelector('button[onclick="showFAQModal()"]');
    
    if (loginBtn) {
        loginBtn.classList.remove('hidden');
        loginBtn.style.display = 'block';
        loginBtn.onclick = showLoginModal;
        loginBtn.textContent = 'Login';
    }
    if (logoutBtn) {
        logoutBtn.classList.add('hidden');
        logoutBtn.style.display = 'none';
    }
    if (enrollBtn) {
        enrollBtn.classList.remove('hidden');
        enrollBtn.style.display = 'block';
    }
    if (faqBtn) {
        faqBtn.classList.remove('hidden');
        faqBtn.style.display = 'block';
    }
    
    // Hide user nav
    const userNav = document.getElementById('userNav');
    if (userNav) {
        userNav.classList.add('hidden');
        userNav.style.display = 'none';
    }
    
    // Show auth buttons
    const authButtons = document.getElementById('authButtons');
    if (authButtons) {
        authButtons.classList.remove('hidden');
        authButtons.style.display = 'flex';
    }
    
    // Hide all sections first
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show welcome section (home)
    const welcomeSection = document.getElementById('welcome');
    if (welcomeSection) {
        welcomeSection.classList.remove('hidden');
    }
    
    // Show news section
    const newsSection = document.getElementById('news');
    if (newsSection) {
        newsSection.classList.remove('hidden');
    }
    
    // Reset to home tab
    switchTab('home');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    showToast('Logged out successfully', 'success');
}

async function fetchAllStudents() {
    try {
        const response = await fetch('php/api.php?action=students');
        const result = await response.json();
        if (result.success) {
            allStudents = result.students.map(student => ({
                ...student,
                fullName: `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim()
            }));
        }
    } catch (error) {
        console.error('Failed to fetch students', error);
        allStudents = [];
    }
}

async function fetchApprovedStudents() {
    try {
        const response = await fetch('php/api.php?action=approved');
        const result = await response.json();
        if (result.success && result.data) {
            approvedStudents = result.data.map(student => ({
                ...student,
                fullName: `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim()
            }));
            students = approvedStudents;
        }
    } catch (error) {
        console.error('Failed to fetch approved students', error);
        approvedStudents = [];
        students = [];
    }
}

async function fetchPendingStudents() {
    try {
        const response = await fetch('php/api.php?action=pending');
        const result = await response.json();
        if (result.success && result.data) {
            pendingStudents = result.data.map(student => ({
                ...student,
                fullName: `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim()
            }));
        }
    } catch (error) {
        console.error('Failed to fetch pending students', error);
        pendingStudents = [];
    }
}

async function approveStudent(studentId) {
    try {
        const response = await fetch('php/api.php?action=approve_student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId })
        });
        const result = await response.json();
        if (!result.success) {
            showToast(result.message, 'error');
            return;
        }
        showToast(result.message, 'success');
        await updateAdminDashboard();
    } catch (error) {
        showToast('Failed to approve student. Please try again.', 'error');
    }
}

function renderPendingStudentCount() {
    const pendingCountEl = document.getElementById('pendingApplications');
    if (pendingCountEl) {
        pendingCountEl.textContent = pendingStudents.length;
    }
}

function showUserDashboard() {
    const header = document.querySelector('#dashboard h2');
    if (header && currentUser) {
        header.textContent = `Welcome back, ${currentUser.firstName} ${currentUser.lastName}`;
    }
}

// Render Courses
function renderCourses() {
    const courseList = document.getElementById('courseList');
    if (!courseList) return;
    courseList.innerHTML = '';
    
    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-indigo-300 transition';
        courseCard.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-semibold text-gray-800">${course.code} - ${course.name}</h4>
                <button onclick="enrollInCourse(${course.id})" class="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition">
                    Enroll
                </button>
            </div>
            <p class="text-gray-600 text-sm">${course.description}</p>
        `;
        courseList.appendChild(courseCard);
    });
}

// Enroll in Course
function enrollInCourse(courseId) {
    const studentId = parseInt(document.getElementById('studentSelect').value);
    
    if (!studentId) {
        showToast('Please select a student first', 'error');
        return;
    }
    
    // Check if already enrolled
    const alreadyEnrolled = enrollments.some(
        e => e.studentId === studentId && e.courseId === courseId
    );
    
    if (alreadyEnrolled) {
        showToast('Already enrolled in this course', 'error');
        return;
    }
    
    const enrollment = {
        id: Date.now(),
        studentId: studentId,
        courseId: courseId,
        enrolledDate: new Date().toISOString()
    };
    
    enrollments.push(enrollment);
    saveData();
    
    showToast('Successfully enrolled in course!');
    renderEnrolledCourses(studentId);
}

// Render Enrolled Courses
function renderEnrolledCourses(studentId) {
    const enrolledCoursesDiv = document.getElementById('enrolledCourses');
    
    if (!studentId) {
        enrolledCoursesDiv.innerHTML = '<p class="text-gray-500 italic">Please select a student to view enrolled courses</p>';
        return;
    }
    
    const studentEnrollments = enrollments.filter(e => e.studentId === studentId);
    
    if (studentEnrollments.length === 0) {
        enrolledCoursesDiv.innerHTML = '<p class="text-gray-500 italic">No courses enrolled yet</p>';
        return;
    }
    
    enrolledCoursesDiv.innerHTML = '';
    
    studentEnrollments.forEach(enrollment => {
        const course = courses.find(c => c.id === enrollment.courseId);
        const student = students.find(s => s.id === enrollment.studentId);
        
        const courseItem = document.createElement('div');
        courseItem.className = 'bg-green-50 border border-green-200 rounded-lg p-4 flex justify-between items-center';
        courseItem.innerHTML = `
            <div>
                <h4 class="font-semibold text-gray-800">${course.code} - ${course.name}</h4>
                <p class="text-gray-600 text-sm">Enrolled: ${new Date(enrollment.enrolledDate).toLocaleDateString()}</p>
            </div>
            <button onclick="unenrollFromCourse(${enrollment.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">
                Unenroll
            </button>
        `;
        enrolledCoursesDiv.appendChild(courseItem);
    });
}

// Unenroll from Course
function unenrollFromCourse(enrollmentId) {
    enrollments = enrollments.filter(e => e.id !== enrollmentId);
    saveData();
    
    const studentId = parseInt(document.getElementById('studentSelect').value);
    renderEnrolledCourses(studentId);
    showToast('Successfully unenrolled from course');
}

// Update Admin Dashboard
async function updateAdminDashboard() {
    await fetchAllStudents();
    await fetchApprovedStudents();
    await fetchPendingStudents();
    document.getElementById('totalStudents').textContent = allStudents.length;
    document.getElementById('totalEnrollments').textContent = enrollments.length;
    document.getElementById('totalCourses').textContent = courses.length;
    renderStudentsTable();
    renderEnrollmentsTable();
    renderCoursesTable();
    renderPendingStudentCount();
}

// Render Students Table
function renderStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';
    allStudents.forEach(student => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        const fullName = student.fullName || `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim();
        const status = student.status || 'pending';
        const actionButtons = [];
        if (status === 'pending') {
            actionButtons.push(`<button onclick="approveStudent(${student.id})" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition mr-2">Approve</button>`);
        }
        actionButtons.push(`<button onclick="deleteStudent(${student.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">Delete</button>`);

        row.innerHTML = `
            <td class="px-4 py-3 text-gray-800">${student.id}</td>
            <td class="px-4 py-3 text-gray-800">${fullName}</td>
            <td class="px-4 py-3 text-gray-800">${student.email}</td>
            <td class="px-4 py-3 text-gray-800">${student.phone}</td>
            <td class="px-4 py-3 text-gray-800">${status}</td>
            <td class="px-4 py-3">${actionButtons.join('')}</td>
        `;
        tbody.appendChild(row);
    });
}

// Render Enrollments Table
function renderEnrollmentsTable() {
    const tbody = document.getElementById('enrollmentsTableBody');
    tbody.innerHTML = '';
    enrollments.forEach(enrollment => {
        const student = students.find(s => s.id === enrollment.studentId);
        const course = courses.find(c => c.id === enrollment.courseId);
        
        if (!student || !course) return;
        
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3 text-gray-800">${student.fullName}</td>
            <td class="px-4 py-3 text-gray-800">${course.code} - ${course.name}</td>
            <td class="px-4 py-3 text-gray-800">${new Date(enrollment.enrolledDate).toLocaleDateString()}</td>
            <td class="px-4 py-3">
                <button onclick="unenrollFromCourse(${enrollment.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">
                    Remove
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render Courses Table
function renderCoursesTable() {
    const tbody = document.getElementById('coursesTableBody');
    tbody.innerHTML = '';
    
    courses.forEach(course => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3 text-gray-800">${course.code}</td>
            <td class="px-4 py-3 text-gray-800">${course.name}</td>
            <td class="px-4 py-3 text-gray-800">${course.description}</td>
            <td class="px-4 py-3">
                <button onclick="deleteCourse(${course.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">
                    Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Delete Student
function deleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student?')) {
        students = students.filter(s => s.id !== studentId);
        enrollments = enrollments.filter(e => e.studentId !== studentId);
        updateAdminDashboard();
        showToast('Student deleted successfully');
    }
}

// Delete Course
function deleteCourse(courseId) {
    if (confirm('Are you sure you want to delete this course?')) {
        courses = courses.filter(c => c.id !== courseId);
        enrollments = enrollments.filter(e => e.courseId !== courseId);
        saveData();
        updateAdminDashboard();
        renderCourses();
        showToast('Course deleted successfully');
    }
}

// Add Course
function addCourse() {
    const name = document.getElementById('newCourseName').value;
    const code = document.getElementById('newCourseCode').value;
    const description = document.getElementById('newCourseDescription').value;
    
    if (!name || !code) {
        showToast('Please fill in course name and code', 'error');
        return;
    }
    
    const course = {
        id: Date.now(),
        code: code,
        name: name,
        description: description
    };
    
    courses.push(course);
    saveData();
    
    document.getElementById('newCourseName').value = '';
    document.getElementById('newCourseCode').value = '';
    document.getElementById('newCourseDescription').value = '';
    
    updateAdminDashboard();
    renderCourses();
    showToast('Course added successfully');
}

// Save Data to LocalStorage
function saveData() {
    // No-op in API mode
}

// Toggle Grade/Strand Selection based on Level
function handlePublicSchoolGraduateToggle(checkbox) {
    const voucherSelect = document.getElementById('modalVoucherEligibility');
    if (voucherSelect) {
        if (checkbox.checked) {
            voucherSelect.value = 'public-school';
        } else {
            if (voucherSelect.value === 'public-school') {
                voucherSelect.value = '';
            }
        }
        updatePaymentSummary();
    }
}
window.handlePublicSchoolGraduateToggle = handlePublicSchoolGraduateToggle;

function toggleGradeStrandSelection() {
    const levelSelect = document.getElementById('modalLevel');
    const gradeLevelContainer = document.getElementById('gradeLevelContainer');
    const strandContainer = document.getElementById('strandContainer');
    const voucherEligibilityContainer = document.getElementById('voucherEligibilityContainer');
    
    const selectedLevel = levelSelect.value;

    const labelBirthCert = document.getElementById('labelDocBirthCert');
    const labelReportCard = document.getElementById('labelDocReportCard');
    const labelGoodMoral = document.getElementById('labelDocGoodMoral');

    if (selectedLevel && selectedLevel.startsWith('grade-')) {
        // Junior High School
        if (labelBirthCert) labelBirthCert.textContent = 'PSA Birth Certificate (formerly NSO Birth Certificate) *';
        if (labelReportCard) {
            if (selectedLevel === 'grade-7') {
                labelReportCard.textContent = 'Grade 6 Report Card (SF9, formerly Form 138) *';
            } else {
                labelReportCard.textContent = 'Previous Grade Report Card (SF9 / Form 138) *';
            }
        }
        if (labelGoodMoral) labelGoodMoral.textContent = 'Certificate of Good Moral Character *';
    } else {
        // Senior High School / General
        if (labelBirthCert) labelBirthCert.textContent = 'PSA Birth Certificate *';
        if (labelReportCard) {
            if (selectedLevel === 'senior-high-11') {
                labelReportCard.textContent = 'Original Grade 10 Report Card (SF9 / Form 138) *';
            } else if (selectedLevel === 'senior-high-12') {
                labelReportCard.textContent = 'Previous Grade Report Card (SF9 / Form 138) *';
            } else {
                labelReportCard.textContent = 'Form 138 / Report Card *';
            }
        }
        if (labelGoodMoral) labelGoodMoral.textContent = 'Certificate of Good Moral Character *';
    }
    
    if (selectedLevel && selectedLevel.startsWith('grade-')) {
        gradeLevelContainer.style.display = 'none';
        strandContainer.style.display = 'none';
        voucherEligibilityContainer.style.display = 'none';
        document.getElementById('modalGradeLevel').required = false;
        document.getElementById('modalStrand').required = false;
        document.getElementById('modalVoucherEligibility').required = false;
        updatePaymentSummary();
    } else if (selectedLevel === 'senior-high-11' || selectedLevel === 'senior-high-12') {
        gradeLevelContainer.style.display = 'none';
        strandContainer.style.display = 'block';
        voucherEligibilityContainer.style.display = 'block';
        document.getElementById('modalGradeLevel').required = false;
        document.getElementById('modalStrand').required = true;
        document.getElementById('modalVoucherEligibility').required = true;
        updatePaymentSummary();
    } else {
        gradeLevelContainer.style.display = 'none';
        strandContainer.style.display = 'none';
        voucherEligibilityContainer.style.display = 'none';
        document.getElementById('modalGradeLevel').required = false;
        document.getElementById('modalStrand').required = false;
        document.getElementById('modalVoucherEligibility').required = false;
        document.getElementById('modalVoucherEligibility').required = false;
        updatePaymentSummary();
    }
}

// Dynamically load strands from the subjects database
async function loadStrands() {
    const strandSelect = document.getElementById('modalStrand');
    if (!strandSelect) return;
    
    try {
        const response = await fetch('php/api.php?action=getSubjects');
        const result = await response.json();
        
        if (result.success && result.data) {
            // Extract unique strands that are not 'jhs'
            const uniqueStrands = [...new Set(result.data.map(s => s.level_strand))].filter(s => s !== 'jhs');
            
            if (uniqueStrands.length > 0) {
                const optionsHTML = '<option value="">-- Select Strand --</option>' + 
                    uniqueStrands.map(s => `<option value="${s}">${s.toUpperCase()}</option>`).join('');
                strandSelect.innerHTML = optionsHTML;
            }
        }
    } catch (err) {
        console.error('Error loading strands:', err);
    }
}


// Update Payment Summary based on level and voucher eligibility
// Handle repeater selection changes
function handleRepeaterChange() {
    const repeaterSelect = document.getElementById('modalIsRepeater');
    const voucherSelect = document.getElementById('modalVoucherEligibility');
    if (!repeaterSelect) return;
    const isRepeater = repeaterSelect.value;
    // If repeater, disable voucher options and clear selection
    if (isRepeater === 'Yes') {
        if (voucherSelect) {
            voucherSelect.value = '';
            voucherSelect.disabled = true;
        }
        // Hide voucher related UI rows
        const voucherRow = document.getElementById('voucherRow');
        const voucherNote = document.getElementById('voucherNote');
        if (voucherRow) voucherRow.style.display = 'none';
        if (voucherNote) voucherNote.style.display = 'none';
    } else {
        if (voucherSelect) voucherSelect.disabled = false;
    }
    updatePaymentSummary();
}

// Extend updatePaymentSummary to respect repeater status
function updatePaymentSummary() {
    const levelSelect = document.getElementById('modalLevel');
    if (!levelSelect) return;
    const voucherEligibility = document.getElementById('modalVoucherEligibility');
    const repeaterSelect = document.getElementById('modalIsRepeater');
    const uniformFeeRow = document.getElementById('uniformFeeRow');
    const voucherRow = document.getElementById('voucherRow');
    const voucherNote = document.getElementById('voucherNote');
    const selectLevelNote = document.getElementById('selectLevelNote');
    const modalTuitionFee = document.getElementById('modalTuitionFee');
    const modalTotalPayment = document.getElementById('modalTotalPayment');
    const gwaContainer = document.getElementById('gwaContainer');
    const gwaInput = document.getElementById('modalGwa');
    const selectedLevel = levelSelect.value;
    const selectedVoucher = voucherEligibility ? voucherEligibility.value : '';
    const isRepeater = repeaterSelect ? repeaterSelect.value : 'No';
    const tuitionFee = 25000;
    const registrationFee = 500;
    const labFee = 1000;
    const libraryFee = 500;
    const idFee = 200;
    const uniformFee = 3000;
    const voucherAmount = 27000;
    let total = 0;
    if (selectedLevel && selectedLevel.startsWith('grade-')) {
        // Junior High pays full fees, repeater status does not affect JHS
        total = tuitionFee + registrationFee + labFee + libraryFee + idFee;
        if (modalTuitionFee) modalTuitionFee.textContent = '₱' + tuitionFee.toLocaleString();
        if (uniformFeeRow) uniformFeeRow.style.display = 'none';
        if (voucherRow) voucherRow.style.display = 'none';
        if (voucherNote) voucherNote.style.display = 'none';
        if (selectLevelNote) selectLevelNote.style.display = 'none';
        if (gwaContainer) gwaContainer.style.display = 'none';
        if (gwaInput) gwaInput.required = false;
    } else if (selectedLevel === 'senior-high-11' || selectedLevel === 'senior-high-12') {
        if (isRepeater === 'Yes') {
            // Repeater: no voucher, pay full fees
            total = tuitionFee + registrationFee + labFee + libraryFee + idFee;
        } else {
            if (selectedVoucher === 'public-school') {
                total = uniformFee;
            } else if (selectedVoucher === 'same-school-voucher') {
                total = uniformFee;
            } else if (selectedVoucher === 'private-school-voucher') {
                total = (tuitionFee + registrationFee + labFee + libraryFee + idFee) - 17500;
            } else if (selectedVoucher === 'same-school-no-voucher' || selectedVoucher === 'private-school-no-voucher') {
                total = tuitionFee + registrationFee + labFee + libraryFee + idFee;
            } else {
                total = tuitionFee + registrationFee + labFee + libraryFee + idFee;
            }
        }
        if (modalTuitionFee) modalTuitionFee.textContent = '₱' + tuitionFee.toLocaleString();
        // Show/hide UI rows based on repeater & voucher logic
        if (uniformFeeRow) uniformFeeRow.style.display = (isRepeater === 'Yes' || selectedVoucher !== 'public-school' && selectedVoucher !== 'same-school-voucher') ? 'none' : 'flex';
        if (voucherRow) voucherRow.style.display = (isRepeater === 'Yes') ? 'none' : 'flex';
        if (voucherNote) voucherNote.style.display = (isRepeater === 'Yes') ? 'none' : 'block';
        if (selectLevelNote) selectLevelNote.style.display = 'none';
        if (gwaContainer) gwaContainer.style.display = (isRepeater === 'Yes') ? 'none' : 'block';
        if (gwaInput) gwaInput.required = (isRepeater === 'Yes') ? false : true;
    } else {
        total = 0;
        if (modalTuitionFee) modalTuitionFee.textContent = '₱0';
        if (uniformFeeRow) uniformFeeRow.style.display = 'none';
        if (voucherRow) voucherRow.style.display = 'none';
        if (voucherNote) voucherNote.style.display = 'none';
        if (selectLevelNote) selectLevelNote.style.display = 'block';
        if (gwaContainer) gwaContainer.style.display = 'none';
        if (gwaInput) gwaInput.required = false;
    }
    if (modalTotalPayment) modalTotalPayment.textContent = '₱' + total.toLocaleString();
    // Update hidden total field for form submission if needed
    const totalInput = document.getElementById('modalTotalAmount');
    if (totalInput) totalInput.value = total;
}


// Register Modal Functions
function showRegisterModal() {
    window.location.href = 'register.html';
}

function hideRegisterModal() {
    const form = document.getElementById('registerModalForm');
    if (form) form.reset();
    if (typeof updateEnrollmentSummary === 'function') updateEnrollmentSummary();
    if (isRegisterPage) {
        window.location.href = 'index.html';
    } else {
        switchTab('home');
    }
}

// Close Confirmation Modal Functions
function showCloseConfirmation() {
    const modal = document.getElementById('closeConfirmationModal');
    const content = document.getElementById('closeConfirmationContent');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideCloseConfirmation() {
    const modal = document.getElementById('closeConfirmationModal');
    const content = document.getElementById('closeConfirmationContent');
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

function confirmClose() {
    hideCloseConfirmation();
    hideRegisterModal();
}

// Handle Modal Registration
async function handleModalRegistration(e) {
    e.preventDefault();
    console.log('=== FORM SUBMISSION STARTED ===');
    
    // Check if Data Privacy is checked
    const dataPrivacy = document.getElementById('modalDataPrivacy');
    if (dataPrivacy && !dataPrivacy.checked) {
        showToast('Please agree to the Data Privacy Policy to submit your application.', 'error');
        return;
    }
    
    const form = document.getElementById('registerModalForm');
    if (!form) {
        console.error('Form not found!');
        showToast('Form not found. Please refresh the page.', 'error');
        return;
    }

    // Run final validation on all form steps
    let isValid = true;
    let missingFields = [];
    document.querySelectorAll('.form-step').forEach(stepContainer => {
        const requiredFields = stepContainer.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('border-red-500');
                const label = field.parentNode.querySelector('label')?.textContent.replace('*', '').trim() || field.placeholder || field.id;
                missingFields.push(label);
            } else {
                field.classList.remove('border-red-500');
            }
        });
    });
    
    if (!isValid) {
        showToast(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
        return;
    }
    
    // Show SweetAlert2 confirmation dialog for final submission
    Swal.fire({
        title: 'Confirm Submission',
        text: 'Are you sure you want to submit your enrollment application? Please review your details before proceeding.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Submit Application',
        cancelButtonText: 'Cancel'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const submitBtn = form.querySelector('button[type="submit"]');
            let originalContent = '';
            if (submitBtn) {
                originalContent = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';
                submitBtn.disabled = true;
            }

            try {
                console.log('Form is valid, submitting directly to API');
                saveFormData();
                
                // Read files as base64
                const birthCertFile = document.getElementById('modalDocBirthCert')?.files[0];
                const reportCardFile = document.getElementById('modalDocReportCard')?.files[0];
                const goodMoralFile = document.getElementById('modalDocGoodMoral')?.files[0];
                const voucherFile = document.getElementById('modalDocVoucher')?.files[0];

                const fileToBase64 = (file) => new Promise((resolve) => {
                    if (!file) return resolve('');
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });

                const birthCertBase64 = await fileToBase64(birthCertFile);
                const reportCardBase64 = await fileToBase64(reportCardFile);
                const goodMoralBase64 = await fileToBase64(goodMoralFile);
                const voucherBase64 = await fileToBase64(voucherFile);
                
                // Collect form data
                const selectedLevel = document.getElementById('modalLevel').value;
                let calculatedGradeLevel = '';
                if (selectedLevel && selectedLevel.startsWith('grade-')) {
                    calculatedGradeLevel = selectedLevel.replace('grade-', '');
                } else if (selectedLevel === 'senior-high-11') {
                    calculatedGradeLevel = '11';
                } else if (selectedLevel === 'senior-high-12') {
                    calculatedGradeLevel = '12';
                }

                const data = {
                    lastName: document.getElementById('modalLastName').value,
                    firstName: document.getElementById('modalFirstName').value,
                    middleName: document.getElementById('modalMiddleName').value,
                    suffix: document.getElementById('modalSuffix').value,
                    dob: document.getElementById('modalDob').value,
                    gender: document.getElementById('modalGender').value,
                    civilStatus: document.getElementById('modalCivilStatus').value,
                    nationality: document.getElementById('modalNationality').value,
                    religion: document.getElementById('modalReligion').value,
                    dialect: document.getElementById('modalDialect').value,
                    placeOfBirth: document.getElementById('modalPlaceOfBirth').value,
                    address: document.getElementById('modalAddress').value,
                    region: document.getElementById('modalRegion')?.value || '',
                    province: document.getElementById('modalProvince')?.value || '',
                    city: document.getElementById('modalCity')?.value || '',
                    barangay: document.getElementById('modalBarangay')?.value || '',
                    zipCode: document.getElementById('modalZipCode').value,
                    phone: document.getElementById('modalPhone').value,
                    landline: '',
                    email: document.getElementById('modalEmail').value,
                    elementarySchool: document.getElementById('modalElementarySchool').value,
                    elementaryYearGraduated: document.getElementById('modalElementaryYearGraduated').value,
                    lrn: document.getElementById('modalLRN').value,
                    highSchool: document.getElementById('modalHighSchool').value,
                    highSchoolYearGraduated: document.getElementById('modalHighSchoolYearGraduated').value,
                    grade10Section: '',
                    seniorHighSchool: '',
                    publicSchoolGraduate: document.getElementById('modalPublicSchoolGraduate').checked ? 'Yes' : 'No',
                    level: selectedLevel,
                    gradeLevel: calculatedGradeLevel,
                    strand: document.getElementById('modalStrand').value || '',
                    voucherEligibility: document.getElementById('modalVoucherEligibility').value || '',
                    gwa: document.getElementById('modalGwa')?.value || '',
                    fatherLastName: document.getElementById('modalFatherLastName').value,
                    fatherFirstName: document.getElementById('modalFatherFirstName').value,
                    fatherMiddleName: document.getElementById('modalFatherMiddleName').value,
                    fatherPhone: document.getElementById('modalFatherPhone').value,
                    fatherLandline: '',
                    fatherOccupation: document.getElementById('modalFatherOccupation').value,
                    fatherAddress: document.getElementById('modalFatherAddress').value,
                    fatherDeceased: document.getElementById('modalFatherDeceased').checked ? 1 : 0,
                    motherLastName: document.getElementById('modalMotherLastName').value,
                    motherFirstName: document.getElementById('modalMotherFirstName').value,
                    motherMiddleName: document.getElementById('modalMotherMiddleName').value,
                    motherPhone: document.getElementById('modalMotherPhone').value,
                    motherLandline: '',
                    motherOccupation: document.getElementById('modalMotherOccupation').value,
                    motherAddress: document.getElementById('modalMotherAddress').value,
                    motherDeceased: document.getElementById('modalMotherDeceased').checked ? 1 : 0,
                    guardianLastName: document.getElementById('modalGuardianLastName').value,
                    guardianFirstName: document.getElementById('modalGuardianFirstName').value,
                    guardianMiddleName: document.getElementById('modalGuardianMiddleName').value,
                    guardianPhone: document.getElementById('modalGuardianPhone').value,
                    guardianLandline: '',
                    guardianOccupation: document.getElementById('modalGuardianOccupation').value,
                    guardianAddress: document.getElementById('modalGuardianAddress').value,
                    dataPrivacyAgreed: document.getElementById('modalDataPrivacy').checked ? 1 : 0,
                    birthCertBase64: birthCertBase64,
                    birthCertName: birthCertFile ? birthCertFile.name : '',
                    reportCardBase64: reportCardBase64,
                    reportCardName: reportCardFile ? reportCardFile.name : '',
                    goodMoralBase64: goodMoralBase64,
                    goodMoralName: goodMoralFile ? goodMoralFile.name : '',
                    voucherBase64: voucherBase64,
                    voucherName: voucherFile ? voucherFile.name : ''
                };

                console.log('Form data collected:', data);
                console.log('Sending request to API...');
                const response = await fetch('php/api.php?action=register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                console.log('Response received, status:', response.status);
                const result = await response.json();
                console.log('API response:', result);
                
                if (!result.success) {
                    console.error('API returned error:', result.message);
                    showToast(result.message, 'error');
                    if (submitBtn) {
                        submitBtn.innerHTML = originalContent;
                        submitBtn.disabled = false;
                    }
                    return;
                }
                
                console.log('Registration successful, cleaning up...');
                form.reset();
                clearFormData();
                
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Registration Successful!',
                        text: 'Your application has been received and is under review. Please check your email for the next steps.',
                        icon: 'success',
                        confirmButtonColor: '#4f46e5',
                        confirmButtonText: 'Go to Homepage'
                    }).then(() => {
                        hideRegisterModal();
                    });
                } else {
                    showToast('Registration submitted successfully. Your application is now pending admin review.', 'success');
                    hideRegisterModal();
                }
                
            } catch (error) {
                console.error('Error in handleModalRegistration:', error);
                showToast('An error occurred. Please check the console for details.', 'error');
                if (submitBtn) {
                    submitBtn.innerHTML = originalContent;
                    submitBtn.disabled = false;
                }
            }
        }
    });
    console.log('=== FORM SUBMISSION ENDED ===');
}

// Step Progression State Management
let currentStep = 1;
const totalSteps = 6;

// Email assembler — combines username + selected domain into the hidden #modalEmail field
function assembleEmail() {
    const username = (document.getElementById('modalEmailUsername')?.value || '').trim();
    const domain = document.getElementById('modalEmailDomain')?.value || '@gmail.com';
    const hidden = document.getElementById('modalEmail');
    if (hidden) hidden.value = username ? username + domain : '';
}
window.assembleEmail = assembleEmail;

// Real-time Email format validator
function validateGmailField(input) {
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    const msg = document.getElementById('emailValidationMsg');
    const val = input.value.trim();

    if (!val) {
        input.classList.remove('border-red-500', 'border-green-500');
        if (msg) { msg.classList.add('hidden'); msg.textContent = ''; }
        return;
    }

    if (emailRegex.test(val)) {
        input.classList.remove('border-red-500');
        input.classList.add('border-green-500', 'focus:ring-green-500');
        if (msg) {
            msg.classList.remove('hidden', 'text-red-500');
            msg.classList.add('text-green-600');
            msg.textContent = '✓ Valid email address';
        }
    } else {
        input.classList.remove('border-green-500');
        input.classList.add('border-red-500');
        if (msg) {
            msg.classList.remove('hidden', 'text-green-600');
            msg.classList.add('text-red-500');
            msg.textContent = '✗ Enter a valid email address (e.g. example@email.com)';
        }
    }
}
window.validateGmailField = validateGmailField;

function validateAndConfirmStep(stepNum) {
    console.log(`Validating Step ${stepNum}...`);
    const activeStepEl = document.querySelector(`.form-step[data-step="${stepNum}"]`);
    if (!activeStepEl) return;

    const requiredFields = activeStepEl.querySelectorAll('[required]');
    let isValid = true;
    let missingFields = [];

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('border-red-500');
            const label = field.parentNode.querySelector('label')?.textContent.replace('*', '').trim() || field.placeholder || field.id;
            missingFields.push(label);
            
            let errorMsg = field.parentNode.querySelector('.error-message');
            if (!errorMsg) {
                errorMsg = document.createElement('span');
                errorMsg.className = 'error-message text-red-500 text-xs mt-1 block';
                errorMsg.textContent = 'This field is required';
                field.parentNode.appendChild(errorMsg);
            }
        } else {
            field.classList.remove('border-red-500');
            const errorMsg = field.parentNode.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        }
    });

    // Special handling for Step 3: GWA check for voucher eligibility
    if (stepNum === 3) {
        const levelSelect = document.getElementById('modalLevel');
        const voucherSelect = document.getElementById('modalVoucherEligibility');
        const gwaInput = document.getElementById('modalGwa');
        if (levelSelect && (levelSelect.value === 'senior-high-11' || levelSelect.value === 'senior-high-12')) {
            if (voucherSelect && (voucherSelect.value === 'same-school-voucher' || voucherSelect.value === 'private-school-voucher')) {
                if (!gwaInput || !gwaInput.value.trim()) {
                    isValid = false;
                    gwaInput.classList.add('border-red-500');
                    missingFields.push('Previous Grade / GWA');
                } else {
                    const gwa = parseFloat(gwaInput.value.trim());
                    if (isNaN(gwa) || gwa < 90) {
                        isValid = false;
                        gwaInput.classList.add('border-red-500');
                        showToast('To qualify for a tuition voucher, your GWA must be 90 or above.', 'error');
                        return;
                    } else {
                        gwaInput.classList.remove('border-red-500');
                    }
                }
            }
        }
        
        // LRN length validation (must be exactly 12 digits)
        const lrnInput = document.getElementById('modalLRN');
        if (lrnInput && lrnInput.value.trim()) {
            const lrn = lrnInput.value.trim();
            if (lrn.length !== 12) {
                isValid = false;
                lrnInput.classList.add('border-red-500');
                showToast('LRN must be exactly 12 digits.', 'error');
                return;
            }
        }
    }

    // Special handling for email format validation
    if (stepNum === 2) {
        const emailEl = document.getElementById('modalEmail');
        const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        if (emailEl) {
            if (!emailEl.value.trim()) {
                isValid = false;
                emailEl.classList.add('border-red-500');
                missingFields.push('Email Address');
            } else if (!emailRegex.test(emailEl.value.trim())) {
                isValid = false;
                emailEl.classList.add('border-red-500');
                showToast('Please enter a valid email address', 'error');
                const msg = document.getElementById('emailValidationMsg');
                if (msg) {
                    msg.classList.remove('hidden', 'text-green-600');
                    msg.classList.add('text-red-500');
                    msg.textContent = '✗ Enter a valid email address (e.g. example@email.com)';
                }
                return;
            }
        }
    }

    if (!isValid) {
        showToast(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
        return;
    }

    // Populate and show the Step Summary Modal
    populateStepSummary(stepNum);
    showStepSummaryModal(stepNum);
}

function populateStepSummary(stepNum) {
    const fieldsContainer = document.getElementById('stepSummaryFields');
    const titleEl = document.getElementById('stepSummaryTitle');
    const proceedBtn = document.getElementById('stepSummaryProceedBtn');
    
    if (!fieldsContainer || !titleEl || !proceedBtn) return;
    
    fieldsContainer.innerHTML = '';
    
    let stepTitle = '';
    let summaryHTML = '';
    
    if (stepNum === 1) {
        stepTitle = 'Personal Info Summary';
        const fields = [
            { label: 'Family Name', val: document.getElementById('modalLastName').value },
            { label: 'Given Name', val: document.getElementById('modalFirstName').value },
            { label: 'Middle Name', val: document.getElementById('modalMiddleName').value },
            { label: 'Suffix', val: document.getElementById('modalSuffix').value || '—' },
            { label: 'Date of Birth', val: document.getElementById('modalDob').value },
            { label: 'Gender', val: document.getElementById('modalGender').value },
            { label: 'Civil Status', val: document.getElementById('modalCivilStatus').value },
            { label: 'Nationality', val: document.getElementById('modalNationality').value },
            { label: 'Religion', val: document.getElementById('modalReligion').value },
            { label: 'Dialect/Language', val: document.getElementById('modalDialect').value },
            { label: 'Place of Birth', val: document.getElementById('modalPlaceOfBirth').value }
        ];
        
        summaryHTML = fields.map(f => `
            <div class="bg-white rounded-lg px-4 py-3 border border-indigo-100 border-l-4 border-l-indigo-500 shadow-sm">
                <span class="block text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">${f.label}</span>
                <span class="block text-gray-900 font-semibold text-sm break-words">${f.val || '—'}</span>
            </div>
        `).join('');
    } else if (stepNum === 2) {
        stepTitle = 'Address & Contact Summary';
        const fields = [
            { label: 'Complete Address', val: document.getElementById('modalAddress').value },
            { label: 'Zip Code', val: document.getElementById('modalZipCode').value },
            { label: 'Mobile No.', val: document.getElementById('modalPhone').value ? '+63' + document.getElementById('modalPhone').value : '—' },
            { label: 'Email Address', val: document.getElementById('modalEmail').value }
        ];
        
        summaryHTML = fields.map(f => `
            <div class="bg-white rounded-lg px-4 py-3 border border-indigo-100 border-l-4 border-l-indigo-500 shadow-sm">
                <span class="block text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">${f.label}</span>
                <span class="block text-gray-900 font-semibold text-sm break-words">${f.val || '—'}</span>
            </div>
        `).join('');
    } else if (stepNum === 3) {
        stepTitle = 'Academic Info Summary';
        
        const strandSelect = document.getElementById('modalStrand');
        const levelSelect = document.getElementById('modalLevel');
        const voucherSelect = document.getElementById('modalVoucherEligibility');
        
        const fields = [
            { label: 'Elementary School', val: document.getElementById('modalElementarySchool').value },
            { label: 'Elementary Year finished', val: document.getElementById('modalElementaryYearGraduated').value },
            { label: 'LRN', val: document.getElementById('modalLRN').value },
            { label: 'Previous School', val: document.getElementById('modalHighSchool').value },
            { label: 'Previous School Year finished', val: document.getElementById('modalHighSchoolYearGraduated').value },
            { label: 'Public Graduate?', val: document.getElementById('modalPublicSchoolGraduate').checked ? 'Yes' : 'No' },
            { label: 'Academic Level', val: levelSelect.options[levelSelect.selectedIndex]?.text || '—' },
            { label: 'Strand', val: strandSelect.options[strandSelect.selectedIndex]?.text || '—' },
            { label: 'Voucher Eligibility', val: voucherSelect.options[voucherSelect.selectedIndex]?.text || '—' },
            { label: 'GWA / Grade', val: (document.getElementById('gwaContainer').style.display !== 'none') ? document.getElementById('modalGwa').value : 'N/A' }
        ];
        
        summaryHTML = fields.map(f => `
            <div class="bg-white rounded-lg px-4 py-3 border border-indigo-100 border-l-4 border-l-indigo-500 shadow-sm">
                <span class="block text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">${f.label}</span>
                <span class="block text-gray-900 font-semibold text-sm break-words">${f.val || '—'}</span>
            </div>
        `).join('');
    } else if (stepNum === 4) {
        stepTitle = 'Parents Info Summary';
        
        const fatherDeceased = document.getElementById('modalFatherDeceased')?.checked;
        const motherDeceased = document.getElementById('modalMotherDeceased')?.checked;

        const fatherName = [
            document.getElementById('modalFatherFirstName')?.value,
            document.getElementById('modalFatherMiddleName')?.value,
            document.getElementById('modalFatherLastName')?.value
        ].filter(Boolean).join(' ') || '—';

        const motherName = [
            document.getElementById('modalMotherFirstName')?.value,
            document.getElementById('modalMotherMiddleName')?.value,
            document.getElementById('modalMotherLastName')?.value
        ].filter(Boolean).join(' ') || '—';

        const guardianName = [
            document.getElementById('modalGuardianFirstName')?.value,
            document.getElementById('modalGuardianMiddleName')?.value,
            document.getElementById('modalGuardianLastName')?.value
        ].filter(Boolean).join(' ') || '—';

        const fields = [];
        
        // Father
        if (fatherDeceased) {
            fields.push({ label: 'Father\'s Name', val: 'Deceased', fullWidth: true });
        } else {
            fields.push({ label: 'Father\'s Name', val: fatherName, fullWidth: true });
            fields.push({ label: 'Father\'s Phone', val: document.getElementById('modalFatherPhone')?.value || '—' });
            fields.push({ label: 'Father\'s Occupation', val: document.getElementById('modalFatherOccupation')?.value || '—' });
            fields.push({ label: 'Father\'s Address', val: document.getElementById('modalFatherAddress')?.value || '—', fullWidth: true });
        }

        // Mother
        if (motherDeceased) {
            fields.push({ label: 'Mother\'s Name', val: 'Deceased', fullWidth: true });
        } else {
            fields.push({ label: 'Mother\'s Name', val: motherName, fullWidth: true });
            fields.push({ label: 'Mother\'s Phone', val: document.getElementById('modalMotherPhone')?.value || '—' });
            fields.push({ label: 'Mother\'s Occupation', val: document.getElementById('modalMotherOccupation')?.value || '—' });
            fields.push({ label: 'Mother\'s Address', val: document.getElementById('modalMotherAddress')?.value || '—', fullWidth: true });
        }

        // Guardian
        fields.push({ label: 'Guardian\'s Name', val: guardianName, fullWidth: true });
        fields.push({ label: 'Guardian\'s Phone', val: document.getElementById('modalGuardianPhone')?.value || '—' });
        fields.push({ label: 'Guardian\'s Occupation', val: document.getElementById('modalGuardianOccupation')?.value || '—' });
        fields.push({ label: 'Guardian\'s Address', val: document.getElementById('modalGuardianAddress')?.value || '—', fullWidth: true });
        
        summaryHTML = fields.map(f => `
            <div class="${f.fullWidth ? 'col-span-2' : ''} bg-white rounded-lg px-4 py-3 border border-indigo-100 border-l-4 border-l-indigo-500 shadow-sm">
                <span class="block text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">${f.label}</span>
                <span class="block text-gray-900 font-semibold text-sm break-words">${f.val || '—'}</span>
            </div>
        `).join('');
    } else if (stepNum === 5) {
        stepTitle = 'Documents Summary';
        
        const birthCert = document.getElementById('modalDocBirthCert').files[0];
        const reportCard = document.getElementById('modalDocReportCard').files[0];
        const goodMoral = document.getElementById('modalDocGoodMoral').files[0];
        
        const fields = [
            { label: 'Birth Certificate', val: birthCert ? birthCert.name : 'Missing' },
            { label: 'Report Card', val: reportCard ? reportCard.name : 'Missing' },
            { label: 'Good Moral Cert', val: goodMoral ? goodMoral.name : 'Missing' }
        ];

        const docVoucherContainer = document.getElementById('docVoucherContainer');
        const docVoucher = document.getElementById('modalDocVoucher')?.files[0];
        if (docVoucherContainer && docVoucherContainer.style.display !== 'none') {
            fields.push({ label: 'Voucher Certificate', val: docVoucher ? docVoucher.name : 'Missing' });
        }
        
        summaryHTML = fields.map(f => `
            <div class="bg-white rounded-lg px-4 py-3 border border-indigo-100 border-l-4 border-l-indigo-500 shadow-sm">
                <span class="block text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">${f.label}</span>
                <span class="block text-gray-900 font-semibold text-sm break-words">${f.val || '—'}</span>
            </div>
        `).join('');
    }

    
    titleEl.textContent = stepTitle;
    fieldsContainer.innerHTML = summaryHTML;
    
    // Set the click event for the proceed button
    proceedBtn.onclick = () => {
        hideStepSummaryModal();
        nextStep(stepNum);
    };
}

function showStepSummaryModal(stepNum) {
    const modal = document.getElementById('stepSummaryModal');
    const content = document.getElementById('stepSummaryModalContent');
    
    if (modal && content) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
}

function hideStepSummaryModal() {
    const modal = document.getElementById('stepSummaryModal');
    const content = document.getElementById('stepSummaryModalContent');
    
    if (modal && content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        
        setTimeout(() => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        }, 300);
    }
}

// Populate the Step 6 Review & Submit summary card
function updateEnrollmentSummary() {
    const val = (id) => {
        const el = document.getElementById(id);
        if (!el) return '';
        return el.value ? el.value.trim() : '';
    };
    const selText = (id) => {
        const el = document.getElementById(id);
        if (!el || el.selectedIndex < 0) return '—';
        const txt = el.options[el.selectedIndex]?.text || '';
        return txt.startsWith('--') ? '—' : txt;
    };

    // --- Personal & Contact ---
    const firstName = val('modalFirstName');
    const middleName = val('modalMiddleName');
    const lastName = val('modalLastName');
    const suffix = val('modalSuffix');
    const fullName = [firstName, middleName, lastName, suffix].filter(Boolean).join(' ');
    const gender = val('modalGender') || '—';
    const dob = val('modalDob') || '—';
    const phone = val('modalPhone') ? '+63' + val('modalPhone') : '—';
    const email = val('modalEmail') || '—';

    const setEl = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    setEl('summaryEnrolleeName', fullName || '—');
    setEl('summaryGenderDob', `${gender} &bull; ${dob}`);
    setEl('summaryContactInfo', `${phone} &bull; ${email}`);

    // --- Address ---
    const address = val('modalAddress');
    const region = selText('modalRegion');
    const province = selText('modalProvince');
    const city = selText('modalCity');
    const barangay = selText('modalBarangay');
    const zip = val('modalZipCode');
    const addressParts = [address, barangay, city, province, region, zip].filter(v => v && v !== '—');
    setEl('summaryFullAddress', addressParts.length ? addressParts.join(', ') : '—');

    // --- Academic ---
    setEl('summaryAcademicLevel', selText('modalLevel'));

    const strandEl = document.getElementById('modalStrand');
    const gradeLevelEl = document.getElementById('modalGradeLevel');
    let strandOrGrade = '—';
    if (strandEl && strandEl.value) {
        strandOrGrade = selText('modalStrand');
    } else if (gradeLevelEl && gradeLevelEl.value) {
        strandOrGrade = 'Grade ' + gradeLevelEl.value;
    }
    setEl('summarySelectedStrand', strandOrGrade);

    setEl('summaryLrn', val('modalLRN') || '—');
    setEl('summaryVoucherStatus', selText('modalVoucherEligibility'));

    const gwaContainer = document.getElementById('gwaContainer');
    const summaryGwaContainer = document.getElementById('summaryGwaContainer');
    if (gwaContainer && summaryGwaContainer) {
        if (gwaContainer.style.display !== 'none') {
            summaryGwaContainer.style.display = 'block';
            setEl('summaryGwa', val('modalGwa') || '—');
        } else {
            summaryGwaContainer.style.display = 'none';
        }
    }

    const elemSchool = val('modalElementarySchool') || '—';
    const elemYear = val('modalElementaryYearGraduated') || '';
    const hsSchool = val('modalHighSchool') || '—';
    const hsYear = val('modalHighSchoolYearGraduated') || '';
    const schoolingLines = [];
    schoolingLines.push(`Elementary: ${elemSchool}${elemYear ? ' (Finished: ' + elemYear + ')' : ''}`);
    schoolingLines.push(`Previous School: ${hsSchool}${hsYear ? ' (Finished: ' + hsYear + ')' : ''}`);
    setEl('summaryPrevSchooling', schoolingLines.join('<br>'));

    // --- Parents & Guardian ---
    const fatherName = [val('modalFatherFirstName'), val('modalFatherMiddleName'), val('modalFatherLastName')].filter(Boolean).join(' ') || '—';
    const fatherPhone = val('modalFatherPhone') ? '+63' + val('modalFatherPhone') : '';
    const fatherOcc = val('modalFatherOccupation') || '';
    const fatherDeceased = document.getElementById('modalFatherDeceased')?.checked;
    let fatherHTML = fatherDeceased ? `<span class="text-red-500 font-bold">Deceased</span>` : fatherName;
    if (!fatherDeceased) {
        const extras = [fatherOcc, fatherPhone].filter(Boolean).join(' &bull; ');
        if (extras) fatherHTML += `<br><span class="text-xs text-gray-500">${extras}</span>`;
    }
    setEl('summaryFatherInfo', fatherHTML);

    const motherName = [val('modalMotherFirstName'), val('modalMotherMiddleName'), val('modalMotherLastName')].filter(Boolean).join(' ') || '—';
    const motherPhone = val('modalMotherPhone') ? '+63' + val('modalMotherPhone') : '';
    const motherOcc = val('modalMotherOccupation') || '';
    const motherDeceased = document.getElementById('modalMotherDeceased')?.checked;
    let motherHTML = motherDeceased ? `<span class="text-red-500 font-bold">Deceased</span>` : motherName;
    if (!motherDeceased) {
        const extras = [motherOcc, motherPhone].filter(Boolean).join(' &bull; ');
        if (extras) motherHTML += `<br><span class="text-xs text-gray-500">${extras}</span>`;
    }
    setEl('summaryMotherInfo', motherHTML);

    const guardianName = [val('modalGuardianFirstName'), val('modalGuardianMiddleName'), val('modalGuardianLastName')].filter(Boolean).join(' ') || '—';
    const guardianPhone = val('modalGuardianPhone') ? '+63' + val('modalGuardianPhone') : '';
    const guardianOcc = val('modalGuardianOccupation') || '';
    let guardianHTML = guardianName;
    const gExtras = [guardianOcc, guardianPhone].filter(Boolean).join(' &bull; ');
    if (gExtras) guardianHTML += `<br><span class="text-xs text-gray-500">${gExtras}</span>`;
    setEl('summaryPrimaryContact', guardianHTML);

    // --- Documents ---
    const docFields = [
        { inputId: 'modalDocBirthCert', summaryId: 'summaryDocBirthCert', title: 'PSA Birth Certificate', containerId: 'docBoxBirthCert' },
        { inputId: 'modalDocReportCard', summaryId: 'summaryDocReportCard', title: 'Form 138 / Report Card', containerId: 'docBoxReportCard' },
        { inputId: 'modalDocGoodMoral', summaryId: 'summaryDocGoodMoral', title: 'Certificate of Good Moral', containerId: 'docBoxGoodMoral' },
        { inputId: 'modalDocVoucher', summaryId: 'summaryDocVoucher', title: 'Voucher Certificate', containerId: 'summaryDocVoucherContainer' }
    ];

    docFields.forEach(doc => {
        const fileInput = document.getElementById(doc.inputId);
        const summaryEl = document.getElementById(doc.summaryId);
        const boxEl = document.getElementById(doc.containerId) || summaryEl?.closest('.flex');
        const iconContainer = boxEl?.querySelector('.icon-box') || summaryEl?.closest('.flex')?.querySelector('.w-8');
        const viewBtn = boxEl?.querySelector('.view-btn');

        let fileName = '';
        let fileObj = fileInput && fileInput.files && fileInput.files[0];

        if (fileObj) {
            fileName = fileObj.name;
        } else if (summaryEl && summaryEl.textContent && summaryEl.textContent.trim() !== '—' && summaryEl.textContent.trim() !== 'Not uploaded') {
            fileName = summaryEl.textContent.trim();
        }

        if (fileName && fileName !== 'Not uploaded' && fileName !== '—') {
            if (summaryEl) summaryEl.textContent = fileName;
            if (iconContainer) {
                iconContainer.className = 'w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold shrink-0 icon-box';
                iconContainer.innerHTML = '<i class="fas fa-check"></i>';
            }
            if (viewBtn) {
                viewBtn.style.display = 'inline-flex';
            }
            if (boxEl) {
                boxEl.style.cursor = 'pointer';
                boxEl.onclick = () => viewDocumentPreview(doc.inputId, doc.title, fileName);
            }
        } else {
            if (summaryEl) summaryEl.textContent = 'Not uploaded';
            if (iconContainer) {
                iconContainer.className = 'w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0 icon-box';
                iconContainer.innerHTML = '<i class="fas fa-exclamation"></i>';
            }
            if (viewBtn) {
                viewBtn.style.display = 'none';
            }
            if (boxEl) {
                boxEl.style.cursor = 'default';
                boxEl.onclick = () => {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'warning',
                            title: 'No Document Attached',
                            text: `No file has been uploaded for ${doc.title} yet. Please go back to Step 5 to upload a document.`,
                            confirmButtonColor: '#4f46e5'
                        });
                    }
                };
            }
        }
    });
}
window.updateEnrollmentSummary = updateEnrollmentSummary;

// --- Document Preview Viewer Functions ---
function viewDocumentPreview(inputId, title, fallbackFilename = '') {
    const fileInput = document.getElementById(inputId);
    let file = fileInput?.files?.[0];
    let fileUrl = '';
    let fileName = '';
    let fileType = '';

    if (file) {
        fileUrl = URL.createObjectURL(file);
        fileName = file.name;
        fileType = file.type || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    } else if (fallbackFilename && fallbackFilename !== '—' && fallbackFilename !== 'Not uploaded') {
        fileName = fallbackFilename;
        fileUrl = fallbackFilename;
        fileType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
    }

    if (!fileUrl) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'No Document Attached',
                text: `No file has been uploaded for ${title} yet. Please go back to Step 5 to upload a document.`,
                confirmButtonColor: '#4f46e5'
            });
        } else {
            alert(`No document attached for ${title}.`);
        }
        return;
    }

    openDocPreviewModal(title, fileName, fileUrl, fileType);
}
window.viewDocumentPreview = viewDocumentPreview;

function openDocPreviewModal(title, fileName, fileUrl, fileType) {
    const modal = document.getElementById('docPreviewModal');
    const modalTitle = document.getElementById('docPreviewModalTitle');
    const modalSubTitle = document.getElementById('docPreviewModalSubTitle');
    const modalBody = document.getElementById('docPreviewModalBody');
    const openTabBtn = document.getElementById('docPreviewOpenTabBtn');
    const downloadBtn = document.getElementById('docPreviewDownloadBtn');

    if (!modal) return;

    if (modalTitle) modalTitle.textContent = title;
    if (modalSubTitle) modalSubTitle.textContent = fileName;
    if (openTabBtn) openTabBtn.href = fileUrl;
    if (downloadBtn) {
        downloadBtn.href = fileUrl;
        downloadBtn.download = fileName;
    }

    const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName);
    const isPdf = fileType === 'application/pdf' || /\.pdf$/i.test(fileName);

    if (isImage) {
        modalBody.innerHTML = `
            <div class="flex items-center justify-center p-4 bg-slate-900/90 rounded-2xl min-h-[350px] max-h-[70vh] overflow-auto">
                <img src="${fileUrl}" alt="${fileName}" class="max-h-[65vh] max-w-full rounded-lg object-contain shadow-xl border border-slate-700" />
            </div>
        `;
    } else if (isPdf) {
        modalBody.innerHTML = `
            <div class="w-full h-[70vh] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <iframe src="${fileUrl}" class="w-full h-full border-0"></iframe>
            </div>
        `;
    } else {
        modalBody.innerHTML = `
            <div class="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div class="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto text-2xl font-bold">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div>
                    <h4 class="text-base font-bold text-slate-800">${fileName}</h4>
                    <p class="text-xs text-slate-500 mt-1">Direct inline preview is not supported for this file format.</p>
                </div>
                <div class="pt-2">
                    <a href="${fileUrl}" target="_blank" class="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm">
                        <i class="fas fa-external-link-alt"></i> Open / Download File
                    </a>
                </div>
            </div>
        `;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
window.openDocPreviewModal = openDocPreviewModal;

function closeDocPreviewModal() {
    const modal = document.getElementById('docPreviewModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}
window.closeDocPreviewModal = closeDocPreviewModal;

// Document input change listeners for Step 5 preview feedback
document.addEventListener('DOMContentLoaded', () => {
    const docInputs = [
        { id: 'modalDocBirthCert', title: 'PSA Birth Certificate' },
        { id: 'modalDocReportCard', title: 'Form 138 / Report Card' },
        { id: 'modalDocGoodMoral', title: 'Certificate of Good Moral' },
        { id: 'modalDocVoucher', title: 'Voucher Certificate' }
    ];

    docInputs.forEach(item => {
        const inputEl = document.getElementById(item.id);
        if (!inputEl) return;

        inputEl.addEventListener('change', () => {
            const parent = inputEl.parentElement;
            let previewBtn = parent.querySelector('.step5-preview-btn');

            if (inputEl.files && inputEl.files[0]) {
                const file = inputEl.files[0];
                const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
                
                if (!previewBtn) {
                    previewBtn = document.createElement('div');
                    previewBtn.className = 'step5-preview-btn mt-2 flex items-center justify-between p-2 bg-indigo-50/80 rounded-xl border border-indigo-100 text-xs font-semibold text-indigo-700';
                    parent.appendChild(previewBtn);
                }
                
                previewBtn.innerHTML = `
                    <span class="truncate pr-2"><i class="fas fa-paperclip mr-1.5 text-indigo-500"></i>${file.name} (${sizeMb} MB)</span>
                    <button type="button" onclick="viewDocumentPreview('${item.id}', '${item.title}')" class="px-2.5 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shrink-0 flex items-center gap-1 font-bold text-[11px]">
                        <i class="fas fa-eye text-[10px]"></i> Preview
                    </button>
                `;
            } else if (previewBtn) {
                previewBtn.remove();
            }

            if (typeof updateEnrollmentSummary === 'function') {
                updateEnrollmentSummary();
            }
        });
    });
});

function nextStep(stepNum) {
    if (stepNum >= totalSteps) return;
    
    const currentStepEl = document.querySelector(`.form-step[data-step="${stepNum}"]`);
    const nextStepEl = document.querySelector(`.form-step[data-step="${stepNum + 1}"]`);
    
    if (currentStepEl && nextStepEl) {
        saveFormData(); // Save partial form progress to localStorage
        
        currentStepEl.classList.add('hidden');
        nextStepEl.classList.remove('hidden');
        
        currentStep = stepNum + 1;
        updateStepperUI();
        
        // Populate the enrollment summary when entering Step 6
        if (currentStep === 6) {
            updateEnrollmentSummary();
        }
        
        // Scroll to form top
        const formTop = document.getElementById('register-section');
        if (formTop) {
            formTop.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

function prevStep(stepNum) {
    if (stepNum <= 1) return;
    
    const currentStepEl = document.querySelector(`.form-step[data-step="${stepNum}"]`);
    const prevStepEl = document.querySelector(`.form-step[data-step="${stepNum - 1}"]`);
    
    if (currentStepEl && prevStepEl) {
        currentStepEl.classList.add('hidden');
        prevStepEl.classList.remove('hidden');
        
        currentStep = stepNum - 1;
        updateStepperUI();
        
        // Scroll to form top
        const formTop = document.getElementById('register-section');
        if (formTop) {
            formTop.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

function updateStepperUI() {
    for (let i = 1; i <= totalSteps; i++) {
        const circle = document.querySelector(`#step-indicator-${i} .step-circle`);
        const label = document.querySelector(`#step-indicator-${i} .step-label`);
        const line = document.querySelector(`#step-indicator-${i} .step-line`);
        
        if (!circle) continue;
        
        if (i < currentStep) {
            // Completed Step
            circle.className = 'w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-lg border-4 border-green-100 z-10 step-circle transition-all';
            circle.innerHTML = '<i class="fas fa-check"></i>';
            if (label) label.className = 'text-xs font-semibold mt-2 text-green-500 step-label';
            if (line) line.className = 'absolute left-1/2 top-5 w-full h-1 bg-green-500 -z-0 step-line';
        } else if (i === currentStep) {
            // Active Step
            circle.className = 'w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg border-4 border-indigo-100 z-10 step-circle transition-all';
            circle.innerHTML = i.toString();
            if (label) label.className = 'text-xs font-semibold mt-2 text-indigo-600 step-label';
            if (line) line.className = 'absolute left-1/2 top-5 w-full h-1 bg-gray-200 -z-0 step-line';
        } else {
            // Future Step
            circle.className = 'w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-lg border-4 border-white z-10 step-circle transition-all';
            circle.innerHTML = i.toString();
            if (label) label.className = 'text-xs font-semibold mt-2 text-gray-400 step-label';
            if (line) line.className = 'absolute left-1/2 top-5 w-full h-1 bg-gray-200 -z-0 step-line';
        }
    }
}

// Toggle middle name field when "No middle name" checkbox is checked
function toggleMiddleName(checkbox, inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (checkbox.checked) {
        input.value = 'N/A';
        input.disabled = true;
        input.removeAttribute('required');
        input.classList.remove('border-red-500');
        input.classList.add('bg-slate-100', 'text-slate-400');
        const errorMsg = input.parentNode.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
    } else {
        input.value = '';
        input.disabled = false;
        input.setAttribute('required', '');
        input.classList.remove('bg-slate-100', 'text-slate-400');
        input.focus();
    }
}

// Toggle "Other" text input when "Other" is selected in a dropdown
function toggleOtherInput(selectEl, containerId, inputId) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    if (!container || !input) return;
    if (selectEl.value === 'other') {
        container.classList.remove('hidden');
        input.setAttribute('required', '');
        input.focus();
    } else {
        container.classList.add('hidden');
        input.removeAttribute('required');
        input.value = '';
        input.classList.remove('border-red-500');
        const errorMsg = input.parentNode.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
    }
}

// Bind to window object for inline HTML event handlers
window.toggleOtherInput = toggleOtherInput;
window.toggleMiddleName = toggleMiddleName;
window.validateAndConfirmStep = validateAndConfirmStep;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.hideStepSummaryModal = hideStepSummaryModal;

// Clear error when user starts typing
document.addEventListener('DOMContentLoaded', function() {
    loadStrands();
    
    const form = document.getElementById('registerModalForm');
    if (form) {
        form.addEventListener('input', function(e) {
            if (e.target.hasAttribute('required')) {
                e.target.classList.remove('border-red-500');
                const errorMsg = e.target.parentNode.querySelector('.error-message');
                if (errorMsg) {
                    errorMsg.remove();
                }
            }
            // Auto-save form data on input
            saveFormData();
            if (typeof updateEnrollmentSummary === 'function') {
                updateEnrollmentSummary();
            }
        });
        // Redundant submit listener removed. Final submission is handled by handleModalRegistration.
    }
});

// Save form data to localStorage
function saveFormData() {
    const form = document.getElementById('registerModalForm');
    if (!form) return;
    
    const formData = {};
    form.querySelectorAll('input, select, textarea').forEach(field => {
        if (field.id) {
            formData[field.id] = field.value;
        }
    });
    
    localStorage.setItem('enrollmentFormData', JSON.stringify(formData));
    localStorage.setItem('enrollmentFormStep', currentStep);
}

// Load form data from localStorage
function loadFormData() {
    const savedData = localStorage.getItem('enrollmentFormData');
    if (!savedData) return;
    
    try {
        const formData = JSON.parse(savedData);
        Object.keys(formData).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                if (field.type === 'file') return; // Skip restoring values to file inputs
                if (formData[fieldId] !== undefined && formData[fieldId] !== '') {
                    field.value = formData[fieldId];
                }
            }
        });
        
        if (typeof toggleGradeStrandSelection === 'function') toggleGradeStrandSelection();
        if (typeof updatePaymentSummary === 'function') updatePaymentSummary();
        if (typeof updateEnrollmentSummary === 'function') updateEnrollmentSummary();
    } catch (e) {
        console.error('Error loading saved form data:', e);
    }
}

// Clear saved form data
function clearFormData() {
    localStorage.removeItem('enrollmentFormData');
    localStorage.removeItem('enrollmentFormStep');
}

// Restore the saved step after a page refresh
function restoreStep() {
    let savedStep = parseInt(localStorage.getItem('enrollmentFormStep'), 10);
    if (!savedStep || savedStep < 1 || savedStep > totalSteps) return;

    // Force return to step 5 (documents upload) if they refreshed on step 6
    // because browsers automatically clear file input selections on refresh
    if (savedStep === 6) {
        savedStep = 5;
        localStorage.setItem('enrollmentFormStep', 5);
        setTimeout(() => {
            showToast('Form refreshed. Please re-upload your required documents.', 'info');
        }, 500);
    }

    // Hide all steps, show only the target one
    document.querySelectorAll('.form-step').forEach(el => el.classList.add('hidden'));
    const targetStep = document.querySelector(`.form-step[data-step="${savedStep}"]`);
    if (targetStep) targetStep.classList.remove('hidden');

    currentStep = savedStep;
    updateStepperUI();
}


// Removed confirmation modal functions - form now submits directly

// Slider Functions
let currentSlide = 0;

function initializeSlider() {
    slides = Array.from(document.querySelectorAll('.slide'));
    dots = Array.from(document.querySelectorAll('.slider-dot'));
    progressBar = document.getElementById('sliderProgress');
    const sliderContainer = document.getElementById('slider');
    if (sliderContainer) {
        sliderContainer.addEventListener('mouseenter', stopAutoSlider);
        sliderContainer.addEventListener('mouseleave', startAutoSlider);
    }
    if (slides.length) {
        goToSlide(0);
    }
}

function goToSlide(index) {
    // Hide all slides with scale animation
    slides.forEach((slide, i) => {
        if (i === index) {
            slide.classList.remove('opacity-0', 'scale-105');
            slide.classList.add('opacity-100', 'scale-100');
        } else {
            slide.classList.remove('opacity-100', 'scale-100');
            slide.classList.add('opacity-0', 'scale-105');
        }
    });
    
    // Update dots
    dots.forEach((dot, i) => {
        if (i === index) {
            dot.classList.remove('opacity-50');
            dot.classList.add('opacity-100');
        } else {
            dot.classList.remove('opacity-100');
            dot.classList.add('opacity-50');
        }
    });
    
    // Update progress bar
    if (progressBar && slides.length > 0) {
        const progress = ((index + 1) / slides.length) * 100;
        progressBar.style.width = progress + '%';
    }
    
    currentSlide = index;
}

function nextSlide() {
    const nextIndex = (currentSlide + 1) % slides.length;
    goToSlide(nextIndex);
}

function prevSlide() {
    const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
    goToSlide(prevIndex);
}

function startAutoSlider() {
    if (sliderInterval) clearInterval(sliderInterval); // Clear any existing interval to prevent leaks
    sliderInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
}

function stopAutoSlider() {
    clearInterval(sliderInterval);
    sliderInterval = null;
}

// Toggle Password Visibility
function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input && icon) {
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
}

// Philippine Geographic Data
const philippineData = {
    ncr: {
        name: 'NCR - National Capital Region',
        provinces: ['Metro Manila'],
        cities: {
            'Metro Manila': ['Manila', 'Quezon City', 'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong', 'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay', 'Pasig', 'Pateros', 'San Juan', 'Taguig', 'Valenzuela']
        }
    },
    car: {
        name: 'CAR - Cordillera Administrative Region',
        provinces: ['Abra', 'Apayao', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province'],
        cities: {
            'Abra': ['Bangued', 'Boliney', 'Bucay', 'Bucloc', 'Daguioman', 'Danglas', 'Dolores', 'La Paz', 'Lacub', 'Lagangilang', 'Lagayan', 'Langiden', 'Licuan-Baay', 'Luba', 'Malibcong', 'Manabo', 'Peñarrubia', 'Pidigan', 'Pilar', 'Sallapadan', 'San Isidro', 'San Juan', 'San Quintin', 'Tayum', 'Tineg', 'Tubo', 'Villaviciosa'],
            'Apayao': ['Calanasan', 'Conner', 'Flora', 'Kabugao', 'Luna', 'Pudtol', 'Santa Marcela'],
            'Benguet': ['Baguio City', 'La Trinidad', 'Itogon', 'Mankayan', 'Tuba', 'Atok', 'Bakun', 'Bokod', 'Buguias', 'Kapangan', 'Kibungan', 'Sablan', 'Tublay', 'Kapangan'],
            'Ifugao': ['Lagawe', 'Lamut', 'Aguinaldo', 'Alfonso Lista', 'Asipulo', 'Banaue', 'Hingyon', 'Hungduan', 'Kiangan', 'Mayoyao', 'Tinoc'],
            'Kalinga': ['Tabuk City', 'Balbalan', 'Lubuagan', 'Pasil', 'Pinukpuk', 'Rizal', 'Tanudan', 'Tinglayan'],
            'Mountain Province': ['Bontoc', 'Barlig', 'Bauko', 'Besao', 'Natonin', 'Paracelis', 'Sabangan', 'Sagada', 'Tadian']
        }
    },
    'region-i': {
        name: 'Region I - Ilocos Region',
        provinces: ['Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan'],
        cities: {
            'Ilocos Norte': ['Laoag City', 'Batac City', 'Badoc', 'Bangui', 'Banna', 'Burgos', 'Carasi', 'Currimao', 'Dingras', 'Dimasalang', 'Marcos', 'Nueva Era', 'Pagudpud', 'Paoay', 'Pasuquin', 'Piddig', 'Pinili', 'San Nicolas', 'Sarrat', 'Solsona', 'Vintar'],
            'Ilocos Sur': ['Vigan City', 'Candon City', 'Alilem', 'Banayoyo', 'Bantay', 'Burgos', 'Cabugao', 'Caoayan', 'Cervantes', 'Galimuyod', 'Gregorio Del Pilar', 'Lidlidda', 'Magsingal', 'Nagbukel', 'Narvacan', 'Quirino', 'Salcedo', 'San Emilio', 'San Esteban', 'San Ildefonso', 'San Juan', 'San Vicente', 'Santa', 'Santa Catalina', 'Santa Cruz', 'Santa Lucia', 'Santa Maria', 'Santiago', 'Santo Domingo', 'Sigay', 'Sugpon', 'Suyo', 'Tagudin'],
            'La Union': ['San Fernando City', 'Agoo', 'Aringay', 'Bacnotan', 'Bagulin', 'Bakun', 'Balaoan', 'Bangar', 'Baroro', 'Bauang', 'Burgos', 'Caba', 'Luna', 'Naguilian', 'Pugo', 'Rosario', 'San Gabriel', 'San Juan', 'Santo Tomas', 'Sudipen', 'Tubao'],
            'Pangasinan': ['Dagupan City', 'Urdaneta City', 'Alcala', 'Anda', 'Asingan', 'Balungao', 'Bani', 'Basista', 'Bayambang', 'Binalonan', 'Binmaley', 'Bolinao', 'Bugallon', 'Burgos', 'Calasiao', 'Dasol', 'Infanta', 'Labrador', 'Laoac', 'Lingayen', 'Mabini', 'Malasiqui', 'Manaoag', 'Mangaldan', 'Mapandan', 'Natividad', 'Pozorrubio', 'Rosales', 'San Carlos City', 'San Fabian', 'San Jacinto', 'San Manuel', 'San Nicolas', 'San Quintin', 'Santa Barbara', 'Santa Maria', 'Santo Tomas', 'Sison', 'Tayug', 'Umingan', 'Urbiztondo', 'Villasis']
        }
    },
    'region-ii': {
        name: 'Region II - Cagayan Valley',
        provinces: ['Batanes', 'Cagayan', 'Isabela', 'Nueva Vizcaya', 'Quirino'],
        cities: {
            'Batanes': ['Basco', 'Itbayat', 'Ivana', 'Mahatao', 'Sabtang', 'Uyugan'],
            'Cagayan': ['Tuguegarao City', 'Aparri', 'Baggao', 'Ballesteros', 'Calayan', 'Camalaniugan', 'Claveria', 'Enrile', 'Gattaran', 'Gonzaga', 'Lallo', 'Lasam', 'Luna', 'Pamplona', 'Peñablanca', 'Rizal', 'Sanchez-Mira', 'Santa Ana', 'Santa Praxedes', 'Santa Teresita', 'Santo Niño', 'Solana', 'Tuao', 'Veruela'],
            'Isabela': ['Cauayan City', 'Ilagan City', 'Santiago City', 'Alicia', 'Angadanan', 'Aurora', 'Benito Soliven', 'Burgos', 'Cabagan', 'Cabatuan', 'Cordon', 'Delfin Albano', 'Dinapigue', 'Echague', 'Gamu', 'Jones', 'Luna', 'Maconacon', 'Mallig', 'Naguilian', 'Palanan', 'Quezon', 'Quirino', 'Ramon', 'Reina Mercedes', 'Roxas', 'San Agustin', 'San Guillermo', 'San Isidro', 'San Manuel', 'San Mariano', 'San Mateo', 'San Pablo', 'Santa Maria', 'Santo Tomas', 'Tumauini']
        }
    },
    'region-iii': {
        name: 'Region III - Central Luzon',
        provinces: ['Aurora', 'Bataan', 'Bulacan', 'Nueva Ecija', 'Pampanga', 'Tarlac', 'Zambales'],
        cities: {
            'Aurora': ['Baler', 'Casiguran', 'Dilasag', 'Dinalungan', 'Dingalan', 'Maria Aurora', 'San Luis'],
            'Bataan': ['Balanga City', 'Abucay', 'Bagac', 'Dinalupihan', 'Hermosa', 'Limay', 'Mariveles', 'Morong', 'Orani', 'Orion', 'Pilar', 'Samal'],
            'Bulacan': ['Malolos City', 'Meycauayan City', 'San Jose del Monte City', 'Angat', 'Balagtas', 'Baliuag', 'Bocaue', 'Bulakan', 'Bustos', 'Calumpit', 'Doña Remedios Trinidad', 'Guiguinto', 'Hagonoy', 'Marilao', 'Norzagaray', 'Obando', 'Pandi', 'Paombong', 'Plaridel', 'Pulilan', 'San Ildefonso', 'San Miguel', 'San Rafael', 'Santa Maria'],
            'Nueva Ecija': ['Cabanatuan City', 'Gapan City', 'Muñoz City', 'Palayan City', 'San Jose City', 'Aliaga', 'Bongabon', 'Cabiao', 'Carranglan', 'Cuyapo', 'Gabaldon', 'General Mamerto Natividad', 'General Tinio', 'Guimba', 'Jaen', 'Laur', 'Licab', 'Llanera', 'Lupao', 'Nampicuan', 'Pantabangan', 'Peñaranda', 'Quezon', 'Rizal', 'San Antonio', 'San Isidro', 'San Leonardo', 'Santa Rosa', 'Santo Domingo', 'Talavera', 'Talugtug', 'Zaragoza'],
            'Pampanga': ['Angeles City', 'San Fernando City', 'Mabalacat City', 'Apalit', 'Arayat', 'Bacolor', 'Candaba', 'Floridablanca', 'Guagua', 'Lubao', 'Macabebe', 'Magalang', 'Masantol', 'Mexico', 'Minalin', 'Porac', 'San Luis', 'San Simon', 'Santa Ana', 'Santa Rita', 'Santo Tomas', 'Sasmuan'],
            'Tarlac': ['Tarlac City', 'Anao', 'Bamban', 'Camiling', 'Capas', 'Concepcion', 'Gerona', 'La Paz', 'Mayantoc', 'Moncada', 'Paniqui', 'Pura', 'Ramos', 'San Clemente', 'San Jose', 'San Manuel', 'Santa Ignacia', 'Victoria'],
            'Zambales': ['Olongapo City', 'Botolan', 'Cabangan', 'Candelaria', 'Castillejos', 'Iba', 'Masinloc', 'Palauig', 'San Antonio', 'San Felipe', 'San Marcelino', 'San Narciso', 'Santa Cruz', 'Subic']
        }
    },
    'region-iv-a': {
        name: 'Region IV-A - CALABARZON',
        provinces: ['Cavite', 'Laguna', 'Batangas', 'Rizal', 'Quezon'],
        cities: {
            'Cavite': ['Tagaytay City', 'Trece Martires City', 'Bacoor City', 'Cavite City', 'Dasmariñas City', 'General Trias City', 'Imus City', 'Parañaque City', 'Taguig City', 'Alfonso', 'Amadeo', 'Carmona', 'General Emilio Aguinaldo', 'General Mariano Alvarez', 'Indang', 'Kawit', 'Magallanes', 'Maragondon', 'Mendez', 'Naic', 'Noveleta', 'Rosario', 'Silang', 'Tanza', 'Ternate'],
            'Laguna': ['San Pablo City', 'Santa Rosa City', 'Biñan City', 'Cabuyao City', 'Calamba City', 'San Pedro City', 'Alaminos', 'Bay', 'Calauan', 'Cavinti', 'Famy', 'Kalayaan', 'Liliw', 'Los Baños', 'Lumban', 'Luisiana', 'Mabitac', 'Magdalena', 'Majayjay', 'Nagcarlan', 'Paete', 'Pagsanjan', 'Pakil', 'Pangil', 'Pila', 'Rizal', 'San Pablo', 'Santa Cruz', 'Santa Maria', 'Siniloan', 'Victoria'],
            'Batangas': ['Batangas City', 'Lipa City', 'Tanauan City', 'Agoncillo', 'Alitagtag', 'Balayan', 'Balete', 'Batangas', 'Bauan', 'Calaca', 'Calatagan', 'Cuenca', 'Ibaan', 'Laurel', 'Lemery', 'Lian', 'Lobo', 'Mabini', 'Malvar', 'Mataas na Kahoy', 'Nasugbu', 'Padre Garcia', 'Rosario', 'San Jose', 'San Juan', 'San Luis', 'San Nicolas', 'San Pascual', 'Santa Teresita', 'Santo Tomas', 'Taal', 'Talisay', 'Taysan', 'Tingloy', 'Tuy'],
            'Rizal': ['Antipolo City', 'Angono', 'Baras', 'Binangonan', 'Cainta', 'Cardona', 'Jalajala', 'Morong', 'Pililla', 'Rodriguez', 'San Mateo', 'Tanay', 'Taytay', 'Teresa'],
            'Quezon': ['Lucena City', 'Tayabas City', 'Agdangan', 'Alabat', 'Atimonan', 'Buenavista', 'Burdeos', 'Calauag', 'Candelaria', 'Catanauan', 'Dolores', 'General Luna', 'General Nakar', 'Gumaca', 'Infanta', 'Jomalig', 'Lopez', 'Lucban', 'Mauban', 'Mulanay', 'Pagbilao', 'Panan', 'Pitogo', 'Plaridel', 'Polillo', 'Quezon', 'Real', 'Sampaloc', 'San Andres', 'San Antonio', 'San Francisco', 'San Narciso', 'Tagkawayan', 'Tiaong', 'Unisan']
        }
    },
    'region-iv-b': {
        name: 'Region IV-B - MIMAROPA',
        provinces: ['Occidental Mindoro', 'Oriental Mindoro', 'Marinduque', 'Romblon', 'Palawan'],
        cities: {
            'Occidental Mindoro': ['Abra de Ilog', 'Calintaan', 'Looc', 'Lubang', 'Magsaysay', 'Mamburao', 'Paluan', 'Rizal', 'Sablayan', 'San Jose', 'Santa Cruz'],
            'Oriental Mindoro': ['Calapan City', 'Baco', 'Bansud', 'Bongabong', 'Bulalacao', 'Gloria', 'Mansalay', 'Naujan', 'Pinamalayan', 'Pola', 'Puerto Galera', 'Roxas', 'San Teodoro', 'Socorro', 'Victoria'],
            'Marinduque': ['Boac', 'Buenavista', 'Gasan', 'Mogpog', 'Santa Cruz', 'Torrijos'],
            'Romblon': ['Romblon', 'Banton', 'Cajidiocan', 'Calatrava', 'Concepcion', 'Corcuera', 'Ferrol', 'Looc', 'Magdiwang', 'Odiongan', 'San Agustin', 'San Andres', 'San Fernando', 'San Jose', 'Santa Fe', 'Santa Maria'],
            'Palawan': ['Puerto Princesa City', 'Aborlan', 'Bataraza', 'Brooke\'s Point', 'Busuanga', 'Cagayancillo', 'Coron', 'Culion', 'Cuyo', 'Dumaran', 'El Nido', 'Kalayaan', 'Linapacan', 'Magsaysay', 'Narra', 'Quezon', 'Rizal', 'Roxas', 'San Vicente', 'Taytay']
        }
    },
    'region-v': {
        name: 'Region V - Bicol Region',
        provinces: ['Albay', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'],
        cities: {
            'Albay': ['Legazpi City', 'Ligao City', 'Tabaco City', 'Bacacay', 'Camalig', 'Daraga', 'Guinobatan', 'Jovellar', 'Libon', 'Malilipot', 'Malinao', 'Manito', 'Oas', 'Pio Duran', 'Polangui', 'Rapu-Rapu', 'Santo Domingo', 'Tiwi'],
            'Camarines Norte': ['Daet', 'Basud', 'Capalonga', 'Jose Panganiban', 'Labo', 'Mercedes', 'Paracale', 'San Lorenzo Ruiz', 'San Vicente', 'Santa Elena', 'Talisay', 'Vinzons'],
            'Camarines Sur': ['Naga City', 'Iriga City', 'Baao', 'Balatan', 'Bato', 'Bombon', 'Buhi', 'Bula', 'Cabusao', 'Calabanga', 'Camaligan', 'Canaman', 'Gainza', 'Garchitorena', 'Goa', 'Lagonoy', 'Libmanan', 'Lupi', 'Magarao', 'Milaor', 'Minalabac', 'Ocampo', 'Pamplona', 'Pasacao', 'Pili', 'Presentacion', 'Rinconada', 'San Fernando', 'San Jose', 'Sipocot', 'Siruma', 'Tigaon', 'Tinambac'],
            'Catanduanes': ['Virac', 'Bagamanoc', 'Baras', 'Bato', 'Caramoran', 'Gigmoto', 'Pandan', 'Panganiban', 'San Andres', 'San Miguel', 'Viga'],
            'Masbate': ['Masbate City', 'Aroroy', 'Baleno', 'Balud', 'Batuan', 'Cataingan', 'Claveria', 'Dimasalang', 'Esperanza', 'Mandaon', 'Milagros', 'Mobo', 'Monreal', 'Palanas', 'Pio V. Corpuz', 'Placer', 'San Jacinto', 'San Pascual', 'Uson'],
            'Sorsogon': ['Sorsogon City', 'Bulan', 'Bulusan', 'Casiguran', 'Castilla', 'Donsol', 'Gubat', 'Irosin', 'Juban', 'Magallanes', 'Matnog', 'Pilar', 'Prieto Diaz', 'Santa Magdalena']
        }
    },
    'region-vi': {
        name: 'Region VI - Western Visayas',
        provinces: ['Aklan', 'Antique', 'Capiz', 'Guimaras', 'Iloilo', 'Negros Occidental'],
        cities: {
            'Aklan': ['Kalibo', 'Banga', 'Batan', 'Buruanga', 'Balete', 'Ibajay', 'Lezo', 'Libacao', 'Makato', 'Malay', 'Malinao', 'Nabas', 'New Washington', 'Numancia', 'Madalag'],
            'Antique': ['San Jose de Buenavista', 'Anini-y', 'Barbaza', 'Belison', 'Bugasong', 'Caluya', 'Culasi', 'Hamtic', 'Laua-an', 'Libertad', 'Pandan', 'Patnongon', 'Sibalom', 'Tibiao', 'Tobias Fornier', 'Valderrama'],
            'Capiz': ['Roxas City', 'Cuartero', 'Dao', 'Dumalag', 'Dumarao', 'Ivisan', 'Jamindan', 'Ma-ayon', 'Mambusao', 'Panay', 'Panitan', 'Pilar', 'Pontevedra', 'President Roxas', 'Sigma', 'Sapian'],
            'Guimaras': ['Jordan', 'Buenavista', 'Nueva Valencia', 'San Lorenzo', 'Sibunag'],
            'Iloilo': ['Iloilo City', 'Passi City', 'Alimodian', 'Anilao', 'Badiangan', 'Balasan', 'Banate', 'Barotac Nuevo', 'Barotac Viejo', 'Batad', 'Bingawan', 'Cabatuan', 'Calinog', 'Carles', 'Concepcion', 'Dingle', 'Duenas', 'Dumangas', 'Estancia', 'Guimbal', 'Igbaras', 'Janiuay', 'Lambunao', 'Leganes', 'Leon', 'Maasin', 'Miagao', 'Mina', 'New Lucena', 'Oton', 'Pototan', 'San Dionisio', 'San Enrique', 'San Joaquin', 'San Miguel', 'San Rafael', 'Santa Barbara', 'Sara', 'Tigbauan', 'Tubungan', 'Zarraga'],
            'Negros Occidental': ['Bacolod City', 'Bago City', 'Cadiz City', 'Escalante City', 'Himamaylan City', 'Kabankalan City', 'La Carlota City', 'Sagay City', 'San Carlos City', 'Silay City', 'Sipalay City', 'Talisay City', 'Victorias City', 'Binalbagan', 'Calatrava', 'Candoni', 'Cauayan', 'Enrique B. Magalona', 'Hinigaran', 'Hinoba-an', 'Ilog', 'Isabela', 'La Castellana', 'Manapla', 'Moises Padilla', 'Murcia', 'Pontevedra', 'Pulupandan', 'Salvador Benedicto', 'San Enrique', 'Toboso', 'Valladolid', 'Vallehermoso']
        }
    },
    'region-vii': {
        name: 'Region VII - Central Visayas',
        provinces: ['Bohol', 'Cebu', 'Siquijor', 'Negros Oriental'],
        cities: {
            'Bohol': ['Tagbilaran City', 'Alburquerque', 'Alicia', 'Anda', 'Antequera', 'Baclayon', 'Balilihan', 'Batuan', 'Bilar', 'Buenavista', 'Calape', 'Candijay', 'Carmen', 'Catigbian', 'Clarin', 'Corella', 'Cortes', 'Dagohoy', 'Danao', 'Dauis', 'Dimiao', 'Duero', 'Garcia Hernandez', 'Getafe', 'Guindulman', 'Inabanga', 'Jagna', 'Lila', 'Loay', 'Loboc', 'Loon', 'Mabini', 'Maribojoc', 'Pilar', 'Pilar', 'Panglao', 'President Carlos P. Garcia', 'Sagbayan', 'San Isidro', 'San Miguel', 'Sevilla', 'Sierra Bullones', 'Sikatuna', 'Talibon', 'Trinidad', 'Tubigon', 'Ubay', 'Valencia'],
            'Cebu': ['Cebu City', 'Mandaue City', 'Lapu-Lapu City', 'Toledo City', 'Bogo City', 'Carcar City', 'Danao City', 'Naga City', 'Talisay City', 'Argao', 'Aloguinsan', 'Alcoy', 'Alcantara', 'Alegría', 'Aloguinsan', 'Alpasa', 'Amlan', 'Argao', 'Asturias', 'Badian', 'Balamban', 'Baluarte', 'Barili', 'Bogo', 'Boljoon', 'Borbon', 'Carmen', 'Catmon', 'Cebu', 'Compostela', 'Consolacion', 'Cordova', 'Daanbantayan', 'Dalaguete', 'Danao', 'Dumanjug', 'Ginatilan', 'Liloan', 'Madridejos', 'Malabuyoc', 'Medellin', 'Minglanilla', 'Moalboal', 'Naga', 'Oslob', 'Pilar', 'Pinamungahan', 'Poro', 'Ronda', 'Samboan', 'San Fernando', 'San Remigio', 'Santa Fe', 'Santander', 'Sibonga', 'Sogod', 'Tabogon', 'Tabuelan', 'Talisay', 'Toledo', 'Tuburan', 'Tudela'],
            'Siquijor': ['Siquijor', 'Larena', 'Lazi', 'Maria', 'San Juan'],
            'Negros Oriental': ['Dumaguete City', 'Bais City', 'Bayawan City', 'Canlaon City', 'Dumaguete City', 'Guihulngan City', 'Tanjay City', 'Amlan', 'Ayungon', 'Bacong', 'Basay', 'Bindoy', 'Dauin', 'Jimalalud', 'La Libertad', 'Mabinay', 'Manjuyod', 'Pamplona', 'San Jose', 'Santa Catalina', 'Siaton', 'Sibulan', 'Tayasan', 'Valencia', 'Vallehermoso', 'Zamboanguita']
        }
    },
    'region-viii': {
        name: 'Region VIII - Eastern Visayas',
        provinces: ['Biliran', 'Eastern Samar', 'Leyte', 'Northern Samar', 'Samar', 'Southern Leyte'],
        cities: {
            'Biliran': ['Naval', 'Almeria', 'Biliran', 'Cabucgayan', 'Caibiran', 'Culaba', 'Kawayan', 'Maripipi', 'Naval'],
            'Eastern Samar': ['Borongan City', 'Arteche', 'Balangiga', 'Balangkayan', 'Borongan', 'Can-avid', 'Dolores', 'General MacArthur', 'Giporlos', 'Guiuan', 'Hernani', 'Jipapad', 'Llorente', 'Maslog', 'Maydolong', 'Mercedes', 'Oras', 'Quinapondan', 'Salcedo', 'San Julian', 'San Policarpo', 'Sulat', 'Taft'],
            'Leyte': ['Tacloban City', 'Baybay City', 'Ormoc City', 'Abuyog', 'Alangalang', 'Babatngon', 'Barugo', 'Bato', 'Burauen', 'Calubian', 'Capoocan', 'Carigara', 'Dagami', 'Dulag', 'Hilongos', 'Hindang', 'Inopacan', 'Isabel', 'Jaro', 'Jaro', 'Jaro', 'Kananga', 'La Paz', 'Leyte', 'MacArthur', 'Mahaplag', 'Matag-ob', 'Matalom', 'Mayorga', 'Merida', 'Palo', 'Palompon', 'Pastrana', 'San Isidro', 'San Miguel', 'Santa Fe', 'Tabango', 'Tabontabon', 'Tanauan', 'Tolosa', 'Tunga', 'Villaba'],
            'Northern Samar': ['Catarman', 'Allen', 'Biri', 'Bobon', 'Capul', 'Catarman', 'Catubig', 'Gamay', 'Laoang', 'Lapinig', 'Lavezares', 'Mapanas', 'Mondragon', 'Palapag', 'Pambujan', 'Rosario', 'San Antonio', 'San Isidro', 'San Jose', 'San Roque', 'San Vicente', 'Silvino Lubos', 'Victoria'],
            'Samar': ['Catbalogan City', 'Calbayog City', 'Almagro', 'Basey', 'Calbiga', 'Daram', 'Gandara', 'Hinabangan', 'Jiabong', 'Marabut', 'Matuguinao', 'Motiong', 'Pagsanghan', 'Paranas', 'Pinabacdao', 'San Jorge', 'San Sebastian', 'Santa Margarita', 'Santa Rita', 'Santo Niño', 'Tagapul-an', 'Talalora', 'Tarangnan', 'Villareal', 'Zumarraga'],
            'Southern Leyte': ['Maasin City', 'Anahawan', 'Bontoc', 'Hinunangan', 'Hinundayan', 'Libagon', 'Liloan', 'Limasawa', 'Macrohon', 'Malitbog', 'Padre Burgos', 'Pintuyan', 'Saint Bernard', 'San Francisco', 'San Juan', 'San Ricardo', 'Silago', 'Sogod', 'Tomas Oppus']
        }
    },
    'region-ix': {
        name: 'Region IX - Zamboanga Peninsula',
        provinces: ['Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay'],
        cities: {
            'Zamboanga del Norte': ['Dipolog City', 'Dapitan City', 'Baliguian', 'Basilisa', 'Bukidnon', 'Dapitan', 'Dipolog', 'Godod', 'Gutalac', 'Jose Dalman', 'Katipunan', 'La Libertad', 'Labason', 'Liloy', 'Manukan', 'Mutia', 'Piñan', 'Polanco', 'President Manuel A. Roxas', 'Rizal', 'Salug', 'Sergio Osmeña Sr.', 'Siayan', 'Sibuco', 'Sibutad', 'Sindangan', 'Siocon', 'Sirawai', 'Tampilisan'],
            'Zamboanga del Sur': ['Zamboanga City', 'Pagadian City', 'Aurora', 'Bayog', 'Dimataling', 'Dinas', 'Dumalinao', 'Dumingag', 'Guipos', 'Josefina', 'Kumalarang', 'Labangan', 'Lakewood', 'Lapuyan', 'Mahayag', 'Margosatubig', 'Midsalip', 'Molave', 'Pitogo', 'Ramon Magsaysay', 'San Miguel', 'San Pablo', 'Tabina', 'Tambulig', 'Tukuran', 'Vincenzo A. Sagun'],
            'Zamboanga Sibugay': ['Ipil', 'Alicia', 'Buug', 'Diplahan', 'Imelda', 'Kabasalan', 'Mabuhay', 'Malangas', 'Naga', 'Olutanga', 'Payao', 'Roseller T. Lim', 'Siay', 'Talusan', 'Titay', 'Tungawan']
        }
    },
    'region-x': {
        name: 'Region X - Northern Mindanao',
        provinces: ['Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental'],
        cities: {
            'Bukidnon': ['Valencia City', 'Malaybalay City', 'Baungon', 'Cabanglasan', 'Damulog', 'Dangcagan', 'Don Carlos', 'Impasugong', 'Kadingilan', 'Kalilangan', 'Kibawe', 'Kitaotao', 'Lantapan', 'Libona', 'Malitbog', 'Manolo Fortich', 'Maramag', 'Pangantucan', 'Quezon', 'San Fernando', 'Sumilao', 'Talakag', 'Tangub City'],
            'Camiguin': ['Mambajao', 'Catarman', 'Guinsiliban', 'Mahinog', 'Sagay'],
            'Lanao del Norte': ['Iligan City', 'Bacolod', 'Baloi', 'Baroy', 'Kapatagan', 'Lala', 'Linamon', 'Masiu', 'Nunungan', 'Pantao Ragat', 'Pantar', 'Poona Piagapo', 'Pualas', 'Sultan Naga Dimaporo', 'Tagoloan', 'Tangcal', 'Tubod'],
            'Misamis Occidental': ['Oroquieta City', 'Ozamiz City', 'Tangub City', 'Aloran', 'Baliangao', 'Bonifacio', 'Calamba', 'Clarin', 'Concepcion', 'Don Victoriano Chiongbian', 'Jimenez', 'Lopez Jaena', 'Panaon', 'Plaridel', 'Sapang Dalaga', 'Sinacaban', 'Tudela'],
            'Misamis Oriental': ['Cagayan de Oro City', 'El Salvador City', 'Gingoog City', 'Balingasag', 'Balingoan', 'Binuangan', 'Claveria', 'Cagayan de Oro', 'Gitagum', 'Initao', 'Jasaan', 'Kinoguitan', 'Lagonglong', 'Lugait', 'Magsaysay', 'Medina', 'Naawan', 'Opol', 'Salay', 'Sugbongcogon', 'Tagoloan', 'Talisay', 'Villanueva']
        }
    },
    'region-xi': {
        name: 'Region XI - Davao Region',
        provinces: ['Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental'],
        cities: {
            'Davao de Oro': ['Nabunturan', 'Compostela', 'Laak', 'Mabini', 'Maco', 'Maragusan', 'Mawab', 'Monkayo', 'Montevista', 'New Bataan', 'Pantukan'],
            'Davao del Norte': ['Tagum City', 'Panabo City', 'Samal City', 'Asuncion', 'Braulio E. Dujali', 'Carmen', 'Kapalong', 'New Corella', 'San Isidro', 'Santo Tomas', 'Talaingod'],
            'Davao del Sur': ['Davao City', 'Digos City', 'Bansalan', 'Don Marcelino', 'Hagonoy', 'Jose Abad Santos', 'Kiblawan', 'Magsaysay', 'Malalag', 'Matanao', 'Padada', 'Santa Cruz', 'Sulop'],
            'Davao Occidental': ['Malita', 'Don Marcelino', 'Jose Abad Santos', 'Sarangani'],
            'Davao Oriental': ['Mati City', 'Baganga', 'Boston', 'Caraga', 'Cateel', 'Governor Generoso', 'Lupon', 'Manay', 'San Isidro', 'Tarragona']
        }
    },
    'region-xii': {
        name: 'Region XII - SOCCSKSARGEN',
        provinces: ['South Cotabato', 'Cotabato', 'Sultan Kudarat', 'Sarangani', 'North Cotabato'],
        cities: {
            'South Cotabato': ['General Santos City', 'Koronadal City', 'Banga', 'Lake Sebu', 'Norala', 'Polomolok', 'Santo Niño', 'Surallah', 'T\'boli', 'Tampakan', 'Tantangan', 'Tupi'],
            'Cotabato': ['Kidapawan City', 'Alamada', 'Aleosan', 'Antipas', 'Arakan', 'Banisilan', 'Carmen', 'Kabacan', 'Libungan', 'M\'lang', 'Midsayap', 'Makilala', 'Matalam', 'Pigkawayan', 'Pikit', 'President Roxas', 'Tulunan'],
            'Sultan Kudarat': ['Tacurong City', 'Bagumbayan', 'Columbio', 'Esperanza', 'Isulan', 'Kalamansig', 'Lambayong', 'Lebak', 'Lutayan', 'Palimbang', 'President Quirino', 'Senator Ninoy Aquino', 'Sultan Kudarat', 'Tulungan'],
            'Sarangani': ['General Santos City', 'Alabel', 'Glan', 'Kiamba', 'Maasim', 'Maitum', 'Malapatan', 'Malungon'],
            'North Cotabato': ['Kidapawan City', 'Alamada', 'Aleosan', 'Antipas', 'Arakan', 'Banisilan', 'Carmen', 'Kabacan', 'Libungan', 'M\'lang', 'Midsayap', 'Makilala', 'Matalam', 'Pigkawayan', 'Pikit', 'President Roxas', 'Tulunan']
        }
    },
    'region-xiii': {
        name: 'Region XIII - Caraga',
        provinces: ['Agusan del Norte', 'Agusan del Sur', 'Dinagat Islands', 'Surigao del Norte', 'Surigao del Sur'],
        cities: {
            'Agusan del Norte': ['Butuan City', 'Cabadbaran City', 'Buenavista', 'Carmen', 'Jabonga', 'Kitcharao', 'Las Nieves', 'Magallanes', 'Nasipit', 'Remedios T. Romualdez', 'Santiago', 'Tubay'],
            'Agusan del Sur': ['Prosperidad', 'Bayugan City', 'Bunawan', 'Esperanza', 'La Paz', 'Loreto', 'Rosario', 'San Francisco', 'San Luis', 'Santa Jose', 'Sibagat', 'Talacogon', 'Trento', 'Veruela'],
            'Dinagat Islands': ['Basilisa', 'Cagdianao', 'Dinagat', 'Libjo', 'Loreto', 'San Jose', 'Tubajon'],
            'Surigao del Norte': ['Surigao City', 'Alegria', 'Bacuag', 'Burgos', 'Claver', 'Dapa', 'Del Carmen', 'General Luna', 'Gigaquit', 'Mainit', 'Malimono', 'Pilar', 'Placer', 'San Benito', 'San Francisco', 'San Isidro', 'Santa Monica', 'Sison', 'Tagana-an', 'Tubod'],
            'Surigao del Sur': ['Tandag City', 'Bislig City', 'Barobo', 'Cagwait', 'Cantilan', 'Carmen', 'Cortes', 'Hinatuan', 'Lanuza', 'Lianga', 'Lingig', 'Madrid', 'Marihatag', 'San Agustin', 'San Miguel', 'Tagbina', 'Tago']
        }
    },
    armm: {
        name: 'ARMM - Autonomous Region in Muslim Mindanao',
        provinces: ['Basilan', 'Lanao del Sur', 'Maguindanao', 'Sulu', 'Tawi-Tawi'],
        cities: {
            'Basilan': ['Lamitan City', 'Isabela City', 'Akbar', 'Al-Barka', 'Hadji Mohammad Ajul', 'Hadji Muhtamad', 'Lantawan', 'Maluso', 'Sumisip', 'Tipo-Tipo', 'Tuburan', 'Ungkaya Pukan'],
            'Lanao del Sur': ['Marawi City', 'Bacolod-Kalawi', 'Balabagan', 'Balindong', 'Bayang', 'Binidayan', 'Bubong', 'Bumbaran', 'Butig', 'Calanogas', 'Ditsaan-Ramain', 'Ganassi', 'Kapai', 'Kapatagan', 'Lumba-Bayabao', 'Lumbaca-Unayan', 'Lumbayanague', 'Madalum', 'Madamba', 'Maguing', 'Marantao', 'Marogong', 'Masiu', 'Piagapo', 'Poona Bayabao', 'Pualas', 'Sultan Dumalondong', 'Sultan Gumander', 'Tagoloan II', 'Tamparan', 'Taraka', 'Tubaran', 'Tugaya', 'Wao'],
            'Maguindanao': ['Cotabato City', 'Ampatuan', 'Barira', 'Buldon', 'Buluan', 'Datu Abdullah Sangki', 'Datu Anggal Midtimbang', 'Datu Blah T. Sinsuat', 'Datu Hoffer Ampatuan', 'Datu Odin Sinsuat', 'Datu Paglas', 'Datu Piang', 'Datu Salibo', 'Datu Saudi-Ampatuan', 'Datu Unsay', 'Guindulungan', 'Kabuntalan', 'Mamasapano', 'Mangudadatu', 'Matanog', 'Northern Kabuntalan', 'Pagalungan', 'Paglat', 'Pandag', 'Parang', 'Rajah Buayan', 'Shariff Aguak', 'Shariff Saydona Mustapha', 'South Upi', 'Sultan Kudarat', 'Sultan sa Barongis', 'Talayan', 'Talitay', 'Upi'],
            'Sulu': ['Jolo', 'Hadji Panglima Tahil', 'Indanan', 'Kalingalan Caluang', 'Lugus', 'Luuk', 'Maimbung', 'Omar', 'Pandami', 'Panglima Estino', 'Pangutaran', 'Parang', 'Pata', 'Patikul', 'Siasi', 'Talipao', 'Tapul'],
            'Tawi-Tawi': ['Bongao', 'Mapun', 'Panglima Sugala', 'Sapa-Sapa', 'Sibutu', 'Simunul', 'Sitangkai', 'South Ubian', 'Tandubas', 'Turtle Islands', 'Unisan']
        }
    }
};

// Common barangays list (sample for demo)
const commonBarangays = [
    'Poblacion', 'San Jose', 'San Isidro', 'San Miguel', 'San Antonio', 'San Pedro', 'San Roque',
    'San Juan', 'Santa Cruz', 'Santa Maria', 'Santo Niño', 'Santo Tomas', 'San Carlos', 'San Francisco',
    'San Luis', 'San Marcos', 'San Mateo', 'San Nicolas', 'San Pablo', 'San Rafael', 'San Vicente',
    'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5', 'Barangay 6', 'Barangay 7',
    'Barangay 8', 'Barangay 9', 'Barangay 10', 'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5',
    'North Poblacion', 'South Poblacion', 'East Poblacion', 'West Poblacion', 'Central Poblacion'
];

// Initialize Geographic Dropdowns
function initializeGeographicDropdowns() {
    const regionSelect = document.getElementById('modalRegion');
    const provinceSelect = document.getElementById('modalProvince');
    const citySelect = document.getElementById('modalCity');
    const barangaySelect = document.getElementById('modalBarangay');

    if (!regionSelect || !provinceSelect || !citySelect || !barangaySelect) {
        return;
    }

    regionSelect.addEventListener('change', function() {
        populateProvinces(this.value);
        provinceSelect.value = '';
        citySelect.innerHTML = '<option value="">-- Select Town/Municipality/City --</option>';
        barangaySelect.innerHTML = '<option value="">-- Select Barangay --</option>';
    });

    provinceSelect.addEventListener('change', function() {
        populateCities(this.value);
        citySelect.value = '';
        barangaySelect.innerHTML = '<option value="">-- Select Barangay --</option>';
    });

    citySelect.addEventListener('change', function() {
        populateBarangays();
        barangaySelect.value = '';
    });
}

// Populate Provinces based on Region
function populateProvinces(regionCode) {
    const provinceSelect = document.getElementById('modalProvince');
    if (!provinceSelect) return;

    provinceSelect.innerHTML = '<option value="">-- Select Province --</option>';

    if (regionCode && philippineData[regionCode]) {
        const provinces = philippineData[regionCode].provinces;
        provinces.forEach(province => {
            const option = document.createElement('option');
            option.value = province;
            option.textContent = province;
            provinceSelect.appendChild(option);
        });
    }
}

// Populate Cities based on Province
function populateCities(province) {
    const citySelect = document.getElementById('modalCity');
    if (!citySelect) return;

    citySelect.innerHTML = '<option value="">-- Select Town/Municipality/City --</option>';

    const regionSelect = document.getElementById('modalRegion');
    const regionCode = regionSelect ? regionSelect.value : null;

    if (province && regionCode && philippineData[regionCode] && philippineData[regionCode].cities[province]) {
        const cities = philippineData[regionCode].cities[province];
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    }
}

// Populate Barangays
function populateBarangays() {
    const barangaySelect = document.getElementById('modalBarangay');
    if (!barangaySelect) return;

    barangaySelect.innerHTML = '<option value="">-- Select Barangay --</option>';

    commonBarangays.forEach(barangay => {
        const option = document.createElement('option');
        option.value = barangay;
        option.textContent = barangay;
        barangaySelect.appendChild(option);
    });
}

// Update City Datalist for searchable dropdown
function updateCityDatalist() {
    const citySelect = document.getElementById('modalCity');
    const provinceSelect = document.getElementById('modalProvince');
    const regionSelect = document.getElementById('modalRegion');

    if (!citySelect) return;

    // Remove existing datalist if any
    let datalist = document.getElementById('cityDatalist');
    if (datalist) datalist.remove();

    // Create new datalist
    datalist = document.createElement('datalist');
    datalist.id = 'cityDatalist';
    citySelect.setAttribute('list', 'cityDatalist');

    const regionCode = regionSelect ? regionSelect.value : null;
    const province = provinceSelect ? provinceSelect.value : null;

    if (province && regionCode && philippineData[regionCode] && philippineData[regionCode].cities[province]) {
        const cities = philippineData[regionCode].cities[province];
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            datalist.appendChild(option);
        });
    }

    document.body.appendChild(datalist);
}

// Update Barangay Datalist for searchable dropdown
function updateBarangayDatalist() {
    const barangaySelect = document.getElementById('modalBarangay');
    if (!barangaySelect) return;

    // Remove existing datalist if any
    let datalist = document.getElementById('barangayDatalist');
    if (datalist) datalist.remove();

    // Create new datalist
    datalist = document.createElement('datalist');
    datalist.id = 'barangayDatalist';
    barangaySelect.setAttribute('list', 'barangayDatalist');

    commonBarangays.forEach(barangay => {
        const option = document.createElement('option');
        option.value = barangay;
        datalist.appendChild(option);
    });

    document.body.appendChild(datalist);
}

// Update Region Datalist for searchable dropdown
function updateRegionDatalist() {
    const regionSelect = document.getElementById('modalRegion');
    if (!regionSelect) return;

    // Remove existing datalist if any
    let datalist = document.getElementById('regionDatalist');
    if (datalist) datalist.remove();

    // Create new datalist
    datalist = document.createElement('datalist');
    datalist.id = 'regionDatalist';
    regionSelect.setAttribute('list', 'regionDatalist');

    Object.keys(philippineData).forEach(regionCode => {
        const option = document.createElement('option');
        option.value = philippineData[regionCode].name;
        option.setAttribute('data-code', regionCode);
        datalist.appendChild(option);
    });

    document.body.appendChild(datalist);
}

// Update Province Datalist for searchable dropdown
function updateProvinceDatalist() {
    const provinceSelect = document.getElementById('modalProvince');
    const regionSelect = document.getElementById('modalRegion');

    if (!provinceSelect) return;

    // Remove existing datalist if any
    let datalist = document.getElementById('provinceDatalist');
    if (datalist) datalist.remove();

    // Create new datalist
    datalist = document.createElement('datalist');
    datalist.id = 'provinceDatalist';
    provinceSelect.setAttribute('list', 'provinceDatalist');

    const regionCode = regionSelect ? regionSelect.value : null;

    if (regionCode && philippineData[regionCode]) {
        const provinces = philippineData[regionCode].provinces;
        provinces.forEach(province => {
            const option = document.createElement('option');
            option.value = province;
            datalist.appendChild(option);
        });
    }

    document.body.appendChild(datalist);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeGeographicDropdowns();
    populateBarangays();
    updateRegionDatalist();
    updateProvinceDatalist();
});

// Scroll to Top Button
const scrollTopBtn = document.getElementById('scrollTopBtn');
const tabNavigation = document.getElementById('tabNavigation');

window.addEventListener('scroll', () => {
    if (scrollTopBtn) {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.remove('translate-y-20', 'opacity-0');
            scrollTopBtn.classList.add('translate-y-0', 'opacity-100');
        } else {
            scrollTopBtn.classList.add('translate-y-20', 'opacity-0');
            scrollTopBtn.classList.remove('translate-y-0', 'opacity-100');
        }
    }

    // Tab navigation transparency on scroll
    if (tabNavigation) {
        if (window.scrollY > 50) {
            tabNavigation.classList.remove('bg-transparent', 'shadow-none');
            tabNavigation.classList.add('bg-white', 'shadow-md');
        } else {
            tabNavigation.classList.add('bg-transparent', 'shadow-none');
            tabNavigation.classList.remove('bg-white', 'shadow-md');
        }
    }
});

// Student Dashboard Functions
function updateStudentDashboard(enrollmentData) {
    // Update status workflow
    updateDashboardStatusWorkflow(enrollmentData.status);
    
    // Update academic info
    document.getElementById('dashboardLevel').textContent = enrollmentData.level || 'Senior High';
    document.getElementById('dashboardStrand').textContent = enrollmentData.strand || 'STEM Strand';
    document.getElementById('dashLevel').textContent = enrollmentData.level || 'Senior High';
    document.getElementById('dashGradeStrand').textContent = enrollmentData.strand || 'STEM';
    document.getElementById('dashLRN').textContent = enrollmentData.lrn || '123456789012';
    document.getElementById('dashPreviousSchool').textContent = enrollmentData.previousSchool || 'Biringan High School';
    
    // Update voucher status
    document.getElementById('dashboardVoucherStatus').textContent = enrollmentData.voucherStatus || 'Pending';
    document.getElementById('dashboardVoucherType').textContent = enrollmentData.voucherType || 'Public School Graduate';
    document.getElementById('dashboardVoucherEligibility').textContent = enrollmentData.voucherType || 'Public School Graduate';
    document.getElementById('dashboardVoucherVerification').textContent = enrollmentData.voucherVerification || 'Under Verification';
    
    // Update payment summary based on voucher
    if (enrollmentData.voucherEligible) {
        document.getElementById('dashboardTuition').textContent = '₱25,000';
        document.getElementById('dashboardUniformRow').style.display = 'flex';
        document.getElementById('dashboardVoucherRow').style.display = 'flex';
        document.getElementById('dashboardTotal').textContent = '₱3,000';
        document.getElementById('dashboardPaymentStatus').textContent = '₱3,000';
    } else {
        document.getElementById('dashboardTuition').textContent = '₱25,000';
        document.getElementById('dashboardUniformRow').style.display = 'none';
        document.getElementById('dashboardVoucherRow').style.display = 'none';
        document.getElementById('dashboardTotal').textContent = '₱27,200';
        document.getElementById('dashboardPaymentStatus').textContent = '₱27,200';
    }
    
    // Show admin requests if any
    if (enrollmentData.adminRequest) {
        document.getElementById('adminRequestsSection').style.display = 'block';
        document.getElementById('adminRequestMessage').textContent = enrollmentData.adminRequest;
    }
}

function updateDashboardStatusWorkflow(status) {
    const step1 = document.querySelector('#dashboard .w-8.bg-\\[\\#007dfe\\]');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');
    const statusBar = document.getElementById('statusBar');
    const statusPercent = document.getElementById('statusPercent');
    const currentStatusText = document.getElementById('currentStatusText');
    
    // Reset all steps
    step1.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
    step2.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
    step3.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
    step4.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
    
    if (status === 'submitted') {
        step1.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step1.textContent = '✓';
        statusBar.style.width = '25%';
        statusPercent.textContent = '25%';
        currentStatusText.textContent = 'Current Status: Submitted';
    } else if (status === 'under-review') {
        step1.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step1.textContent = '✓';
        step2.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step2.textContent = '✓';
        statusBar.style.width = '50%';
        statusPercent.textContent = '50%';
        currentStatusText.textContent = 'Current Status: Under Review';
    } else if (status === 'approved') {
        step1.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step1.textContent = '✓';
        step2.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step2.textContent = '✓';
        step3.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step3.textContent = '✓';
        statusBar.style.width = '75%';
        statusPercent.textContent = '75%';
        currentStatusText.textContent = 'Current Status: Approved';
    } else if (status === 'enrolled') {
        step1.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step1.textContent = '✓';
        step2.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step2.textContent = '✓';
        step3.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step3.textContent = '✓';
        step4.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step4.textContent = '✓';
        statusBar.style.width = '100%';
        statusPercent.textContent = '100%';
        currentStatusText.textContent = 'Current Status: Enrolled';
    } else if (status === 'rejected') {
        step1.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step1.textContent = '✓';
        step2.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step2.textContent = '✓';
        step3.className = 'w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step3.textContent = '✗';
        statusBar.style.width = '50%';
        statusPercent.textContent = '50%';
        currentStatusText.textContent = 'Current Status: Rejected';
    }
}

// Load mock enrollment data for student dashboard
function loadStudentDashboard() {
    // Mock data - in real implementation, this would come from backend
    const mockEnrollmentData = {
        status: 'submitted',
        level: 'Senior High',
        strand: 'STEM',
        lrn: '123456789012',
        previousSchool: 'Biringan High School',
        voucherStatus: 'Pending',
        voucherType: 'Public School Graduate',
        voucherVerification: 'Under Verification',
        voucherEligible: true,
        adminRequest: null
    };
    
    updateStudentDashboard(mockEnrollmentData);
    loadGrades();
    loadSchedule();
}

// Load grades data
function loadGrades() {
    const gradesTableBody = document.getElementById('gradesTableBody');
    
    // Mock grades data
    const mockGrades = [
        { subject: 'Mathematics', q1: 85, q2: 88, q3: 90, q4: 87, final: 87.5, remarks: 'Passed' },
        { subject: 'Science', q1: 90, q2: 92, q3: 89, q4: 91, final: 90.5, remarks: 'Passed' },
        { subject: 'English', q1: 88, q2: 85, q3: 87, q4: 89, final: 87.25, remarks: 'Passed' },
        { subject: 'Filipino', q1: 92, q2: 90, q3: 91, q4: 93, final: 91.5, remarks: 'Passed' },
        { subject: 'Physical Education', q1: 95, q2: 94, q3: 95, q4: 96, final: 95, remarks: 'Passed' },
        { subject: 'Computer Science', q1: 89, q2: 91, q3: 90, q4: 92, final: 90.5, remarks: 'Passed' }
    ];
    
    gradesTableBody.innerHTML = mockGrades.map(grade => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-4 py-3 font-medium">${grade.subject}</td>
            <td class="px-4 py-3 text-center">${grade.q1}</td>
            <td class="px-4 py-3 text-center">${grade.q2}</td>
            <td class="px-4 py-3 text-center">${grade.q3}</td>
            <td class="px-4 py-3 text-center">${grade.q4}</td>
            <td class="px-4 py-3 text-center font-bold">${grade.final}</td>
            <td class="px-4 py-3 text-center">
                <span class="px-2 py-1 rounded-full text-xs font-semibold ${grade.final >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${grade.remarks}
                </span>
            </td>
        </tr>
    `).join('');
}

// Load schedule data
function loadSchedule() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    // Mock schedule data
    const mockSchedule = {
        monday: [
            { subject: 'Mathematics', time: '7:30 AM - 9:00 AM', room: 'Room 101' },
            { subject: 'Science', time: '9:15 AM - 10:45 AM', room: 'Lab 201' }
        ],
        tuesday: [
            { subject: 'English', time: '7:30 AM - 9:00 AM', room: 'Room 102' },
            { subject: 'Filipino', time: '9:15 AM - 10:45 AM', room: 'Room 103' },
            { subject: 'Computer Science', time: '1:00 PM - 2:30 PM', room: 'Lab 301' }
        ],
        wednesday: [
            { subject: 'Mathematics', time: '7:30 AM - 9:00 AM', room: 'Room 101' },
            { subject: 'Physical Education', time: '2:00 PM - 3:30 PM', room: 'Gym' }
        ],
        thursday: [
            { subject: 'Science', time: '7:30 AM - 9:00 AM', room: 'Lab 201' },
            { subject: 'English', time: '9:15 AM - 10:45 AM', room: 'Room 102' }
        ],
        friday: [
            { subject: 'Filipino', time: '7:30 AM - 9:00 AM', room: 'Room 103' },
            { subject: 'Computer Science', time: '9:15 AM - 10:45 AM', room: 'Lab 301' }
        ]
    };
    
    days.forEach(day => {
        const daySchedule = document.getElementById(day + 'Schedule');
        const classes = mockSchedule[day] || [];
        
        if (classes.length > 0) {
            daySchedule.innerHTML = classes.map(cls => `
                <div class="bg-blue-50 rounded p-2 text-xs">
                    <div class="font-semibold text-gray-800">${cls.subject}</div>
                    <div class="text-gray-600">${cls.time}</div>
                    <div class="text-gray-500">${cls.room}</div>
                </div>
            `).join('');
        } else {
            daySchedule.innerHTML = '<p class="text-sm text-gray-500 text-center">No classes</p>';
        }
    });
}

// Load student dashboard when dashboard tab is shown
const originalSwitchTab = switchTab;
switchTab = function(tabName) {
    originalSwitchTab(tabName);
    if (tabName === 'dashboard') {
        loadStudentDashboard();
    }
};

// Admin Enrollment Review Functions
function openEnrollmentReviewModal(enrollmentId) {
    const modal = document.getElementById('enrollmentReviewModal');
    modal.classList.remove('hidden');
    
    // Store the current enrollment ID for approval/rejection
    modal.dataset.enrollmentId = enrollmentId;
    
    // Fetch student data from API
    fetch(`php/api.php?action=students`)
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                const student = result.data.find(s => s.id == enrollmentId);
                if (student) {
                    // Populate modal with actual student data
                    document.getElementById('reviewName').textContent = `${student.first_name} ${student.last_name} ${student.middle_name || ''}`;
                    document.getElementById('reviewDob').textContent = student.dob;
                    document.getElementById('reviewGender').textContent = student.gender;
                    document.getElementById('reviewCivilStatus').textContent = student.civil_status;
                    document.getElementById('reviewNationality').textContent = student.nationality;
                    document.getElementById('reviewReligion').textContent = student.religion;
                    document.getElementById('reviewAddress').textContent = student.address;
                    document.getElementById('reviewMobile').textContent = student.phone;
                    document.getElementById('reviewEmail').textContent = student.email;
                    
                    document.getElementById('reviewElementary').textContent = student.elementary_school || 'N/A';
                    document.getElementById('reviewElementaryYear').textContent = student.elementary_year_graduated || 'N/A';
                    document.getElementById('reviewLRN').textContent = student.lrn || 'N/A';
                    document.getElementById('reviewHighSchool').textContent = student.high_school || 'N/A';
                    document.getElementById('reviewHighSchoolYear').textContent = student.high_school_year_graduated || 'N/A';
                    const reviewGrade10 = document.getElementById('reviewGrade10Section');
                    if (reviewGrade10) reviewGrade10.textContent = student.grade10_section || 'N/A';
                    const reviewSeniorHigh = document.getElementById('reviewSeniorHigh');
                    if (reviewSeniorHigh) reviewSeniorHigh.textContent = student.senior_high_school || 'N/A';
                    document.getElementById('reviewPublicSchool').textContent = student.public_school_graduate || 'N/A';
                    
                    document.getElementById('reviewLevel').textContent = student.level || 'N/A';
                    document.getElementById('reviewGradeStrand').textContent = student.strand || 'N/A';
                    document.getElementById('reviewVoucherEligibility').textContent = student.voucher_eligibility || 'Not Eligible';
                    
                    // Update payment summary based on voucher eligibility
                    if (student.voucher_eligibility && student.voucher_eligibility.includes('Eligible')) {
                        document.getElementById('reviewTuition').textContent = '₱25,000';
                        document.getElementById('reviewUniformRow').style.display = 'flex';
                        document.getElementById('reviewVoucherRow').style.display = 'flex';
                        document.getElementById('reviewTotal').textContent = '₱3,000';
                    } else {
                        document.getElementById('reviewTuition').textContent = '₱25,000';
                        document.getElementById('reviewUniformRow').style.display = 'flex';
                        document.getElementById('reviewVoucherRow').style.display = 'none';
                        document.getElementById('reviewTotal').textContent = '₱28,000';
                    }
                    
                    // Update status workflow based on current status
                    updateStatusWorkflow(student.status === 'pending' ? 'under-review' : student.status);
                }
            }
        })
        .catch(error => {
            console.error('Error fetching student data:', error);
            // Fallback to mock data
            document.getElementById('reviewName').textContent = 'Juan Dela Cruz';
            document.getElementById('reviewDob').textContent = '2008-05-15';
            document.getElementById('reviewGender').textContent = 'Male';
            document.getElementById('reviewCivilStatus').textContent = 'Single';
            document.getElementById('reviewNationality').textContent = 'Filipino';
            document.getElementById('reviewReligion').textContent = 'Roman Catholic';
            document.getElementById('reviewAddress').textContent = '123 Main St, Biringan City';
            document.getElementById('reviewMobile').textContent = '09123456789';
            document.getElementById('reviewEmail').textContent = 'juan@example.com';
            
            document.getElementById('reviewElementary').textContent = 'Biringan Elementary School';
            document.getElementById('reviewElementaryYear').textContent = '2020';
            document.getElementById('reviewLRN').textContent = '123456789012';
            document.getElementById('reviewHighSchool').textContent = 'Biringan High School';
            document.getElementById('reviewHighSchoolYear').textContent = '2024';
            const reviewGrade10 = document.getElementById('reviewGrade10Section');
            if (reviewGrade10) reviewGrade10.textContent = 'Section A';
            const reviewSeniorHigh = document.getElementById('reviewSeniorHigh');
            if (reviewSeniorHigh) reviewSeniorHigh.textContent = 'N/A';
            document.getElementById('reviewPublicSchool').textContent = 'Yes';
            
            document.getElementById('reviewLevel').textContent = 'Senior High';
            document.getElementById('reviewGradeStrand').textContent = 'STEM';
            document.getElementById('reviewVoucherEligibility').textContent = 'From Public School (Voucher Eligible)';
            
            document.getElementById('reviewTuition').textContent = '₱25,000';
            document.getElementById('reviewUniformRow').style.display = 'flex';
            document.getElementById('reviewVoucherRow').style.display = 'flex';
            document.getElementById('reviewTotal').textContent = '₱3,000';
            
            updateStatusWorkflow('under-review');
        });
}

function closeEnrollmentReviewModal() {
    const modal = document.getElementById('enrollmentReviewModal');
    modal.classList.add('hidden');
}

function updateStatusWorkflow(status) {
    const step1 = document.getElementById('statusStep1');
    const step2 = document.getElementById('statusStep2');
    const step3 = document.getElementById('statusStep3');
    const statusText = document.getElementById('currentStatusText');
    
    // Reset all steps
    step1.className = 'flex-1 text-center p-2 rounded bg-gray-200 text-gray-600';
    step2.className = 'flex-1 text-center p-2 rounded bg-gray-200 text-gray-600';
    step3.className = 'flex-1 text-center p-2 rounded bg-gray-200 text-gray-600';
    
    if (status === 'submitted') {
        step1.className = 'flex-1 text-center p-2 rounded bg-yellow-500 text-white';
        statusText.textContent = 'Current Status: Submitted';
    } else if (status === 'under-review') {
        step1.className = 'flex-1 text-center p-2 rounded bg-green-500 text-white';
        step2.className = 'flex-1 text-center p-2 rounded bg-blue-500 text-white';
        statusText.textContent = 'Current Status: Under Review';
    } else if (status === 'approved') {
        step1.className = 'flex-1 text-center p-2 rounded bg-green-500 text-white';
        step2.className = 'flex-1 text-center p-2 rounded bg-green-500 text-white';
        step3.className = 'flex-1 text-center p-2 rounded bg-green-500 text-white';
        statusText.textContent = 'Current Status: Approved';
    } else if (status === 'rejected') {
        step1.className = 'flex-1 text-center p-2 rounded bg-green-500 text-white';
        step2.className = 'flex-1 text-center p-2 rounded bg-green-500 text-white';
        step3.className = 'flex-1 text-center p-2 rounded bg-red-500 text-white';
        statusText.textContent = 'Current Status: Rejected';
    }
}

function approveEnrollment() {
    // Verify voucher checkboxes are checked if applicable
    const voucherEligibility = document.getElementById('reviewVoucherEligibility').textContent;
    if (voucherEligibility.includes('Voucher Eligible')) {
        const verifyPublicSchool = document.getElementById('verifyPublicSchool').checked;
        const verifyLRN = document.getElementById('verifyLRN').checked;
        const verifyPreviousSchool = document.getElementById('verifyPreviousSchool').checked;
        
        if (!verifyPublicSchool || !verifyLRN || !verifyPreviousSchool) {
            Swal.fire({
                icon: 'error',
                title: 'Verification Required',
                text: 'Please complete all voucher verification checkboxes before approving.',
                confirmButtonColor: '#3085d6'
            });
            return;
        }
    }
    
    // Get current student ID from modal dataset
    const modal = document.getElementById('enrollmentReviewModal');
    const currentStudentId = modal.dataset.enrollmentId;
    
    if (!currentStudentId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Student ID not found. Please try again.',
            confirmButtonColor: '#3085d6'
        });
        return;
    }
    
    // Call API to update status
    fetch('php/api.php?action=updateStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: currentStudentId,
            status: 'approved'
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            updateStatusWorkflow('approved');
            Swal.fire({
                icon: 'success',
                title: 'Approved!',
                html: `
                    <p>Enrollment approved successfully!</p>
                    <div style="margin-top: 15px; text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <strong>Student ID:</strong> ${result.studentId}<br>
                        <strong>Section:</strong> ${result.section}<br>
                        <strong>Portal Password:</strong> ${result.portalPassword}
                    </div>
                `,
                confirmButtonColor: '#3085d6'
            });
            closeEnrollmentReviewModal();
            // Refresh enrollment table
            loadEnrollmentApplications();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.message,
                confirmButtonColor: '#3085d6'
            });
        }
    })
    .catch(error => {
        console.error('Error approving enrollment:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to approve enrollment. Please try again.',
            confirmButtonColor: '#3085d6'
        });
    });
}

function rejectEnrollment() {
    Swal.fire({
        title: 'Reject Enrollment',
        input: 'textarea',
        inputLabel: 'Reason for rejection',
        inputPlaceholder: 'Please provide a reason for rejection...',
        inputAttributes: {
            'aria-label': 'Type your message here'
        },
        showCancelButton: true,
        confirmButtonText: 'Reject',
        confirmButtonColor: '#d33',
        cancelButtonText: 'Cancel',
        cancelButtonColor: '#3085d6'
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            // Get current student ID from modal dataset
            const modal = document.getElementById('enrollmentReviewModal');
            const currentStudentId = modal.dataset.enrollmentId;
            
            if (!currentStudentId) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Student ID not found. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }
            
            // Call API to update status
            fetch('php/api.php?action=updateStatus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: currentStudentId,
                    status: 'rejected',
                    reason: result.value
                })
            })
            .then(response => response.json())
            .then(apiResult => {
                if (apiResult.success) {
                    updateStatusWorkflow('rejected');
                    Swal.fire({
                        icon: 'error',
                        title: 'Rejected',
                        text: 'Enrollment rejected. Reason: ' + result.value,
                        confirmButtonColor: '#3085d6'
                    });
                    closeEnrollmentReviewModal();
                    // Refresh enrollment table
                    loadEnrollmentApplications();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: apiResult.message,
                        confirmButtonColor: '#3085d6'
                    });
                }
            })
            .catch(error => {
                console.error('Error rejecting enrollment:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to reject enrollment. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
            });
        }
    });
}

function requestMoreInfo() {
    Swal.fire({
        title: 'Request More Information',
        input: 'textarea',
        inputLabel: 'Additional information needed',
        inputPlaceholder: 'What additional information do you need from the student?',
        inputAttributes: {
            'aria-label': 'Type your message here'
        },
        showCancelButton: true,
        confirmButtonText: 'Send Request',
        confirmButtonColor: '#3085d6',
        cancelButtonText: 'Cancel',
        cancelButtonColor: '#6c757d'
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            Swal.fire({
                icon: 'info',
                title: 'Request Sent',
                text: 'Request for more information sent: ' + result.value,
                confirmButtonColor: '#3085d6'
            });
            closeEnrollmentReviewModal();
            // In real implementation, send notification to student
        }
    });
}

function filterEnrollments(filter) {
    // In real implementation, filter the enrollment table based on status
    console.log('Filtering enrollments by:', filter);
    // This would update the table to show only matching enrollments
}

// Load enrollment applications from backend
async function loadEnrollmentApplications() {
    console.log('=== Loading enrollment applications ===');
    const tableBody = document.getElementById('enrollmentsTableBody');
    
    try {
        console.log('Fetching from API: php/api.php?action=pending');
        const response = await fetch('php/api.php?action=pending');
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('API result:', result);
        
        if (!result.success) {
            console.error('API returned error:', result.message);
            tableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-3 text-center text-red-500">Failed to load enrollment applications</td></tr>';
            return;
        }
        
        const applications = result.data;
        console.log('Applications loaded:', applications.length);
        
        if (applications.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-3 text-center text-gray-500">No pending enrollment applications</td></tr>';
            return;
        }
        
        tableBody.innerHTML = '';
        applications.forEach((enrollment, index) => {
            const statusColors = {
                'pending': 'bg-yellow-100 text-yellow-800',
                'approved': 'bg-green-100 text-green-800',
                'rejected': 'bg-red-100 text-red-800'
            };
            
            const fullName = `${enrollment.last_name}, ${enrollment.first_name} ${enrollment.middle_name || ''}`;
            const formattedDate = new Date(enrollment.created_at).toLocaleDateString();
            
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-4 py-3">${fullName}</td>
                <td class="px-4 py-3">${enrollment.program}</td>
                <td class="px-4 py-3">${enrollment.section}</td>
                <td class="px-4 py-3">${enrollment.email}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColors[enrollment.status]}">
                        ${enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                    </span>
                </td>
                <td class="px-4 py-3">${formattedDate}</td>
                <td class="px-4 py-3">
                    <button onclick="openEnrollmentReviewModal(${enrollment.id})" class="text-indigo-600 hover:text-indigo-800 mr-2">
                        <i class="fas fa-eye"></i> Review
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-3 text-center text-red-500">Error loading applications: ' + error.message + '</td></tr>';
    }
}

// Load enrollment applications when admin tab is shown
const originalShowAdminTab = showAdminTab;
showAdminTab = function(tabName, button) {
    originalShowAdminTab(tabName, button);
    if (tabName === 'enrollments') {
        loadEnrollmentApplications();
    }
};

// Language Translations
const translations = {
    en: {
        navHome: 'Home',
        navNews: 'News',
        navPrograms: 'Programs',
        navGuide: 'Guide',
        navPayment: 'Payment Instructions',
        navRegister: 'Enrollment',
        welcomeTitle: 'Welcome to Our University',
        welcomeSubtitle: 'Excellence in Education Since 1950',
        applyNow: 'Apply Now',
        learnMore: 'Learn More',
        newsTitle: 'Latest News',
        newsSubtitle: 'Stay updated with university announcements and events',
        programsTitle: 'Academic Programs',
        programsSubtitle: 'Explore our diverse range of undergraduate and graduate programs',
        guideTitle: 'Enrollment Guide',
        guideSubtitle: 'Follow these simple steps to enroll at our university',
        paymentTitle: 'Payment Instructions',
        paymentSubtitle: 'Choose your preferred payment method to complete your enrollment',
        onlinePayment: 'Online Payment',
        walkinPayment: 'Walk-in Payment'
    },
    id: {
        navHome: 'Beranda',
        navNews: 'Berita',
        navPrograms: 'Program',
        navGuide: 'Panduan',
        navPayment: 'Instruksi Pembayaran',
        navRegister: 'Daftar',
        welcomeTitle: 'Selamat Datang di Universitas Kami',
        welcomeSubtitle: 'Keunggulan Pendidikan Sejak 1950',
        applyNow: 'Daftar Sekarang',
        learnMore: 'Pelajari Lebih Lanjut',
        newsTitle: 'Berita Terbaru',
        newsSubtitle: 'Tetap update dengan pengumuman dan acara universitas',
        programsTitle: 'Program Akademik',
        programsSubtitle: 'Jelajahi berbagai program sarjana dan pascasarjana kami',
        guideTitle: 'Panduan Pendaftaran',
        guideSubtitle: 'Ikuti langkah sederhana untuk mendaftar di universitas kami',
        paymentTitle: 'Instruksi Pembayaran',
        paymentSubtitle: 'Pilih metode pembayaran pilihan Anda untuk menyelesaikan pendaftaran',
        onlinePayment: 'Pembayaran Online',
        walkinPayment: 'Pembayaran Langsung'
    },
    zh: {
        navHome: '首页',
        navNews: '新闻',
        navPrograms: '项目',
        navGuide: '指南',
        navPayment: '付款说明',
        navRegister: '注册',
        welcomeTitle: '欢迎来到我们的大学',
        welcomeSubtitle: '自1950年以来的卓越教育',
        applyNow: '立即申请',
        learnMore: '了解更多',
        newsTitle: '最新新闻',
        newsSubtitle: '了解大学公告和活动的最新动态',
        programsTitle: '学术项目',
        programsSubtitle: '探索我们多样化的本科和研究生项目',
        guideTitle: '入学指南',
        guideSubtitle: '按照这些简单步骤在我们大学注册',
        paymentTitle: '付款说明',
        paymentSubtitle: '选择您偏好的付款方式完成注册',
        onlinePayment: '在线付款',
        walkinPayment: '现场付款'
    },
    ar: {
        navHome: 'الرئيسية',
        navNews: 'الأخبار',
        navPrograms: 'البرامج',
        navGuide: 'الدليل',
        navPayment: 'تعليمات الدفع',
        navRegister: 'التسجيل',
        welcomeTitle: 'مرحباً بكم في جامعتنا',
        welcomeSubtitle: 'التميز في التعليم منذ عام 1950',
        applyNow: 'قدم الآن',
        learnMore: 'اعرف المزيد',
        newsTitle: 'أحدث الأخبار',
        newsSubtitle: 'ابق على اطلاع بإعلانات وأحداث الجامعة',
        programsTitle: 'البرامج الأكاديمية',
        programsSubtitle: 'استكشف نطاقنا المتنوع من برامج البكالوريوس والدراسات العليا',
        guideTitle: 'دليل التسجيل',
        guideSubtitle: 'اتبع هذه الخطوات البسيطة للتسجيل في جامعتنا',
        paymentTitle: 'تعليمات الدفع',
        paymentSubtitle: 'اختر طريقة الدفع المفضلة لإكمال التسجيل',
        onlinePayment: 'الدفع الإلكتروني',
        walkinPayment: 'الدفع المباشر'
    },
    es: {
        navHome: 'Inicio',
        navNews: 'Noticias',
        navPrograms: 'Programas',
        navGuide: 'Guía',
        navPayment: 'Instrucciones de Pago',
        navRegister: 'Registrarse',
        welcomeTitle: 'Bienvenido a Nuestra Universidad',
        welcomeSubtitle: 'Excelencia en Educación Desde 1950',
        applyNow: 'Solicitar Ahora',
        learnMore: 'Saber Más',
        newsTitle: 'Últimas Noticias',
        newsSubtitle: 'Manténgase actualizado con anuncios y eventos de la universidad',
        programsTitle: 'Programas Académicos',
        programsSubtitle: 'Explore nuestra diversa gama de programas de pregrado y posgrado',
        guideTitle: 'Guía de Inscripción',
        guideSubtitle: 'Siga estos simples pasos para inscribirse en nuestra universidad',
        paymentTitle: 'Instrucciones de Pago',
        paymentSubtitle: 'Elija su método de pago preferido para completar la inscripción',
        onlinePayment: 'Pago en Línea',
        walkinPayment: 'Pago Presencial'
    },
    fr: {
        navHome: 'Accueil',
        navNews: 'Actualités',
        navPrograms: 'Programmes',
        navGuide: 'Guide',
        navPayment: 'Instructions de Paiement',
        navRegister: 'S\'inscrire',
        welcomeTitle: 'Bienvenue à Notre Université',
        welcomeSubtitle: 'Excellence en Éducation Depuis 1950',
        applyNow: 'Postuler Maintenant',
        learnMore: 'En Savoir Plus',
        newsTitle: 'Dernières Nouvelles',
        newsSubtitle: 'Restez informé des annonces et événements de l\'université',
        programsTitle: 'Programmes Académiques',
        programsSubtitle: 'Explorez notre large gamme de programmes de premier et deuxième cycle',
        guideTitle: 'Guide d\'Inscription',
        guideSubtitle: 'Suivez ces étapes simples pour vous inscrire à notre université',
        paymentTitle: 'Instructions de Paiement',
        paymentSubtitle: 'Choisissez votre méthode de paiement préférée pour compléter l\'inscription',
        onlinePayment: 'Paiement en Ligne',
        walkinPayment: 'Paiement en Personne'
    },
    de: {
        navHome: 'Startseite',
        navNews: 'Nachrichten',
        navPrograms: 'Programme',
        navGuide: 'Leitfaden',
        navPayment: 'Zahlungsanweisungen',
        navRegister: 'Registrieren',
        welcomeTitle: 'Willkommen an Unserer Universität',
        welcomeSubtitle: 'Exzellenz in Bildung Seit 1950',
        applyNow: 'Jetzt Bewerben',
        learnMore: 'Mehr Erfahren',
        newsTitle: 'Neueste Nachrichten',
        newsSubtitle: 'Bleiben Sie über Ankündigungen und Veranstaltungen der Universität informiert',
        programsTitle: 'Akademische Programme',
        programsSubtitle: 'Erkunden Sie unsere vielfältige Palette an Bachelor- und Masterstudiengängen',
        guideTitle: 'Einschreibungsleitfaden',
        guideSubtitle: 'Folgen Sie diesen einfachen Schritten zur Einschreibung an unserer Universität',
        paymentTitle: 'Zahlungsanweisungen',
        paymentSubtitle: 'Wählen Sie Ihre bevorzugte Zahlungsmethode, um die Einschreibung abzuschließen',
        onlinePayment: 'Online-Zahlung',
        walkinPayment: 'Barzahlung'
    },
    ja: {
        navHome: 'ホーム',
        navNews: 'ニュース',
        navPrograms: 'プログラム',
        navGuide: 'ガイド',
        navPayment: '支払い手順',
        navRegister: '登録',
        welcomeTitle: '私たちの大学へようこそ',
        welcomeSubtitle: '1950年からの教育の卓越性',
        applyNow: '今すぐ申請',
        learnMore: '詳細を見る',
        newsTitle: '最新ニュース',
        newsSubtitle: '大学の発表やイベントについて最新情報を入手',
        programsTitle: '学術プログラム',
        programsSubtitle: '多様な学部および大学院プログラムを探索',
        guideTitle: '入学ガイド',
        guideSubtitle: '大学に登録するための簡単な手順に従う',
        paymentTitle: '支払い手順',
        paymentSubtitle: '登録を完了するために希望する支払い方法を選択',
        onlinePayment: 'オンライン支払い',
        walkinPayment: '直接支払い'
    },
    ko: {
        navHome: '홈',
        navNews: '뉴스',
        navPrograms: '프로그램',
        navGuide: '가이드',
        navPayment: '결제 안내',
        navRegister: '등록',
        welcomeTitle: '우리 대학에 오신 것을 환영합니다',
        welcomeSubtitle: '1950년부터의 교육의 탁월성',
        applyNow: '지금 신청',
        learnMore: '자세히 알아보기',
        newsTitle: '최신 뉴스',
        newsSubtitle: '대학 공지 및 이벤트에 대한 최신 정보 유지',
        programsTitle: '학술 프로그램',
        programsSubtitle: '다양한 학부 및 대학원 프로그램 탐색',
        guideTitle: '등록 가이드',
        guideSubtitle: '대학에 등록하기 위한 간단한 단계 따르기',
        paymentTitle: '결제 안내',
        paymentSubtitle: '등록을 완료하기 위해 선호하는 결제 방법 선택',
        onlinePayment: '온라인 결제',
        walkinPayment: '직접 결제'
    },
    pt: {
        navHome: 'Início',
        navNews: 'Notícias',
        navPrograms: 'Programas',
        navGuide: 'Guia',
        navPayment: 'Instruções de Pagamento',
        navRegister: 'Registrar',
        welcomeTitle: 'Bem-vindo à Nossa Universidade',
        welcomeSubtitle: 'Excelência em Educação Desde 1950',
        applyNow: 'Inscrever-se Agora',
        learnMore: 'Saiba Mais',
        newsTitle: 'Últimas Notícias',
        newsSubtitle: 'Mantenha-se atualizado com anúncios e eventos da universidade',
        programsTitle: 'Programas Acadêmicos',
        programsSubtitle: 'Explore nossa ampla gama de programas de graduação e pós-graduação',
        guideTitle: 'Guia de Inscrição',
        guideSubtitle: 'Siga estes passos simples para se inscrever em nossa universidade',
        paymentTitle: 'Instruções de Pagamento',
        paymentSubtitle: 'Escolha seu método de pagamento preferido para completar a inscrição',
        onlinePayment: 'Pagamento Online',
        walkinPayment: 'Pagamento Presencial'
    },
    ru: {
        navHome: 'Главная',
        navNews: 'Новости',
        navPrograms: 'Программы',
        navGuide: 'Руководство',
        navPayment: 'Инструкции по оплате',
        navRegister: 'Регистрация',
        welcomeTitle: 'Добро пожаловать в наш университет',
        welcomeSubtitle: 'Превосходство в образовании с 1950 года',
        applyNow: 'Подать заявку',
        learnMore: 'Узнать больше',
        newsTitle: 'Последние новости',
        newsSubtitle: 'Будьте в курсе объявлений и событий университета',
        programsTitle: 'Академические программы',
        programsSubtitle: 'Изучите наш широкий спектр программ бакалавриата и магистратуры',
        guideTitle: 'Руководство по зачислению',
        guideSubtitle: 'Следуйте этим простым шагам для зачисления в наш университет',
        paymentTitle: 'Инструкции по оплате',
        paymentSubtitle: 'Выберите предпочитаемый способ оплаты для завершения зачисления',
        onlinePayment: 'Онлайн-оплата',
        walkinPayment: 'Оплата наличными'
    },
    hi: {
        navHome: 'होम',
        navNews: 'समाचार',
        navPrograms: 'कार्यक्रम',
        navGuide: 'गाइड',
        navPayment: 'भुगतान निर्देश',
        navRegister: 'पंजीकरण',
        welcomeTitle: 'हमारे विश्वविद्यालय में आपका स्वागत है',
        welcomeSubtitle: '1950 से शिक्षा में उत्कृष्टता',
        applyNow: 'अभी आवेदन करें',
        learnMore: 'और जानें',
        newsTitle: 'नवीनतम समाचार',
        newsSubtitle: 'विश्वविद्यालय की घोषणाओं और कार्यक्रमों के बारे में अपडेट रहें',
        programsTitle: 'शैक्षणिक कार्यक्रम',
        programsSubtitle: 'हमारे विविध स्नातक और स्नातकोत्तर कार्यक्रमों का अन्वेषण करें',
        guideTitle: 'नामांकन गाइड',
        guideSubtitle: 'हमारे विश्वविद्यालय में नामांकन के लिए इन सरल चरणों का पालन करें',
        paymentTitle: 'भुगतान निर्देश',
        paymentSubtitle: 'नामांकन पूरा करने के लिए अपनी पसंदीदा भुगतान विधि चुनें',
        onlinePayment: 'ऑनलाइन भुगतान',
        walkinPayment: 'सीधे भुगतान'
    },
    th: {
        navHome: 'หน้าแรก',
        navNews: 'ข่าว',
        navPrograms: 'โปรแกรม',
        navGuide: 'คู่มือ',
        navPayment: 'คำแนะนำการชำระเงิน',
        navRegister: 'ลงทะเบียน',
        welcomeTitle: 'ยินดีต้อนรับสู่มหาวิทยาลัยของเรา',
        welcomeSubtitle: 'ความเป็นเลิศทางการศึกษาตั้งแต่ปี 1950',
        applyNow: 'สมัครเลย',
        learnMore: 'เรียนรู้เพิ่มเติม',
        newsTitle: 'ข่าวล่าสุด',
        newsSubtitle: 'ติดตามประกาศและกิจกรรมของมหาวิทยาลัย',
        programsTitle: 'โปรแกรมทางวิชาการ',
        programsSubtitle: 'สำรวจหลักสูตรปริญญาตรีและบัณฑิตศึกษาที่หลากหลายของเรา',
        guideTitle: 'คู่มือการลงทะเบียน',
        guideSubtitle: 'ทำตามขั้นตอนง่ายๆ เหล่านี้เพื่อลงทะเบียนที่มหาวิทยาลัยของเรา',
        paymentTitle: 'คำแนะนำการชำระเงิน',
        paymentSubtitle: 'เลือกวิธีการชำระเงินที่คุณต้องการเพื่อทำการลงทะเบียนให้สมบูรณ์',
        onlinePayment: 'ชำระเงินออนไลน์',
        walkinPayment: 'ชำระเงินด้วยตนเอง'
    },
    vi: {
        navHome: 'Trang chủ',
        navNews: 'Tin tức',
        navPrograms: 'Chương trình',
        navGuide: 'Hướng dẫn',
        navPayment: 'Hướng dẫn thanh toán',
        navRegister: 'Đăng ký',
        welcomeTitle: 'Chào mừng đến với Đại học của chúng tôi',
        welcomeSubtitle: 'Sự xuất sắc trong giáo dục từ năm 1950',
        applyNow: 'Đăng ký ngay',
        learnMore: 'Tìm hiểu thêm',
        newsTitle: 'Tin tức mới nhất',
        newsSubtitle: 'Cập nhật thông báo và sự kiện của đại học',
        programsTitle: 'Chương trình học thuật',
        programsSubtitle: 'Khám phá các chương trình đại học và sau đại học đa dạng của chúng tôi',
        guideTitle: 'Hướng dẫn đăng ký',
        guideSubtitle: 'Làm theo các bước đơn giản này để đăng ký vào đại học của chúng tôi',
        paymentTitle: 'Hướng dẫn thanh toán',
        paymentSubtitle: 'Chọn phương thức thanh toán ưa thích của bạn để hoàn tất đăng ký',
        onlinePayment: 'Thanh toán trực tuyến',
        walkinPayment: 'Thanh toán trực tiếp'
    },
    tl: {
        navHome: 'Tahanan',
        navNews: 'Balita',
        navPrograms: 'Mga Programa',
        navGuide: 'Gabay',
        navPayment: 'Mga Tagubilin sa Pagbabayad',
        navRegister: 'Magrehistro',
        welcomeTitle: 'Maligayang Pagdating sa Aming Unibersidad',
        welcomeSubtitle: 'Kahusayan sa Edukasyon Mula noong 1950',
        applyNow: 'Mag-apply Ngayon',
        learnMore: 'Alamin Pa',
        newsTitle: 'Pinakabagong Balita',
        newsSubtitle: 'Manatiling updated sa mga anunsyo at kaganapan ng unibersidad',
        programsTitle: 'Mga Akademikong Programa',
        programsSubtitle: 'Tuklasin ang iba\'t ibang programa ng undergraduate at graduate namin',
        guideTitle: 'Gabay sa Pagpaparehistro',
        guideSubtitle: 'Sundan ang mga simpleng hakbang na ito para magrehistro sa aming unibersidad',
        paymentTitle: 'Mga Tagubilin sa Pagbabayad',
        paymentSubtitle: 'Piliin ang iyong gustong paraan ng pagbabayad upang makumpleto ang pagpaparehistro',
        onlinePayment: 'Online na Pagbabayad',
        walkinPayment: 'Personal na Pagbabayad'
    },
    ceb: {
        navHome: 'Balay',
        navNews: 'Balita',
        navPrograms: 'Mga Programa',
        navGuide: 'Giya',
        navPayment: 'Mga Sugli sa Pagbayad',
        navRegister: 'Parehistro',
        welcomeTitle: 'Maayong Pag-abot sa Atong Unibersidad',
        welcomeSubtitle: 'Kahusayan sa Edukasyon Gikan sa 1950',
        applyNow: 'Pamuyo Karon',
        learnMore: 'Pag-aram Pa',
        newsTitle: 'Pinakabagong Balita',
        newsSubtitle: 'Pabilin nga updated sa mga anunsyo ug mga panghitabo sa unibersidad',
        programsTitle: 'Mga Akademikong Programa',
        programsSubtitle: 'Susi ang lain-laing mga programa sa undergraduate ug graduate namo',
        guideTitle: 'Giya sa Pagparehistro',
        guideSubtitle: 'Sundan kining mga yano nga mga lakang aron magparehistro sa atong unibersidad',
        paymentTitle: 'Mga Sugli sa Pagbayad',
        paymentSubtitle: 'Piliin ang imong gipili nga paagi sa pagbayad aron makompleto ang pagparehistro',
        onlinePayment: 'Online nga Pagbayad',
        walkinPayment: 'Personal nga Pagbayad'
    },
    ilo: {
        navHome: 'Balay',
        navNews: 'Dagiti Damag',
        navPrograms: 'Dagiti Programa',
        navGuide: 'Gida',
        navPayment: 'Dagiti Panunot iti Panagbayad',
        navRegister: 'Marehistro',
        welcomeTitle: 'Naragsak nga Panagabot iti Nagan nga Unibersidad',
        welcomeSubtitle: 'Kalaing iti Edukasion Manipud idi 1950',
        applyNow: 'Ag-apply Itan',
        learnMore: 'Ad-adda Pay',
        newsTitle: 'Kaudian a Damag',
        newsSubtitle: 'Mantemid nga updated kadagiti annunsio ken panagpaspasamak ti unibersidad',
        programsTitle: 'Dagiti Akademiko a Programa',
        programsSubtitle: 'Sukisok dagiti nadumaduma a programa ti undergraduate ken graduate tayo',
        guideTitle: 'Gida iti Panagrehistro',
        guideSubtitle: 'Sundan dagitoy a simple nga pasos tapno marehistro iti unibersidad tayo',
        paymentTitle: 'Dagiti Panunot iti Panagbayad',
        paymentSubtitle: 'Piliem ti kaykayat a pamay-an iti panagbayad tapno maipasubli ti panagrehistro',
        onlinePayment: 'Online a Panagbayad',
        walkinPayment: 'Personal a Panagbayad'
    },
    hil: {
        navHome: 'Balay',
        navNews: 'Balita',
        navPrograms: 'Mga Programa',
        navGuide: 'Gide',
        navPayment: 'Mga Suglanon sa Pagbayad',
        navRegister: 'Magparehistro',
        welcomeTitle: 'Maayong Pag-abot sa Amon Unibersidad',
        welcomeSubtitle: 'Kahusayan sa Edukasyon Gikan pa 1950',
        applyNow: 'Mag-apply Karon',
        learnMore: 'Pag-aram Pa',
        newsTitle: 'Pinakabag-o nga Balita',
        newsSubtitle: 'Pabilin nga updated sa mga anunsyo kag mga panghitabo sang unibersidad',
        programsTitle: 'Mga Akademikong Programa',
        programsSubtitle: 'Suklon ang mga iba-ibang nga programa sang undergraduate kag graduate namon',
        guideTitle: 'Gide sa Pagparehistro',
        guideSubtitle: 'Sundan kining mga simpleng nga lakas para magparehistro sa amon unibersidad',
        paymentTitle: 'Mga Suglanon sa Pagbayad',
        paymentSubtitle: 'Piliin ang imo gusto nga paagi sang pagbayad para makumpleto ang pagparehistro',
        onlinePayment: 'Online nga Pagbayad',
        walkinPayment: 'Personal nga Pagbayad'
    }
};

function changeLanguage(lang) {
    if (!translations[lang]) return;
    
    // Save selection to localStorage
    localStorage.setItem('selectedLanguage', lang);
    
    // Synchronize select value
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect && languageSelect.value !== lang) {
        languageSelect.value = lang;
    }

    // Update navigation buttons safely (preserving structure)
    const homeText = document.querySelector('button[data-tab="home"] .sidebar-text');
    if (homeText) homeText.textContent = translations[lang].navHome;
    
    const newsText = document.querySelector('button[data-tab="news"] .sidebar-text');
    if (newsText) newsText.textContent = translations[lang].navNews;
    
    const programsText = document.querySelector('button[data-tab="programs"] .sidebar-text');
    if (programsText) programsText.textContent = translations[lang].navPrograms;
    
    const eventsText = document.querySelector('button[data-tab="events"] .sidebar-text');
    if (eventsText) {
        const eventsKey = translations[lang].navEvents || 
                          (lang === 'tl' ? 'Mga Kaganapan' : 
                           lang === 'ceb' ? 'Mga Hitabo' : 
                           lang === 'ilo' ? 'Dagiti Pasamak' : 
                           lang === 'hil' ? 'Mga Panghitabo' : 'Events');
        eventsText.textContent = eventsKey;
    }
    
    const guideText = document.querySelector('button[data-tab="guide"] .sidebar-text');
    if (guideText) guideText.textContent = translations[lang].navGuide;
    
    const requirementsText = document.querySelector('button[data-tab="requirements"] .sidebar-text');
    if (requirementsText) {
        const reqText = translations[lang].navRequirements || 
                        (lang === 'tl' ? 'Mga Kinakailangan' : 
                         lang === 'ceb' ? 'Mga Kinahanglanon' : 
                         lang === 'hil' ? 'Mga Kinahanglanon' : 
                         lang === 'ilo' ? 'Kasapulan' : 'Requirements');
        requirementsText.textContent = reqText;
    }
    
    const paymentText = document.querySelector('button[data-tab="payment"] .sidebar-text');
    if (paymentText) paymentText.textContent = translations[lang].navPayment;
    
    const registerBtn = document.getElementById('navEnrollBtn');
    if (registerBtn && translations[lang].navRegister) {
        registerBtn.textContent = translations[lang].navRegister;
    }

    // Update slider text for all slides
    const welcomeTitles = document.querySelectorAll('.slide h1');
    welcomeTitles.forEach(title => {
        title.textContent = translations[lang].welcomeTitle;
    });
    
    const welcomeSubtitles = document.querySelectorAll('.slide p');
    welcomeSubtitles.forEach(subtitle => {
        subtitle.textContent = translations[lang].welcomeSubtitle;
    });

    // Update slider buttons
    const sliderButtons = document.querySelectorAll('.slide button');
    sliderButtons.forEach((button, index) => {
        if (button.textContent.includes('Apply') || button.textContent.includes('Solicitar') || button.textContent.includes('Postuler') || button.textContent.includes('Bewerben') || button.textContent.includes('申請') || button.textContent.includes('신청') || button.textContent.includes('Inscrever') || button.textContent.includes('Подать') || button.textContent.includes('आवेदन') || button.textContent.includes('สมัคร') || button.textContent.includes('Đăng ký') || button.textContent.includes('Mag-apply') || button.textContent.includes('Pamuyo') || button.textContent.includes('Ag-apply') || button.textContent.includes('Mag-apply')) {
            button.innerHTML = `<i class="fas fa-graduation-cap mr-2"></i>${translations[lang].applyNow}`;
        } else if (button.textContent.includes('Learn') || button.textContent.includes('Saber') || button.textContent.includes('Savoir') || button.textContent.includes('Erfahren') || button.textContent.includes('詳細') || button.textContent.includes('알아보기') || button.textContent.includes('Saiba') || button.textContent.includes('Узнать') || button.textContent.includes('जानें') || button.textContent.includes('เรียนรู้') || button.textContent.includes('Tìm hiểu') || button.textContent.includes('Alamin') || button.textContent.includes('Pag-aram') || button.textContent.includes('Ad-adda') || button.textContent.includes('Pag-aram')) {
            button.innerHTML = `<i class="fas fa-info-circle mr-2"></i>${translations[lang].learnMore}`;
        }
    });

    // Update section titles
    const newsTitle = document.querySelector('#news h1');
    if (newsTitle) newsTitle.textContent = translations[lang].newsTitle;

    const newsSubtitle = document.querySelector('#news p');
    if (newsSubtitle) newsSubtitle.textContent = translations[lang].newsSubtitle;

    const programsTitle = document.querySelector('#programs h1');
    if (programsTitle) programsTitle.textContent = translations[lang].programsTitle;

    const programsSubtitle = document.querySelector('#programs p');
    if (programsSubtitle) programsSubtitle.textContent = translations[lang].programsSubtitle;

    const guideTitle = document.querySelector('#guide h1');
    if (guideTitle) guideTitle.textContent = translations[lang].guideTitle;

    const guideSubtitle = document.querySelector('#guide p');
    if (guideSubtitle) guideSubtitle.textContent = translations[lang].guideSubtitle;

    const paymentTitle = document.querySelector('#payment h1');
    if (paymentTitle) paymentTitle.textContent = translations[lang].paymentTitle;

    const paymentSubtitle = document.querySelector('#payment p');
    if (paymentSubtitle) paymentSubtitle.textContent = translations[lang].paymentSubtitle;

    // Update payment section titles
    const paymentSectionTitles = document.querySelectorAll('#payment h2');
    paymentSectionTitles.forEach((title, index) => {
        if (index === 0) title.textContent = translations[lang].onlinePayment;
        if (index === 1) title.textContent = translations[lang].walkinPayment;
    });

    // Update RTL for Arabic and other RTL languages
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    if (rtlLanguages.includes(lang)) {
        document.body.style.direction = 'rtl';
    } else {
        document.body.style.direction = 'ltr';
    }
}

// FAQ Toggle
function toggleFAQ(button) {
    const content = button.nextElementSibling;
    const icon = button.querySelector('i');
    content.classList.toggle('hidden');
    icon.classList.toggle('rotate-180');
}

// File Upload Handler
function handleFileUpload(input, documentName) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const parent = input.parentElement.parentElement;
        const statusSpan = parent.querySelector('span:last-child');
        const icon = parent.querySelector('i');
        
        icon.className = 'fas fa-spinner fa-spin text-[#007dfe]';
        statusSpan.textContent = 'Uploading...';
        statusSpan.className = 'text-[#007dfe] text-sm';
        
        setTimeout(() => {
            icon.className = 'fas fa-check-circle text-green-500';
            statusSpan.textContent = 'Uploaded';
            statusSpan.className = 'text-green-500 text-sm';
            showToast(`${documentName} uploaded successfully!`);
        }, 1500);
    }
}

// Tab Navigation
function switchTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab content
    const selectedTab = document.getElementById(tabName + '-tab');
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to selected button
    const selectedButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }

    if (tabName === 'events') {
        if (typeof renderCalendar === 'function') {
            renderCalendar();
        }
    }

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Dark Mode Utility Functions
function applyDarkMode(isDark) {
    if (isDark) {
        document.documentElement.classList.add('dark-mode');
        document.documentElement.classList.add('dark');
        if (document.body) {
            document.body.style.backgroundColor = '#1a1a2e';
            document.body.style.color = '#ffffff';
            document.body.classList.remove('bg-gray-100');
            document.body.classList.add('bg-[#1a1a2e]');
        }
        const icon = document.querySelector('#darkModeToggle i');
        if (icon) {
            icon.className = 'fas fa-sun text-xl text-yellow-400';
        }
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.documentElement.classList.remove('dark');
        if (document.body) {
            document.body.style.backgroundColor = '#f3f4f6';
            document.body.style.color = '#1f2937';
            document.body.classList.remove('bg-[#1a1a2e]');
            document.body.classList.add('bg-gray-100');
        }
        const icon = document.querySelector('#darkModeToggle i');
        if (icon) {
            icon.className = 'fas fa-moon text-xl';
        }
    }
}

// Dark Mode Toggle
function toggleDarkMode() {
    const isDark = !document.documentElement.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    applyDarkMode(isDark);
}

// Search Functions
function openSearch() {
    document.getElementById('searchOverlay').classList.remove('hidden');
    document.getElementById('searchInput').focus();
    
    // Show suggested questions
    showSearchSuggestions();
}

function showSearchSuggestions() {
    const resultsContainer = document.getElementById('searchResults');
    const suggestions = [
        { type: 'Question', title: 'What are the admission requirements?', answer: 'To be admitted, you need a high school diploma or equivalent, minimum GPA of 2.5, and completion of prerequisite courses. International students must provide English proficiency test scores.' },
        { type: 'Question', title: 'How do I apply for scholarships?', answer: 'Scholarship applications are available through the student portal. You can apply for merit-based, need-based, and program-specific scholarships. Deadlines vary by scholarship type.' },
        { type: 'Question', title: 'What payment methods are accepted?', answer: 'We accept credit cards (Visa, Mastercard), bank transfers, and e-wallets (GoPay, OVO, Dana). You can also pay in person at the Finance Office using cash or debit cards.' },
        { type: 'Question', title: 'When is the enrollment deadline?', answer: 'The enrollment deadline for Fall semester is August 15th, and for Spring semester is January 15th. Late applications may be considered on a space-available basis with additional fees.' },
        { type: 'Question', title: 'How do I upload documents?', answer: 'Go to the Dashboard tab and navigate to the Required Documents section. Click the Upload button next to each document type and select your file. Accepted formats include PDF, JPG, and PNG.' },
        { type: 'Program', title: 'Computer Science program details', answer: 'Computer Science is a 4-year Bachelor\'s program covering programming, algorithms, software development, and industry partnerships. Students learn hands-on with real-world projects.' },
        { type: 'Program', title: 'Business Administration courses', answer: 'Business Administration is a 4-year program covering management, finance, marketing, and entrepreneurship. Includes internship opportunities and practical business skills.' },
        { type: 'Program', title: 'Biotechnology degree requirements', answer: 'Biotechnology is a 4-year program covering genetic engineering, molecular biology, and biochemistry. Features state-of-the-art laboratory facilities and research opportunities.' },
    ];
    
    resultsContainer.innerHTML = `
        <div class="mb-4">
            <p class="text-sm text-gray-500 font-medium mb-2">Suggested Questions:</p>
            ${suggestions.map((item, index) => `
                <div class="p-3 hover:bg-gray-100 rounded-lg cursor-pointer" onclick="showAnswer('${item.title.replace(/'/g, "\\'")}', '${item.answer.replace(/'/g, "\\'")}')">
                    <span class="text-xs text-[#007dfe] font-semibold">${item.type}</span>
                    <p class="text-gray-800">${item.title}</p>
                </div>
            `).join('')}
        </div>
    `;
}

function closeSearch() {
    document.getElementById('searchOverlay').classList.add('hidden');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

function showAnswer(question, answer) {
    const modal = document.getElementById('answerModal');
    const content = document.getElementById('answerModalContent');
    const questionEl = document.getElementById('answerQuestion');
    const answerEl = document.getElementById('answerText');
    
    questionEl.textContent = question;
    answerEl.textContent = answer;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideAnswerModal() {
    const modal = document.getElementById('answerModal');
    const content = document.getElementById('answerModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function handleSearch(query) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (query.length < 2) {
        showSearchSuggestions();
        return;
    }
    
    const searchableContent = [
        { type: 'Program', title: 'Computer Science', answer: 'Computer Science is a 4-year Bachelor\'s program covering programming, algorithms, software development, and industry partnerships. Students learn hands-on with real-world projects.' },
        { type: 'Program', title: 'Biotechnology', answer: 'Biotechnology is a 4-year program covering genetic engineering, molecular biology, and biochemistry. Features state-of-the-art laboratory facilities and research opportunities.' },
        { type: 'Program', title: 'Business Administration', answer: 'Business Administration is a 4-year program covering management, finance, marketing, and entrepreneurship. Includes internship opportunities and practical business skills.' },
        { type: 'Program', title: 'Medicine', answer: 'Medicine is a professional program preparing students for medical careers with comprehensive clinical training and research opportunities.' },
        { type: 'Program', title: 'Fine Arts', answer: 'Fine Arts program offers creative expression through various mediums including painting, sculpture, digital arts, and performance.' },
        { type: 'Program', title: 'International Relations', answer: 'International Relations program covers global politics, diplomacy, and international law with opportunities for study abroad.' },
        { type: 'FAQ', title: 'Admission Requirements', answer: 'To be admitted, you need a high school diploma or equivalent, minimum GPA of 2.5, and completion of prerequisite courses. International students must provide English proficiency test scores.' },
        { type: 'FAQ', title: 'Scholarships', answer: 'Scholarship applications are available through the student portal. You can apply for merit-based, need-based, and program-specific scholarships. Deadlines vary by scholarship type.' },
        { type: 'FAQ', title: 'Payment Methods', answer: 'We accept credit cards (Visa, Mastercard), bank transfers, and e-wallets (GoPay, OVO, Dana). You can also pay in person at the Finance Office using cash or debit cards.' },
        { type: 'FAQ', title: 'Credit Transfer', answer: 'Yes, we accept transfer credits from accredited institutions. Credits are evaluated on a case-by-case basis. Submit your official transcripts for evaluation during the application process.' },
        { type: 'FAQ', title: 'Enrollment Deadlines', answer: 'The enrollment deadline for Fall semester is August 15th, and for Spring semester is January 15th. Late applications may be considered on a space-available basis with additional fees.' },
    ];
    
    const results = searchableContent.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase())
    );
    
    if (results.length > 0) {
        resultsContainer.innerHTML = results.map(item => `
            <div class="p-3 hover:bg-gray-100 rounded-lg cursor-pointer" onclick="showAnswer('${item.title.replace(/'/g, "\\'")}', '${item.answer.replace(/'/g, "\\'")}')">
                <span class="text-xs text-[#007dfe] font-semibold">${item.type}</span>
                <p class="text-gray-800">${item.title}</p>
            </div>
        `).join('');
    } else {
        resultsContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No results found</p>';
    }
}

// Close search on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSearch();
    }
});

// Close search when clicking outside
const searchOverlayElement = document.getElementById('searchOverlay');
if (searchOverlayElement) {
    searchOverlayElement.addEventListener('click', (e) => {
        if (e.target.id === 'searchOverlay') {
            closeSearch();
        }
    });
}

// Email Notification System (Frontend simulation)
function sendEmailNotification(type, recipient, data) {
    // This is a frontend simulation - in production, this would call a backend API
    const notifications = {
        'registration': {
            subject: 'Welcome to University - Registration Received',
            body: `Dear ${data.name},\n\nThank you for registering at our university. Your application has been received and is under review.\n\nApplication ID: ${data.applicationId}\n\nBest regards,\nAdmissions Team`
        },
        'document_upload': {
            subject: 'Document Uploaded Successfully',
            body: `Dear Student,\n\nYour document "${data.documentName}" has been successfully uploaded.\n\nPlease continue uploading remaining documents to complete your application.\n\nBest regards,\nAdmissions Team`
        },
        'status_update': {
            subject: 'Application Status Update',
            body: `Dear Student,\n\nYour application status has been updated to: ${data.status}\n\n${data.message}\n\nBest regards,\nAdmissions Team`
        },
        'payment_reminder': {
            subject: 'Payment Reminder',
            body: `Dear Student,\n\nThis is a reminder that your payment of ${data.amount} is due on ${data.dueDate}.\n\nPlease complete your payment to avoid any late fees.\n\nBest regards,\nFinance Team`
        }
    };

    const notification = notifications[type];
    console.log(`Email sent to ${recipient}:`, notification);
    
    // Show toast notification to user
    showToast(`Email notification sent: ${notification.subject}`);
}

// Modal Functions for Legal Pages
function showPrivacyModal() {
    const modal = document.getElementById('privacyModal');
    const content = document.getElementById('privacyModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hidePrivacyModal() {
    const modal = document.getElementById('privacyModal');
    const content = document.getElementById('privacyModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function showTermsModal() {
    const modal = document.getElementById('termsModal');
    const content = document.getElementById('termsModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideTermsModal() {
    const modal = document.getElementById('termsModal');
    const content = document.getElementById('termsModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function showCookieModal() {
    const modal = document.getElementById('cookieModal');
    const content = document.getElementById('cookieModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideCookieModal() {
    const modal = document.getElementById('cookieModal');
    const content = document.getElementById('cookieModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function showAccessibilityModal() {
    const modal = document.getElementById('accessibilityModal');
    const content = document.getElementById('accessibilityModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideAccessibilityModal() {
    const modal = document.getElementById('accessibilityModal');
    const content = document.getElementById('accessibilityModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

// FAQ Modal Functions
function showFAQModal() {
    const modal = document.getElementById('faqModal');
    const content = document.getElementById('faqModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideFAQModal() {
    const modal = document.getElementById('faqModal');
    const content = document.getElementById('faqModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function toggleFAQModalItem(button) {
    const content = button.nextElementSibling;
    const icon = button.querySelector('i');
    
    content.classList.toggle('hidden');
    icon.classList.toggle('rotate-180');
}

// Program Modal Functions
function showProgramModal(title, duration, degree, description, curriculum, careers) {
    const modal = document.getElementById('programModal');
    const modalBox = document.getElementById('programModalBox');
    const titleEl = document.getElementById('programModalTitle');
    const durationEl = document.getElementById('programModalDuration');
    const degreeEl = document.getElementById('programModalDegree');
    const descriptionEl = document.getElementById('programModalDescription');
    const curriculumEl = document.getElementById('programModalCurriculum');
    const careersEl = document.getElementById('programModalCareers');
    const bannerImg = document.getElementById('programModalBannerImg');
    
    titleEl.textContent = title;
    durationEl.textContent = duration;
    degreeEl.textContent = degree;
    descriptionEl.textContent = description;
    
    // Set banner image based on title
    if (bannerImg) {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('system servicing') || lowerTitle.includes('css')) {
            bannerImg.src = 'img/css_strand.jpg';
        } else if (lowerTitle.includes('communications technology') || lowerTitle.includes('ict')) {
            bannerImg.src = 'img/ict_strand.jpg';
        } else if (lowerTitle.includes('stem')) {
            bannerImg.src = 'img/stem_strand.jpg';
        } else if (lowerTitle.includes('abm')) {
            bannerImg.src = 'img/abm_strand.jpg';
        } else if (lowerTitle.includes('home economics') || lowerTitle.includes('tvl - he') || lowerTitle.includes('tvl-he')) {
            bannerImg.src = 'img/he_strand.jpg';
        } else if (lowerTitle.includes('humss')) {
            bannerImg.src = 'img/humss_strand.jpg';
        } else {
            bannerImg.src = 'img/sample.jpg';
        }
    }
    
    // Clear and populate curriculum list as pills
    curriculumEl.innerHTML = '';
    curriculum.forEach(item => {
        const span = document.createElement('span');
        span.className = 'inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-blue-50 dark:bg-[#232343] text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 font-semibold';
        span.innerHTML = `<i class="fas fa-check-circle mr-1.5 text-blue-500"></i>${item}`;
        curriculumEl.appendChild(span);
    });
    
    // Clear and populate careers list as pills
    careersEl.innerHTML = '';
    careers.forEach(item => {
        const span = document.createElement('span');
        span.className = 'inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-green-50 dark:bg-[#1e3a2f] text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800 font-semibold';
        span.innerHTML = `<i class="fas fa-briefcase mr-1.5 text-green-500"></i>${item}`;
        careersEl.appendChild(span);
    });
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modalBox.classList.remove('scale-95', 'opacity-0');
        modalBox.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideProgramModal() {
    const modal = document.getElementById('programModal');
    const modalBox = document.getElementById('programModalBox');
    
    modalBox.classList.remove('scale-100', 'opacity-100');
    modalBox.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

function applyFromProgramModal() {
    hideProgramModal();
    if (typeof showRegisterModal === 'function') {
        showRegisterModal();
    }
}

window.applyFromProgramModal = applyFromProgramModal;

// Payment Calculation Function
function updatePayment() {
    const programSelect = document.getElementById('programSelect');
    const selectedOption = programSelect.options[programSelect.selectedIndex];
    const tuition = parseInt(selectedOption.getAttribute('data-tuition')) || 0;
    
    const registrationFee = 500;
    const libraryFee = 200;
    const studentIdFee = 50;
    const labFee = tuition > 50000 ? 5000 : 2000; // Higher lab fee for expensive programs
    
    const total = tuition + registrationFee + libraryFee + studentIdFee + labFee;
    
    document.getElementById('tuitionFee').textContent = '₱' + tuition.toLocaleString();
    document.getElementById('labFee').textContent = '₱' + labFee.toLocaleString();
    document.getElementById('totalPayment').textContent = '₱' + total.toLocaleString();
}

// Section Data for Each Program
const sectionData = {
    'bs-computer-science': [
        { 
            id: '31M1', name: 'BSIT - 31M1', 
            days: 'Mon-Wed-Fri', start: '7:30 AM', end: '11:30 AM', room: 'Room 101',
            subjects: [
                { code: 'CS101', day: 'Mon', start: '7:30 AM', end: '9:00 AM' },
                { code: 'MATH101', day: 'Mon', start: '9:00 AM', end: '10:30 AM' },
                { code: 'ENG101', day: 'Mon', start: '10:30 AM', end: '11:30 AM' },
                { code: 'CS101', day: 'Wed', start: '7:30 AM', end: '9:00 AM' },
                { code: 'MATH101', day: 'Wed', start: '9:00 AM', end: '10:30 AM' },
                { code: 'ENG101', day: 'Wed', start: '10:30 AM', end: '11:30 AM' },
                { code: 'CS101', day: 'Fri', start: '7:30 AM', end: '9:00 AM' },
                { code: 'MATH101', day: 'Fri', start: '9:00 AM', end: '10:30 AM' },
                { code: 'ENG101', day: 'Fri', start: '10:30 AM', end: '11:30 AM' }
            ]
        },
        { 
            id: '31M2', name: 'BSIT - 31M2', 
            days: 'Mon-Wed-Fri', start: '8:00 AM', end: '12:00 PM', room: 'Room 102',
            subjects: [
                { code: 'CS101', day: 'Mon', start: '8:00 AM', end: '9:30 AM' },
                { code: 'MATH101', day: 'Mon', start: '9:30 AM', end: '11:00 AM' },
                { code: 'ENG101', day: 'Mon', start: '11:00 AM', end: '12:00 PM' },
                { code: 'CS101', day: 'Wed', start: '8:00 AM', end: '9:30 AM' },
                { code: 'MATH101', day: 'Wed', start: '9:30 AM', end: '11:00 AM' },
                { code: 'ENG101', day: 'Wed', start: '11:00 AM', end: '12:00 PM' },
                { code: 'CS101', day: 'Fri', start: '8:00 AM', end: '9:30 AM' },
                { code: 'MATH101', day: 'Fri', start: '9:30 AM', end: '11:00 AM' },
                { code: 'ENG101', day: 'Fri', start: '11:00 AM', end: '12:00 PM' }
            ]
        },
        { 
            id: '31E1', name: 'BSIT - 31E1', 
            days: 'Mon-Wed-Fri', start: '5:30 PM', end: '9:30 PM', room: 'Room 107',
            subjects: [
                { code: 'CS101', day: 'Mon', start: '5:30 PM', end: '7:00 PM' },
                { code: 'MATH101', day: 'Mon', start: '7:00 PM', end: '8:30 PM' },
                { code: 'ENG101', day: 'Mon', start: '8:30 PM', end: '9:30 PM' },
                { code: 'CS101', day: 'Wed', start: '5:30 PM', end: '7:00 PM' },
                { code: 'MATH101', day: 'Wed', start: '7:00 PM', end: '8:30 PM' },
                { code: 'ENG101', day: 'Wed', start: '8:30 PM', end: '9:30 PM' },
                { code: 'CS101', day: 'Fri', start: '5:30 PM', end: '7:00 PM' },
                { code: 'MATH101', day: 'Fri', start: '7:00 PM', end: '8:30 PM' },
                { code: 'ENG101', day: 'Fri', start: '8:30 PM', end: '9:30 PM' }
            ]
        },
        { 
            id: '31E2', name: 'BSIT - 31E2', 
            days: 'Mon-Wed-Fri', start: '6:00 PM', end: '10:00 PM', room: 'Room 108',
            subjects: [
                { code: 'CS101', day: 'Mon', start: '6:00 PM', end: '7:30 PM' },
                { code: 'MATH101', day: 'Mon', start: '7:30 PM', end: '9:00 PM' },
                { code: 'ENG101', day: 'Mon', start: '9:00 PM', end: '10:00 PM' },
                { code: 'CS101', day: 'Wed', start: '6:00 PM', end: '7:30 PM' },
                { code: 'MATH101', day: 'Wed', start: '7:30 PM', end: '9:00 PM' },
                { code: 'ENG101', day: 'Wed', start: '9:00 PM', end: '10:00 PM' },
                { code: 'CS101', day: 'Fri', start: '6:00 PM', end: '7:30 PM' },
                { code: 'MATH101', day: 'Fri', start: '7:30 PM', end: '9:00 PM' },
                { code: 'ENG101', day: 'Fri', start: '9:00 PM', end: '10:00 PM' }
            ]
        }
    ],
    'bs-biotechnology': [
        { 
            id: '31M1', name: 'BSBT - 31M1', 
            days: 'Mon-Wed-Fri', start: '8:00 AM', end: '12:00 PM', room: 'Lab 201',
            subjects: [
                { code: 'BT101', day: 'Mon', start: '8:00 AM', end: '9:30 AM' },
                { code: 'CHEM101', day: 'Mon', start: '9:30 AM', end: '11:00 AM' },
                { code: 'MATH101', day: 'Mon', start: '11:00 AM', end: '12:00 PM' },
                { code: 'BT101', day: 'Wed', start: '8:00 AM', end: '9:30 AM' },
                { code: 'CHEM101', day: 'Wed', start: '9:30 AM', end: '11:00 AM' },
                { code: 'MATH101', day: 'Wed', start: '11:00 AM', end: '12:00 PM' },
                { code: 'BT101', day: 'Fri', start: '8:00 AM', end: '9:30 AM' },
                { code: 'CHEM101', day: 'Fri', start: '9:30 AM', end: '11:00 AM' },
                { code: 'MATH101', day: 'Fri', start: '11:00 AM', end: '12:00 PM' }
            ]
        },
        { 
            id: '31M2', name: 'BSBT - 31M2', 
            days: 'Mon-Wed-Fri', start: '9:00 AM', end: '1:00 PM', room: 'Lab 202',
            subjects: [
                { code: 'BT101', day: 'Mon', start: '9:00 AM', end: '10:30 AM' },
                { code: 'CHEM101', day: 'Mon', start: '10:30 AM', end: '12:00 PM' },
                { code: 'MATH101', day: 'Mon', start: '12:00 PM', end: '1:00 PM' },
                { code: 'BT101', day: 'Wed', start: '9:00 AM', end: '10:30 AM' },
                { code: 'CHEM101', day: 'Wed', start: '10:30 AM', end: '12:00 PM' },
                { code: 'MATH101', day: 'Wed', start: '12:00 PM', end: '1:00 PM' },
                { code: 'BT101', day: 'Fri', start: '9:00 AM', end: '10:30 AM' },
                { code: 'CHEM101', day: 'Fri', start: '10:30 AM', end: '12:00 PM' },
                { code: 'MATH101', day: 'Fri', start: '12:00 PM', end: '1:00 PM' }
            ]
        },
        { 
            id: '31E1', name: 'BSBT - 31E1', 
            days: 'Mon-Wed-Fri', start: '5:00 PM', end: '9:00 PM', room: 'Lab 205',
            subjects: [
                { code: 'BT101', day: 'Mon', start: '5:00 PM', end: '6:30 PM' },
                { code: 'CHEM101', day: 'Mon', start: '6:30 PM', end: '8:00 PM' },
                { code: 'MATH101', day: 'Mon', start: '8:00 PM', end: '9:00 PM' },
                { code: 'BT101', day: 'Wed', start: '5:00 PM', end: '6:30 PM' },
                { code: 'CHEM101', day: 'Wed', start: '6:30 PM', end: '8:00 PM' },
                { code: 'MATH101', day: 'Wed', start: '8:00 PM', end: '9:00 PM' },
                { code: 'BT101', day: 'Fri', start: '5:00 PM', end: '6:30 PM' },
                { code: 'CHEM101', day: 'Fri', start: '6:30 PM', end: '8:00 PM' },
                { code: 'MATH101', day: 'Fri', start: '8:00 PM', end: '9:00 PM' }
            ]
        }
    ],
    'bs-business-admin': [
        { 
            id: '31M1', name: 'BSBA - 31M1', 
            days: 'Mon-Wed-Fri', start: '7:30 AM', end: '11:30 AM', room: 'Room 301',
            subjects: [
                { code: 'BA101', day: 'Mon', start: '7:30 AM', end: '9:00 AM' },
                { code: 'ECON101', day: 'Mon', start: '9:00 AM', end: '10:30 AM' },
                { code: 'ENG101', day: 'Mon', start: '10:30 AM', end: '11:30 AM' },
                { code: 'BA101', day: 'Wed', start: '7:30 AM', end: '9:00 AM' },
                { code: 'ECON101', day: 'Wed', start: '9:00 AM', end: '10:30 AM' },
                { code: 'ENG101', day: 'Wed', start: '10:30 AM', end: '11:30 AM' },
                { code: 'BA101', day: 'Fri', start: '7:30 AM', end: '9:00 AM' },
                { code: 'ECON101', day: 'Fri', start: '9:00 AM', end: '10:30 AM' },
                { code: 'ENG101', day: 'Fri', start: '10:30 AM', end: '11:30 AM' }
            ]
        },
        { 
            id: '31M2', name: 'BSBA - 31M2', 
            days: 'Mon-Wed-Fri', start: '8:00 AM', end: '12:00 PM', room: 'Room 302',
            subjects: [
                { code: 'BA101', day: 'Mon', start: '8:00 AM', end: '9:30 AM' },
                { code: 'ECON101', day: 'Mon', start: '9:30 AM', end: '11:00 AM' },
                { code: 'ENG101', day: 'Mon', start: '11:00 AM', end: '12:00 PM' },
                { code: 'BA101', day: 'Wed', start: '8:00 AM', end: '9:30 AM' },
                { code: 'ECON101', day: 'Wed', start: '9:30 AM', end: '11:00 AM' },
                { code: 'ENG101', day: 'Wed', start: '11:00 AM', end: '12:00 PM' },
                { code: 'BA101', day: 'Fri', start: '8:00 AM', end: '9:30 AM' },
                { code: 'ECON101', day: 'Fri', start: '9:30 AM', end: '11:00 AM' },
                { code: 'ENG101', day: 'Fri', start: '11:00 AM', end: '12:00 PM' }
            ]
        },
        { 
            id: '31E1', name: 'BSBA - 31E1', 
            days: 'Mon-Wed-Fri', start: '5:30 PM', end: '9:30 PM', room: 'Room 307',
            subjects: [
                { code: 'BA101', day: 'Mon', start: '5:30 PM', end: '7:00 PM' },
                { code: 'ECON101', day: 'Mon', start: '7:00 PM', end: '8:30 PM' },
                { code: 'ENG101', day: 'Mon', start: '8:30 PM', end: '9:30 PM' },
                { code: 'BA101', day: 'Wed', start: '5:30 PM', end: '7:00 PM' },
                { code: 'ECON101', day: 'Wed', start: '7:00 PM', end: '8:30 PM' },
                { code: 'ENG101', day: 'Wed', start: '8:30 PM', end: '9:30 PM' },
                { code: 'BA101', day: 'Fri', start: '5:30 PM', end: '7:00 PM' },
                { code: 'ECON101', day: 'Fri', start: '7:00 PM', end: '8:30 PM' },
                { code: 'ENG101', day: 'Fri', start: '8:30 PM', end: '9:30 PM' }
            ]
        }
    ],
    'md-medicine': [
        { 
            id: '31M1', name: 'MD - 31M1', 
            days: 'Mon-Fri', start: '7:00 AM', end: '4:00 PM', room: 'Medical Building 1',
            subjects: [
                { code: 'MD101', day: 'Mon', start: '7:00 AM', end: '10:00 AM' },
                { code: 'MD102', day: 'Mon', start: '10:00 AM', end: '1:00 PM' },
                { code: 'MD103', day: 'Mon', start: '1:00 PM', end: '4:00 PM' },
                { code: 'MD101', day: 'Tue', start: '7:00 AM', end: '10:00 AM' },
                { code: 'MD102', day: 'Tue', start: '10:00 AM', end: '1:00 PM' },
                { code: 'MD103', day: 'Tue', start: '1:00 PM', end: '4:00 PM' },
                { code: 'MD101', day: 'Wed', start: '7:00 AM', end: '10:00 AM' },
                { code: 'MD102', day: 'Wed', start: '10:00 AM', end: '1:00 PM' },
                { code: 'MD103', day: 'Wed', start: '1:00 PM', end: '4:00 PM' },
                { code: 'MD101', day: 'Thu', start: '7:00 AM', end: '10:00 AM' },
                { code: 'MD102', day: 'Thu', start: '10:00 AM', end: '1:00 PM' },
                { code: 'MD103', day: 'Thu', start: '1:00 PM', end: '4:00 PM' },
                { code: 'MD101', day: 'Fri', start: '7:00 AM', end: '10:00 AM' },
                { code: 'MD102', day: 'Fri', start: '10:00 AM', end: '1:00 PM' },
                { code: 'MD103', day: 'Fri', start: '1:00 PM', end: '4:00 PM' }
            ]
        },
        { 
            id: '31M2', name: 'MD - 31M2', 
            days: 'Mon-Fri', start: '8:00 AM', end: '5:00 PM', room: 'Medical Building 2',
            subjects: [
                { code: 'MD101', day: 'Mon', start: '8:00 AM', end: '11:00 AM' },
                { code: 'MD102', day: 'Mon', start: '11:00 AM', end: '2:00 PM' },
                { code: 'MD103', day: 'Mon', start: '2:00 PM', end: '5:00 PM' },
                { code: 'MD101', day: 'Tue', start: '8:00 AM', end: '11:00 AM' },
                { code: 'MD102', day: 'Tue', start: '11:00 AM', end: '2:00 PM' },
                { code: 'MD103', day: 'Tue', start: '2:00 PM', end: '5:00 PM' },
                { code: 'MD101', day: 'Wed', start: '8:00 AM', end: '11:00 AM' },
                { code: 'MD102', day: 'Wed', start: '11:00 AM', end: '2:00 PM' },
                { code: 'MD103', day: 'Wed', start: '2:00 PM', end: '5:00 PM' },
                { code: 'MD101', day: 'Thu', start: '8:00 AM', end: '11:00 AM' },
                { code: 'MD102', day: 'Thu', start: '11:00 AM', end: '2:00 PM' },
                { code: 'MD103', day: 'Thu', start: '2:00 PM', end: '5:00 PM' },
                { code: 'MD101', day: 'Fri', start: '8:00 AM', end: '11:00 AM' },
                { code: 'MD102', day: 'Fri', start: '11:00 AM', end: '2:00 PM' },
                { code: 'MD103', day: 'Fri', start: '2:00 PM', end: '5:00 PM' }
            ]
        }
    ],
    'bfa-fine-arts': [
        { 
            id: '31M1', name: 'BFA - 31M1', 
            days: 'Mon-Wed-Fri', start: '8:00 AM', end: '12:00 PM', room: 'Art Studio 1',
            subjects: [
                { code: 'FA101', day: 'Mon', start: '8:00 AM', end: '10:00 AM' },
                { code: 'FA102', day: 'Mon', start: '10:00 AM', end: '12:00 PM' },
                { code: 'FA101', day: 'Wed', start: '8:00 AM', end: '10:00 AM' },
                { code: 'FA102', day: 'Wed', start: '10:00 AM', end: '12:00 PM' },
                { code: 'FA101', day: 'Fri', start: '8:00 AM', end: '10:00 AM' },
                { code: 'FA102', day: 'Fri', start: '10:00 AM', end: '12:00 PM' }
            ]
        },
        { 
            id: '31M2', name: 'BFA - 31M2', 
            days: 'Mon-Wed-Fri', start: '9:00 AM', end: '1:00 PM', room: 'Art Studio 2',
            subjects: [
                { code: 'FA101', day: 'Mon', start: '9:00 AM', end: '11:00 AM' },
                { code: 'FA102', day: 'Mon', start: '11:00 AM', end: '1:00 PM' },
                { code: 'FA101', day: 'Wed', start: '9:00 AM', end: '11:00 AM' },
                { code: 'FA102', day: 'Wed', start: '11:00 AM', end: '1:00 PM' },
                { code: 'FA101', day: 'Fri', start: '9:00 AM', end: '11:00 AM' },
                { code: 'FA102', day: 'Fri', start: '11:00 AM', end: '1:00 PM' }
            ]
        }
    ],
    'bs-international-relations': [
        { 
            id: '31M1', name: 'BSIR - 31M1', 
            days: 'Mon-Wed-Fri', start: '8:00 AM', end: '12:00 PM', room: 'Room 401',
            subjects: [
                { code: 'IR101', day: 'Mon', start: '8:00 AM', end: '10:00 AM' },
                { code: 'POL101', day: 'Mon', start: '10:00 AM', end: '12:00 PM' },
                { code: 'IR101', day: 'Wed', start: '8:00 AM', end: '10:00 AM' },
                { code: 'POL101', day: 'Wed', start: '10:00 AM', end: '12:00 PM' },
                { code: 'IR101', day: 'Fri', start: '8:00 AM', end: '10:00 AM' },
                { code: 'POL101', day: 'Fri', start: '10:00 AM', end: '12:00 PM' }
            ]
        },
        { 
            id: '31M2', name: 'BSIR - 31M2', 
            days: 'Mon-Wed-Fri', start: '9:00 AM', end: '1:00 PM', room: 'Room 402',
            subjects: [
                { code: 'IR101', day: 'Mon', start: '9:00 AM', end: '11:00 AM' },
                { code: 'POL101', day: 'Mon', start: '11:00 AM', end: '1:00 PM' },
                { code: 'IR101', day: 'Wed', start: '9:00 AM', end: '11:00 AM' },
                { code: 'POL101', day: 'Wed', start: '11:00 AM', end: '1:00 PM' },
                { code: 'IR101', day: 'Fri', start: '9:00 AM', end: '11:00 AM' },
                { code: 'POL101', day: 'Fri', start: '11:00 AM', end: '1:00 PM' }
            ]
        }
    ],
    'default': [
        { 
            id: '31M1', name: 'Section 31M1', 
            days: 'Mon-Wed-Fri', start: '8:00 AM', end: '12:00 PM', room: 'Room 101',
            subjects: [
                { code: 'GEN101', day: 'Mon', start: '8:00 AM', end: '10:00 AM' },
                { code: 'GEN102', day: 'Mon', start: '10:00 AM', end: '12:00 PM' },
                { code: 'GEN101', day: 'Wed', start: '8:00 AM', end: '10:00 AM' },
                { code: 'GEN102', day: 'Wed', start: '10:00 AM', end: '12:00 PM' },
                { code: 'GEN101', day: 'Fri', start: '8:00 AM', end: '10:00 AM' },
                { code: 'GEN102', day: 'Fri', start: '10:00 AM', end: '12:00 PM' }
            ]
        },
        { 
            id: '31E1', name: 'Section 31E1', 
            days: 'Mon-Wed-Fri', start: '5:00 PM', end: '9:00 PM', room: 'Room 102',
            subjects: [
                { code: 'GEN101', day: 'Mon', start: '5:00 PM', end: '7:00 PM' },
                { code: 'GEN102', day: 'Mon', start: '7:00 PM', end: '9:00 PM' },
                { code: 'GEN101', day: 'Wed', start: '5:00 PM', end: '7:00 PM' },
                { code: 'GEN102', day: 'Wed', start: '7:00 PM', end: '9:00 PM' },
                { code: 'GEN101', day: 'Fri', start: '5:00 PM', end: '7:00 PM' },
                { code: 'GEN102', day: 'Fri', start: '7:00 PM', end: '9:00 PM' }
            ]
        }
    ]
};

// Modal Payment Calculation Function
function updateModalPayment() {
    const programSearch = document.getElementById('modalProgramSearch');
    const programList = document.getElementById('modalProgramList');
    const selectedOption = Array.from(programList.options).find(option => option.value === programSearch.value);
    
    const tuition = selectedOption ? parseInt(selectedOption.getAttribute('data-tuition')) || 0 : 0;
    
    // Update hidden select value
    const programSelect = document.getElementById('modalProgramSelect');
    programSelect.value = selectedOption ? selectedOption.getAttribute('data-value') : '';
    
    const registrationFee = 500;
    const libraryFee = 200;
    const studentIdFee = 50;
    const labFee = tuition > 50000 ? 5000 : 2000;
    
    const total = tuition + registrationFee + libraryFee + studentIdFee + labFee;
    
    document.getElementById('modalTuitionFee').textContent = '₱' + tuition.toLocaleString();
    document.getElementById('modalLabFee').textContent = '₱' + labFee.toLocaleString();
    document.getElementById('modalTotalPayment').textContent = '₱' + total.toLocaleString();
    
    // Show section selection modal if program is selected
    if (selectedOption && programSelect.value) {
        showSectionSelection(programSelect.value, programSearch.value);
    }
}

// Section Selection Modal Functions
function showSectionSelection(programValue, programName) {
    const modal = document.getElementById('sectionSelectionModal');
    const content = document.getElementById('sectionSelectionContent');
    const programNameDisplay = document.getElementById('selectedProgramName');
    const sectionOptions = document.getElementById('sectionOptions');
    
    programNameDisplay.textContent = programName;
    
    // Get sections for the selected program
    const sections = sectionData[programValue] || sectionData['default'];
    
    // Populate section options with subject tables like the reference image
    sectionOptions.innerHTML = sections.map(section => `
        <div class="border border-gray-200 rounded-lg overflow-hidden">
            <button onclick="selectSection('${section.id}', '${section.name}', '${section.days}', '${section.start} - ${section.end}', '${section.room}')" class="w-full bg-[#007dfe] text-white py-3 px-4 font-medium hover:bg-[#004b87] transition">
                Enroll to this section
            </button>
            <div class="p-4">
                <h4 class="font-bold text-[#007dfe] text-xl mb-3">${section.name}</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm border-collapse">
                        <thead>
                            <tr class="bg-gray-100">
                                <th class="border border-gray-300 px-3 py-2 text-left">Subject</th>
                                <th class="border border-gray-300 px-3 py-2 text-left">Day</th>
                                <th class="border border-gray-300 px-3 py-2 text-left">Start</th>
                                <th class="border border-gray-300 px-3 py-2 text-left">End</th>
                                <th class="border border-gray-300 px-3 py-2 text-center">Enroll</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${section.subjects.map(subject => `
                                <tr class="border-b">
                                    <td class="border border-gray-300 px-3 py-2">${subject.code}</td>
                                    <td class="border border-gray-300 px-3 py-2">${subject.day}</td>
                                    <td class="border border-gray-300 px-3 py-2">${subject.start}</td>
                                    <td class="border border-gray-300 px-3 py-2">${subject.end}</td>
                                    <td class="border border-gray-300 px-3 py-2 text-center">
                                        <i class="fas fa-check text-green-500"></i>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <p class="text-gray-500 text-sm mt-3">${section.subjects.length} Compatible Subjects</p>
                <button onclick="selectSection('${section.id}', '${section.name}', '${section.days}', '${section.start} - ${section.end}', '${section.room}')" class="w-full mt-3 bg-[#007dfe] text-white py-3 px-4 font-medium hover:bg-[#004b87] transition">
                    Enroll to this section
                </button>
            </div>
        </div>
    `).join('');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideSectionSelection() {
    const modal = document.getElementById('sectionSelectionModal');
    const content = document.getElementById('sectionSelectionContent');
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

function selectSection(sectionId, sectionName, days, time, room) {
    const sectionSelect = document.getElementById('modalSectionSelect');
    const sectionDisplay = document.getElementById('modalSectionDisplay');
    
    sectionSelect.value = sectionId;
    sectionDisplay.value = `${sectionName} (${days}, ${time})`;
    
    hideSectionSelection();
    
    showToast(`Selected: ${sectionName} - ${days}, ${time}`, 'success');
}

// Toggle Online Payment Fields
function toggleOnlinePaymentFields() {
    const paymentMethod = document.getElementById('modalPaymentMethod').value;
    const onlineDetails = document.getElementById('onlinePaymentDetails');
    
    if (paymentMethod === 'online') {
        onlineDetails.classList.remove('hidden');
        document.getElementById('modalCardNumber').setAttribute('required', 'true');
        document.getElementById('modalCardExpiry').setAttribute('required', 'true');
        document.getElementById('modalCardCvv').setAttribute('required', 'true');
    } else {
        onlineDetails.classList.add('hidden');
        document.getElementById('modalCardNumber').removeAttribute('required');
        document.getElementById('modalCardExpiry').removeAttribute('required');
        document.getElementById('modalCardCvv').removeAttribute('required');
    }
}

// News Modal Functions
function showNewsModal(title, category, content, imgUrl) {
    const modal = document.getElementById('newsModal');
    const modalBox = document.getElementById('newsModalBox');
    const titleEl = document.getElementById('newsModalTitle');
    const categoryEl = document.getElementById('newsModalCategory');
    const contentEl = document.getElementById('newsModalText');
    const bannerImg = document.getElementById('newsModalBannerImg');
    
    titleEl.textContent = title;
    categoryEl.textContent = category;
    contentEl.innerHTML = content;
    
    if (bannerImg) {
        bannerImg.src = imgUrl || 'img/sample.png';
    }
    
    // Set category color
    if (category === 'ACADEMIC') {
        categoryEl.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-[#007dfe] text-white';
    } else if (category === 'EVENT') {
        categoryEl.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-[#fbc707] text-[#004b87]';
    } else if (category === 'ENROLLMENT') {
        categoryEl.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-green-500 text-white';
    } else if (category === 'SPORTS') {
        categoryEl.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-red-500 text-white';
    } else {
        categoryEl.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-[#007dfe] text-white';
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modalBox.classList.remove('scale-95', 'opacity-0');
        modalBox.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideNewsModal() {
    const modal = document.getElementById('newsModal');
    const modalBox = document.getElementById('newsModalBox');
    modalBox.classList.remove('scale-100', 'opacity-100');
    modalBox.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function showDataPrivacyModal(event) {
    if (event) event.preventDefault();
    Swal.fire({
        title: 'Data Privacy Policy',
        html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.6; max-height: 400px; overflow-y: auto; padding-right: 5px;">
                <p style="margin-bottom: 12px;"><strong>1. Collection of Information</strong><br>
                We collect personal information including full name, birth date, contact numbers, email address, academic history, parent/guardian details, and relevant documents during the enrollment process.</p>
                
                <p style="margin-bottom: 12px;"><strong>2. Purpose of Processing</strong><br>
                Your personal details are collected and processed solely for evaluation, class organization, student records management, administrative tasks, and compliance with institutional and state requirements.</p>
                
                <p style="margin-bottom: 12px;"><strong>3. Information Security</strong><br>
                We implement physical, electronic, and administrative safeguards to protect your personal information against unauthorized access, use, or disclosure.</p>
                
                <p style="margin-bottom: 12px;"><strong>4. Disclosure & Sharing</strong><br>
                We do not sell, rent, or trade your personal information. Data may be shared only with authorized school personnel and regulatory bodies (e.g., Department of Education) as mandated by law.</p>
                
                <p><strong>5. Your Rights</strong><br>
                Under the Data Privacy Act of 2012, you have the right to ask for a copy of any personal information we hold about you, and to correct or update it if necessary.</p>
            </div>
        `,
        confirmButtonText: 'I Understand',
        confirmButtonColor: '#3085d6',
        width: '600px'
    });
}

function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input && icon) {
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
}

// Interactive School Calendar
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

let currentCalendarDate = new Date(2026, 6, 1); // Start at July 2026

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const headerTitle = document.getElementById('calendarMonthYear');
    if (headerTitle) {
        headerTitle.textContent = `${monthNames[month]} ${year}`;
    }

    const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week for 1st of month
    const lastDay = new Date(year, month + 1, 0).getDate(); // Number of days in current month
    const prevLastDay = new Date(year, month, 0).getDate(); // Number of days in previous month

    const calendarDaysContainer = document.getElementById('calendarDays');
    if (!calendarDaysContainer) return;
    calendarDaysContainer.innerHTML = '';

    // Render empty spaces for previous month's ending days
    for (let x = firstDayIndex; x > 0; x--) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('py-3', 'text-gray-300', 'select-none', 'text-center');
        dayDiv.textContent = prevLastDay - x + 1;
        calendarDaysContainer.appendChild(dayDiv);
    }

    // Render current month's days
    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'py-3 rounded-xl text-center font-bold relative cursor-pointer transition hover:bg-blue-100/60 hover:text-blue-700 text-slate-700';
        dayDiv.textContent = i;
        
        // Format current date as YYYY-MM-DD
        const formattedMonth = String(month + 1).padStart(2, '0');
        const formattedDay = String(i).padStart(2, '0');
        const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

        // Find events on this date
        const dayEvents = schoolEvents.filter(e => e.date === dateStr);

        if (dayEvents.length > 0) {
            const event = dayEvents[0];
            dayDiv.style.backgroundColor = event.color + '20'; // Light transparent background
            dayDiv.style.color = event.color;
            dayDiv.classList.add('font-bold', 'border', 'border-current');
            
            // Add tooltip indicator dot
            const dot = document.createElement('span');
            dot.style.backgroundColor = event.color;
            dot.className = 'absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full';
            dayDiv.appendChild(dot);

            // Click event to show event detail
            dayDiv.onclick = () => showCalendarEventDetail(event);
            dayDiv.title = event.title; // Default HTML tooltip
        }

        calendarDaysContainer.appendChild(dayDiv);
    }

    // Render next month's starting days to fill grid
    const totalRenderedCells = firstDayIndex + lastDay;
    const remainingCells = 42 - totalRenderedCells; // Standard 6-row grid

    for (let j = 1; j <= (remainingCells > 7 ? remainingCells % 7 : remainingCells); j++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('py-3', 'text-slate-400', 'select-none', 'text-center');
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
    
    // Filter events for this month
    const monthEvents = schoolEvents.filter(e => e.date.startsWith(monthPrefix));

    if (monthEvents.length === 0) {
        eventsListContainer.innerHTML = `
            <div class="text-center py-8 text-slate-400">
                <i class="fas fa-calendar-times text-3xl mb-2 text-slate-300"></i>
                <p class="text-sm">No scheduled events for this month</p>
            </div>
        `;
        return;
    }

    monthEvents.forEach(event => {
        const eventDate = new Date(event.date);
        const dayNum = String(eventDate.getDate()).padStart(2, '0');
        const monthShort = eventDate.toLocaleString('default', { month: 'short' });

        const eventCard = document.createElement('div');
        eventCard.className = `glass-card rounded-xl shadow-sm p-4 border border-slate-200/80 hover:shadow-md transition cursor-pointer flex items-start space-x-4 ${event.bgClass}`;
        eventCard.onclick = () => showCalendarEventDetail(event);
        
        eventCard.innerHTML = `
            <div class="${event.badgeClass} p-3 rounded-lg text-center min-w-[60px] font-bold shadow-sm shrink-0">
                <div class="text-xl">${dayNum}</div>
                <div class="text-xs uppercase">${monthShort}</div>
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-800 text-sm mb-1">${event.title}</h4>
                <p class="text-slate-600 text-xs line-clamp-2 leading-relaxed">${event.desc}</p>
            </div>
        `;
        eventsListContainer.appendChild(eventCard);
    });
}

function showCalendarEventDetail(event) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: event.title,
            html: `
                <div class="text-left mt-4 space-y-4 font-sans">
                    <p class="text-gray-600"><strong class="text-gray-800">Date:</strong> ${new Date(event.date).toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p class="text-gray-600"><strong class="text-gray-800">Category:</strong> <span class="capitalize px-2 py-1 rounded text-xs font-semibold" style="background-color: ${event.color}20; color: ${event.color}">${event.category}</span></p>
                    <p class="text-gray-600 mt-2 leading-relaxed">${event.desc}</p>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Close',
            confirmButtonColor: '#007dfe'
        });
    } else {
        alert(`${event.title}\n\nDate: ${event.date}\nDescription: ${event.desc}`);
    }
}

// Expose functions globally for click handlers in HTML
window.prevCalendarMonth = prevCalendarMonth;
window.nextCalendarMonth = nextCalendarMonth;
window.renderCalendar = renderCalendar;
window.showCalendarEventDetail = showCalendarEventDetail;

// Programs Filtering
function filterPrograms(category) {
    const buttons = document.querySelectorAll('.program-filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active', 'bg-blue-600', 'text-white', 'shadow-md');
        btn.classList.add('bg-white', 'text-gray-700', 'border', 'border-gray-200', 'hover:bg-gray-50');
    });

    const activeBtn = document.querySelector(`button[onclick="filterPrograms('${category}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-blue-600', 'text-white', 'shadow-md');
        activeBtn.classList.remove('bg-white', 'text-gray-700', 'border', 'border-gray-200', 'hover:bg-gray-50');
    }

    const cards = document.querySelectorAll('#programsGrid > div');
    cards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (category === 'all' || cardCategory === category) {
            card.style.display = 'block';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            }, 50);
        } else {
            card.style.display = 'none';
        }
    });
}

// Strand Recommendation Quiz Logic
const quizQuestions = [
    {
        title: "What subject or activity excites you the most?",
        options: [
            { text: "Building software, designing websites, or coding applications", score: { ict: 5, css: 2 } },
            { text: "Troubleshooting hardware, computer systems, or networks", score: { css: 5, ict: 2 } },
            { text: "Advanced mathematics, physics, engineering, or scientific research", score: { stem: 5 } },
            { text: "Running a business, accounting, finance, or marketing products", score: { abm: 5 } },
            { text: "Cooking, baking, hotel management, or culinary arts", score: { he: 5 } },
            { text: "Writing articles, debating, psychology, or understanding society", score: { humss: 5 } }
        ]
    },
    {
        title: "What is your dream career path?",
        options: [
            { text: "Software Engineer, Web Developer, or IT Consultant", score: { ict: 5 } },
            { text: "Computer Hardware Technician, Network Admin, or System Analyst", score: { css: 5 } },
            { text: "Civil/Mechanical/Chemical Engineer, Scientist, or Doctor", score: { stem: 5 } },
            { text: "Business Owner, Accountant, Manager, or Financial Analyst", score: { abm: 5 } },
            { text: "Chef, Pastry Maker, Restaurant Owner, or Hotel Manager", score: { he: 5 } },
            { text: "Journalist, Lawyer, Teacher, or Public Relations Specialist", score: { humss: 5 } }
        ]
    },
    {
        title: "How do you prefer to solve problems?",
        options: [
            { text: "By writing logical algorithms and software solutions on a computer", score: { ict: 5 } },
            { text: "By physically diagnosing, repairing, and assembling hardware components", score: { css: 5 } },
            { text: "By applying formulas, scientific theories, and data analysis", score: { stem: 5 } },
            { text: "By analyzing business numbers, market dynamics, and customer needs", score: { abm: 5 } },
            { text: "By preparing recipes, organizing dishes, and coordinating hospitality services", score: { he: 5 } },
            { text: "By communicating, analyzing human behaviors, and writing arguments", score: { humss: 5 } }
        ]
    }
];

let currentQuestionIndex = 0;
let quizScores = { css: 0, ict: 0, stem: 0, abm: 0, he: 0, humss: 0 };
let recommendedStrandId = "";

function startStrandQuiz() {
    document.getElementById('quiz-intro').classList.add('hidden');
    document.getElementById('quiz-questions').classList.remove('hidden');
    document.getElementById('quiz-result').classList.add('hidden');
    currentQuestionIndex = 0;
    quizScores = { css: 0, ict: 0, stem: 0, abm: 0, he: 0, humss: 0 };
    showQuizQuestion();
}

function showQuizQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    document.getElementById('quiz-progress-text').textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
    document.getElementById('quiz-progress-bar').style.width = `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`;
    document.getElementById('quiz-question-title').textContent = question.title;
    
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 rounded-xl p-4 transition duration-200 text-sm font-semibold flex items-center justify-between group';
        btn.innerHTML = `
            <span>${opt.text}</span>
            <i class="fas fa-chevron-right opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"></i>
        `;
        btn.onclick = () => selectQuizOption(opt.score);
        optionsContainer.appendChild(btn);
    });
}

function selectQuizOption(score) {
    for (let key in score) {
        if (quizScores.hasOwnProperty(key)) {
            quizScores[key] += score[key];
        }
    }
    
    currentQuestionIndex++;
    if (currentQuestionIndex < quizQuestions.length) {
        showQuizQuestion();
    } else {
        showQuizResult();
    }
}

function showQuizResult() {
    document.getElementById('quiz-questions').classList.add('hidden');
    document.getElementById('quiz-result').classList.remove('hidden');
    
    let highestStrand = '';
    let highestScore = -1;
    for (let key in quizScores) {
        if (quizScores[key] > highestScore) {
            highestScore = quizScores[key];
            highestStrand = key;
        }
    }
    
    recommendedStrandId = highestStrand;
    
    const resultDetails = {
        css: {
            name: "Computer System Servicing (CSS)",
            icon: "fa-desktop",
            desc: "You are highly suited for computer hardware diagnostics, operating systems configuration, networking setup, and device troubleshooting."
        },
        ict: {
            name: "Information & Communications Technology (ICT)",
            icon: "fa-laptop-code",
            desc: "You have strong alignment with computer programming, web applications development, databases, and general software engineering careers."
        },
        stem: {
            name: "STEM Track",
            icon: "fa-flask",
            desc: "Your logical reasoning matches mathematics, chemistry, physics, and biological sciences. Perfect for future scientists and engineers."
        },
        abm: {
            name: "ABM Track",
            icon: "fa-chart-line",
            desc: "You exhibit strong skills for financial management, marketing strategies, business math, accounting records, and entrepreneurship."
        },
        he: {
            name: "TVL - HE (Home Economics)",
            icon: "fa-utensils",
            desc: "Your style aligns with culinary operations, hotel hospitality services, bread and pastry production, and catering business startups."
        },
        humss: {
            name: "HUMSS Track",
            icon: "fa-users",
            desc: "You align with public communication, community engagement, literature, psychological behavior studies, law, and journalism."
        }
    };
    
    const res = resultDetails[highestStrand] || resultDetails.stem;
    
    document.getElementById('result-icon').className = `fas ${res.icon} text-5xl text-[#fbc707] mb-4 block`;
    document.getElementById('result-strand-name').textContent = res.name;
    document.getElementById('result-strand-desc').textContent = res.desc;
}

function viewRecommendedStrand() {
    if (!recommendedStrandId) return;
    
    const triggerMap = {
        css: "Computer System Servicing",
        ict: "Information & Communications",
        stem: "STEM",
        abm: "ABM",
        he: "TVL - HE",
        humss: "HUMSS"
    };
    
    const searchString = triggerMap[recommendedStrandId];
    if (searchString) {
        const buttons = Array.from(document.querySelectorAll('#programsGrid button'));
        const targetBtn = buttons.find(btn => {
            const onclickAttr = btn.getAttribute('onclick') || '';
            return onclickAttr.includes(searchString);
        });
        
        if (targetBtn) {
            targetBtn.click();
        }
    }
}

function resetStrandQuiz() {
    document.getElementById('quiz-intro').classList.remove('hidden');
    document.getElementById('quiz-questions').classList.add('hidden');
    document.getElementById('quiz-result').classList.add('hidden');
}

// Expose quiz and filter functions globally
window.filterPrograms = filterPrograms;
window.startStrandQuiz = startStrandQuiz;
window.resetStrandQuiz = resetStrandQuiz;
window.viewRecommendedStrand = viewRecommendedStrand;

function toggleSidebar() {
    const sidebar = document.getElementById('sidebarNav');
    const main = document.querySelector('main');
    const toggleIcon = document.getElementById('sidebarToggleIcon');
    
    if (sidebar && main) {
        sidebar.classList.toggle('expanded');
        main.classList.toggle('sidebar-expanded');
        
        // Toggle icon between bars and double chevron left
        if (sidebar.classList.contains('expanded')) {
            toggleIcon.className = 'fas fa-angle-double-left text-xl';
        } else {
            toggleIcon.className = 'fas fa-bars text-xl';
        }
    }
}

window.toggleSidebar = toggleSidebar;

// Duplicate updateEnrollmentSummary removed — canonical version is defined at line ~1938
