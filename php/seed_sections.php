<?php
/**
 * Seeder v4: Comprehensive High School Curriculum & 7:00 AM - 12:00 PM schedules
 * Spreads multiple subjects per day with zero teacher/section conflicts.
 */

if (php_sapi_name() === 'cli' || basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    header('Content-Type: text/plain; charset=utf-8');
}
error_reporting(E_ALL);
ini_set('display_errors', 1);

$host   = '127.0.0.1';
$dbname = 'enrollment_system';
$user   = 'root';
$pass   = '';

if (!isset($pdo)) {
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (PDOException $e) {
        die("DB connection failed: " . $e->getMessage() . "\n");
    }
}

// Clear tables
$pdo->exec("SET FOREIGN_KEY_CHECKS=0");
$pdo->exec("TRUNCATE TABLE section_schedules");
$pdo->exec("TRUNCATE TABLE sections");
$pdo->exec("TRUNCATE TABLE teachers");
$pdo->exec("TRUNCATE TABLE subjects");
$pdo->exec("SET FOREIGN_KEY_CHECKS=1");
echo "Tables cleared successfully.\n\n";

// ── 1. SEED SUBJECTS ─────────────────────────────────────────
$subjectsData = [
    // JHS Subjects
    ['jhs', 'ENG-JHS', 'English', 'Language arts, grammar, reading comprehension, and world literature.'],
    ['jhs', 'FIL-JHS', 'Filipino', 'Wika at Panitikan.'],
    ['jhs', 'MATH-JHS', 'Mathematics', 'Algebra, Geometry, Trigonometry, Statistics.'],
    ['jhs', 'SCI-JHS', 'Science', 'Integrated Earth Science, Biology, Chemistry, and Physics.'],
    ['jhs', 'AP-JHS', 'Araling Panlipunan', 'Philippine History, World History, Economics.'],
    ['jhs', 'MAPEH-JHS', 'MAPEH', 'Music, Arts, Physical Education, and Health.'],
    ['jhs', 'ESP-JHS', 'Edukasyon sa Pagpapakatao (EsP)', 'Values Education, GMRC, ethics, and character building.'],
    ['jhs', 'TLE-JHS', 'Technology & Livelihood Education', 'Agri-Fishery Arts, Home Economics, Industrial Arts, and ICT.'],

    // SHS Core (Minor) Subjects
    ['core', 'CORE-OC', 'Oral Communication', 'Development of listening and speaking skills for effective communication.'],
    ['core', 'CORE-RW', 'Reading and Writing', 'Academic reading and writing skills.'],
    ['core', 'CORE-GM', 'General Mathematics', 'Functions, business math, and logic.'],
    ['core', 'CORE-SP', 'Statistics and Probability', 'Data analysis, probability distributions, hypothesis testing.'],
    ['core', 'CORE-ELS', 'Earth and Life Science', 'Earth science, biology, and life processes.'],
    ['core', 'CORE-KPW', 'Komunikasyon at Pananaliksik', 'Komunikasyon at pananaliksik sa wika at kulturang Pilipino.'],
    ['core', 'CORE-PE1', 'Physical Education and Health 1', 'Fitness and active recreation.'],
    ['core', 'CORE-PD', 'Personal Development', 'Self-development, relationships, and career planning.'],
    ['core', 'CORE-IPHP', 'Introduction to Philosophy', 'Philosophical reflection and critical thinking.'],
    ['core', 'CORE-MIL', 'Media and Information Literacy', 'Understanding media formats, digital literacy, and information sources.'],
    ['core', 'CORE-CPAR', 'Contemporary Philippine Arts', 'Arts from the regions of the Philippines.'],
    ['core', 'CORE-UCSP', 'Understanding Culture, Society, and Politics', 'Anthropology, sociology, and political science.'],
    ['core', 'CORE-PE3', 'Physical Education and Health 3', 'Sports, dance, and health education.'],

    // SHS Applied Subjects
    ['core', 'APP-EAPP', 'English for Academic & Professional Purposes', 'Writing reports, papers, and reviews.'],
    ['core', 'APP-PR2', 'Practical Research 2', 'Quantitative research design and data collection.'],
    ['core', 'APP-ETECH', 'Empowerment Technologies', 'ICT literacy and productivity tools.'],
    ['core', 'APP-ENTR', 'Entrepreneurship', 'Business plan formulation and start-up operations.'],
    ['core', 'APP-3I', 'Inquiries, Investigations, and Immersion', 'Research defense and execution.'],

    // STEM Specialized
    ['stem', 'STEM-PC', 'Pre-Calculus', 'Analytic geometry, mathematical induction, and trigonometry.'],
    ['stem', 'STEM-BC', 'Basic Calculus', 'Limits, continuity, derivatives, and integrals.'],
    ['stem', 'STEM-BIO2', 'General Biology 2', 'Genetics, evolution, systematics, and plant/animal biology.'],
    ['stem', 'STEM-CHEM1', 'General Chemistry 1', 'Matter, atoms, stoichiometry, gases, and thermochemistry.'],
    ['stem', 'STEM-PHYS1', 'General Physics 1', 'Mechanics, heat, and thermodynamics.'],

    // ABM Specialized
    ['abm', 'ABM-MATH', 'Business Math', 'Commercial computations and mark-ups.'],
    ['abm', 'ABM-MGMT', 'Organization & Management', 'Business planning, leading, and control.'],
    ['abm', 'ABM-ECON', 'Applied Economics', 'Basic economic principles and Philippine issues.'],
    ['abm', 'ABM-FABM2', 'FABM 2', 'Financial statements and business taxes.'],
    ['abm', 'ABM-FIN', 'Business Finance', 'Financial planning, investments, and budgets.'],

    // HUMSS Specialized
    ['humss', 'HUMSS-CW', 'Creative Writing', 'Fiction, poetry, and drama writing.'],
    ['humss', 'HUMSS-CNF', 'Creative Nonfiction', 'Essays and literary journalism.'],
    ['humss', 'HUMSS-TN', 'Trends & Critical Thinking', 'Analyzing local and global trends.'],
    ['humss', 'HUMSS-PPG', 'Philippine Politics & Gov.', 'Constitution and branches of government.'],
    ['humss', 'HUMSS-DISS', 'Disciplines in Social Sciences', 'Social science disciplines and theories.'],

    // TVL-HE Specialized
    ['tvl-he', 'HE-COOK', 'Cookery & Culinary Arts', 'Food prep, kitchen safety, and culinary operations.'],
    ['tvl-he', 'HE-BPP', 'Bread & Pastry Production', 'Breads, pastries, cakes, and desserts.'],
    ['tvl-he', 'HE-FBS', 'Food & Beverage Services', 'Dining service, table setting, and guest service.'],
    ['tvl-he', 'HE-HK', 'Housekeeping Services', 'Hotel room maintenance and laundry.'],
    ['tvl-he', 'HE-TOUR', 'Tourism Promotion Services', 'Itinerary planning and tour guiding.'],

    // TVL-ICT Specialized
    ['tvl-ict', 'ICT-CSS', 'Computer Systems Servicing', 'Computer hardware, OS, and networking.'],
    ['tvl-ict', 'ICT-PROG', 'Computer Programming', 'Programming fundamentals and logic.'],
    ['tvl-ict', 'ICT-WEB', 'Web Design & Development', 'HTML, CSS, JavaScript, and responsive design.'],
    ['tvl-ict', 'ICT-ANIM', 'Animation & Illustration', 'Digital drawing and keyframe animation.'],

    // TVL-IA Specialized
    ['tvl-ia', 'IA-SMAW', 'Shielded Metal Arc Welding', 'Welding safety and metal arc techniques.'],
    ['tvl-ia', 'IA-EIM', 'Electrical Installation', 'Building wiring and safety systems.'],
    ['tvl-ia', 'IA-AUTO', 'Automotive Servicing', 'Engine repair and chassis tuning.'],
    ['tvl-ia', 'IA-DRAFT', 'Technical Drafting / CAD', 'CAD drafting and blueprints.'],
];

function getSemesterForSubject($levelStrand, $code) {
    if ($levelStrand === 'jhs') {
        return null;
    }
    $sem1Codes = [
        'CORE-OC', 'CORE-GM', 'CORE-ELS', 'CORE-KPW', 
        'CORE-IPHP', 'CORE-MIL', 'CORE-CPAR', 'CORE-UCSP',
        'STEM-PC', 'STEM-PHYS1',
        'ABM-MATH', 'ABM-ECON',
        'HUMSS-CW', 'HUMSS-TN',
        'HE-COOK', 'HE-FBS',
        'ICT-CSS', 'ICT-WEB',
        'IA-SMAW', 'IA-AUTO'
    ];
    if (in_array($code, $sem1Codes, true)) {
        return 1;
    }
    return 2;
}

$insSubject = $pdo->prepare("INSERT INTO subjects (level_strand, code, name, description, semester) VALUES (?,?,?,?,?)");
foreach ($subjectsData as $s) {
    $sem = getSemesterForSubject($s[0], $s[1]);
    $insSubject->execute([$s[0], $s[1], $s[2], $s[3], $sem]);
}
echo "Seeded " . count($subjectsData) . " subjects.\n";

// Load subject mapping
$subjectMap = [];
foreach ($pdo->query("SELECT id, code, level_strand FROM subjects")->fetchAll() as $r) {
    $subjectMap[$r['code']] = [
        'id' => (int)$r['id'],
        'level_strand' => $r['level_strand']
    ];
}

// ── 2. SEED TEACHERS ─────────────────────────────────────────
$teachersData = [
    // JHS Departments (2 teachers per department)
    ['English', 'Mrs. Sarah Jenkins'],
    ['English', 'Mr. David Wilson'],
    ['Filipino', 'Bb. Ana Maria'],
    ['Filipino', 'G. Juan Santos'],
    ['Mathematics', 'Mr. Albert Einstein Cruz'],
    ['Mathematics', 'Mrs. Grace Hopper Bautista'],
    ['Science', 'Dr. Isaac Newton Garcia'],
    ['Science', 'Ms. Marie Curie Roxas'],
    ['Social Sciences', 'Mr. Rizal Bonifacio'],
    ['Social Sciences', 'Ms. Cory Aquino'],
    ['MAPEH', 'Coach Manny Pacquiao'],
    ['MAPEH', 'Ms. Lea Salonga'],
    ['Social Sciences', 'Father Pius Flores'], // EsP
    ['Social Sciences', 'Sister Teresa Cruz'], // EsP
    ['TLE', 'Mr. MacGyver Perez'],
    ['TLE', 'Mrs. Martha Stewart Reyes'],

    // SHS Departments
    // English & Applied (6 teachers)
    ['English', 'Dr. Arthur Conan Doyle'],
    ['English', 'Ms. Virginia Woolf'],
    ['English', 'Mr. William Shakespeare'],
    ['English', 'Ms. Emily Dickinson'],
    ['English', 'Mr. George Orwell'],
    ['English', 'Ms. Jane Austen'],
    // Math & Science (6 teachers)
    ['Mathematics', 'Mr. Pythagoras Reyes'],
    ['Mathematics', 'Ms. Ada Lovelace Santos'],
    ['Mathematics', 'Mr. Isaac Newton Aquino'],
    ['Mathematics', 'Ms. Katherine Johnson'],
    ['Science', 'Mr. Charles Darwin'],
    ['Science', 'Ms. Marie Curie (SHS)'],
    // Social Sciences (6 teachers)
    ['Social Sciences', 'Mr. Socrates Dela Cruz'],
    ['Social Sciences', 'Ms. Hannah Arendt'],
    ['Social Sciences', 'Mr. Karl Marx Ramos'],
    ['Social Sciences', 'Ms. Simone de Beauvoir'],
    ['MAPEH', 'Mr. Nikola Tesla (PE)'],
    ['MAPEH', 'Ms. Rosalind Franklin (PE)'],
    // Business (4 teachers)
    ['Business', 'Mr. Warren Buffett'],
    ['Business', 'Ms. Abigail Adams'],
    ['Business', 'Mr. Adam Smith'],
    ['Business', 'Ms. Sheryl Sandberg'],
    // TVL HE (4 teachers)
    ['TVL-HE', 'Chef Gordon Ramsay'],
    ['TVL-HE', 'Chef Julia Child'],
    ['TVL-HE', 'Ms. Gloria Castillo'],
    ['TVL-HE', 'Ms. Vivian Ocampo'],
    // TVL ICT (4 teachers)
    ['TVL-ICT', 'Mr. Alan Turing'],
    ['TVL-ICT', 'Mr. Linus Torvalds'],
    ['TVL-ICT', 'Mr. Bryan Santos'],
    ['TVL-ICT', 'Mr. Ian Gomez'],
    // TVL IA (4 teachers)
    ['TVL-IA', 'Mr. Henry Ford'],
    ['TVL-IA', 'Mr. Nikola Tesla (IA)'],
    ['TVL-IA', 'Mr. Renato Cruz'],
    ['TVL-IA', 'Mr. Eduardo Medina'],
];

$insTeacher = $pdo->prepare("INSERT INTO teachers (department, name) VALUES (?,?)");
foreach ($teachersData as $t) {
    $insTeacher->execute($t);
}
echo "Seeded " . count($teachersData) . " teachers.\n";

// Load teachers by department
$teachersByDept = [];
foreach ($pdo->query("SELECT id, department, name FROM teachers")->fetchAll() as $r) {
    $teachersByDept[$r['department']][] = (int)$r['id'];
}

// ── 3. CURRICULUM SUBJECT TO DEPARTMENT MAP ───────────────────
function getDeptForSubject($subCode) {
    if (strpos($subCode, 'JHS') !== false) {
        if (strpos($subCode, 'ENG') !== false) return 'English';
        if (strpos($subCode, 'FIL') !== false) return 'Filipino';
        if (strpos($subCode, 'MATH') !== false) return 'Mathematics';
        if (strpos($subCode, 'SCI') !== false) return 'Science';
        if (strpos($subCode, 'AP') !== false) return 'Social Sciences';
        if (strpos($subCode, 'MAPEH') !== false) return 'MAPEH';
        if (strpos($subCode, 'ESP') !== false) return 'Social Sciences';
        if (strpos($subCode, 'TLE') !== false) return 'TLE';
    }

    // SHS
    if (strpos($subCode, 'CORE-OC') !== false || strpos($subCode, 'CORE-RW') !== false || strpos($subCode, 'APP-EAPP') !== false || strpos($subCode, 'APP-PR2') !== false || strpos($subCode, 'APP-3I') !== false || strpos($subCode, 'HUMSS-CW') !== false || strpos($subCode, 'HUMSS-CNF') !== false) {
        return 'English';
    }
    if (strpos($subCode, 'CORE-GM') !== false || strpos($subCode, 'CORE-SP') !== false || strpos($subCode, 'STEM-PC') !== false || strpos($subCode, 'STEM-BC') !== false) {
        return 'Mathematics';
    }
    if (strpos($subCode, 'CORE-ELS') !== false || strpos($subCode, 'STEM-BIO2') !== false || strpos($subCode, 'STEM-CHEM1') !== false || strpos($subCode, 'STEM-PHYS1') !== false) {
        return 'Science';
    }
    if (strpos($subCode, 'CORE-KPW') !== false || strpos($subCode, 'CORE-PD') !== false || strpos($subCode, 'CORE-IPHP') !== false || strpos($subCode, 'CORE-MIL') !== false || strpos($subCode, 'CORE-CPAR') !== false || strpos($subCode, 'CORE-UCSP') !== false || strpos($subCode, 'HUMSS-TN') !== false || strpos($subCode, 'HUMSS-PPG') !== false || strpos($subCode, 'HUMSS-DISS') !== false) {
        return 'Social Sciences';
    }
    if (strpos($subCode, 'CORE-PE1') !== false || strpos($subCode, 'CORE-PE3') !== false) {
        return 'MAPEH';
    }
    if (strpos($subCode, 'ABM-') !== false || strpos($subCode, 'APP-ENTR') !== false) {
        return 'Business';
    }
    if (strpos($subCode, 'HE-') !== false) {
        return 'TVL-HE';
    }
    if (strpos($subCode, 'ICT-') !== false || strpos($subCode, 'APP-ETECH') !== false) {
        return 'TVL-ICT';
    }
    if (strpos($subCode, 'IA-') !== false) {
        return 'TVL-IA';
    }
    return 'English'; // default fallback
}

// ── 4. DEFINE CURRICULUM TEMPLATES ───────────────────────────
$jhsTemplate = [
    'Monday'    => ['MATH-JHS', 'ENG-JHS', 'SCI-JHS', 'FIL-JHS', 'MAPEH-JHS'],
    'Tuesday'   => ['ESP-JHS',  'MAPEH-JHS', 'AP-JHS',  'TLE-JHS', 'TLE-JHS'],
    'Wednesday' => ['MATH-JHS', 'ENG-JHS', 'SCI-JHS', 'FIL-JHS', 'MAPEH-JHS'],
    'Thursday'  => ['ESP-JHS',  'MAPEH-JHS', 'AP-JHS',  'TLE-JHS', 'TLE-JHS'],
    'Friday'    => ['MATH-JHS', 'ENG-JHS', 'SCI-JHS', 'FIL-JHS', 'AP-JHS']
];

$shsG11Templates = [
    'stem' => [
        'Monday'    => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'STEM-PC'],
        'Tuesday'   => ['APP-EAPP', 'APP-ETECH',  'CORE-PE1',  'CORE-PD',   'STEM-BC'],
        'Wednesday' => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'STEM-PC'],
        'Thursday'  => ['APP-EAPP', 'APP-ETECH',  'CORE-PE1',  'CORE-PD',   'STEM-BC'],
        'Friday'    => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'STEM-PC']
    ],
    'abm' => [
        'Monday'    => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'ABM-MATH'],
        'Tuesday'   => ['APP-EAPP', 'APP-ETECH',  'CORE-PE1',  'CORE-PD',   'ABM-MGMT'],
        'Wednesday' => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'ABM-MATH'],
        'Thursday'  => ['APP-EAPP', 'APP-ETECH',  'CORE-PE1',  'CORE-PD',   'ABM-MGMT'],
        'Friday'    => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'ABM-MATH']
    ],
    'humss' => [
        'Monday'    => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'HUMSS-CW'],
        'Tuesday'   => ['APP-EAPP', 'APP-ETECH',  'CORE-PE1',  'CORE-PD',   'HUMSS-CNF'],
        'Wednesday' => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'HUMSS-CW'],
        'Thursday'  => ['APP-EAPP', 'APP-ETECH',  'CORE-PE1',  'CORE-PD',   'HUMSS-CNF'],
        'Friday'    => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'HUMSS-CW']
    ],
    'tvl-he' => [
        'Monday'    => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'HE-COOK'],
        'Tuesday'   => ['APP-EAPP', 'APP-ETECH',  'CORE-PE1',  'CORE-PD',   'HE-BPP'],
        'Wednesday' => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'HE-COOK'],
        'Thursday'  => ['APP-EAPP', 'APP-ETECH',  'CORE-PE1',  'CORE-PD',   'HE-BPP'],
        'Friday'    => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'HE-COOK']
    ],
    'tvl-ict' => [
        'Monday'    => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'ICT-CSS'],
        'Tuesday'   => ['APP-EAPP', 'APP-ETECH',  'CORE-PE1',  'CORE-PD',   'ICT-PROG'],
        'Wednesday' => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'ICT-CSS'],
        'Thursday'  => ['APP-EAPP', 'APP-ETECH',  'CORE-PE1',  'CORE-PD',   'ICT-PROG'],
        'Friday'    => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'ICT-CSS']
    ],
    'tvl-ia' => [
        'Monday'    => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'IA-SMAW'],
        'Tuesday'   => ['APP-EAPP', 'APP-ETECH',  'CORE-PE1',  'CORE-PD',   'IA-EIM'],
        'Wednesday' => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'IA-SMAW'],
        'Thursday'  => ['APP-EAPP', 'APP-ETECH',  'CORE-PE1',  'CORE-PD',   'IA-EIM'],
        'Friday'    => ['CORE-OC',  'CORE-GM',    'CORE-ELS',  'CORE-KPW',  'IA-SMAW']
    ],
];

$shsG12Templates = [
    'stem' => [
        'Monday'    => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'STEM-PHYS1'],
        'Tuesday'   => ['APP-PR2',   'APP-ENTR',  'CORE-PE3',   'STEM-BIO2',  'STEM-CHEM1'],
        'Wednesday' => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'STEM-PHYS1'],
        'Thursday'  => ['APP-PR2',   'APP-ENTR',  'CORE-PE3',   'STEM-BIO2',  'STEM-CHEM1'],
        'Friday'    => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'STEM-PHYS1']
    ],
    'abm' => [
        'Monday'    => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'ABM-ECON'],
        'Tuesday'   => ['APP-PR2',   'APP-ENTR',  'CORE-PE3',   'ABM-FIN',    'ABM-FABM2'],
        'Wednesday' => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'ABM-ECON'],
        'Thursday'  => ['APP-PR2',   'APP-ENTR',  'CORE-PE3',   'ABM-FIN',    'ABM-FABM2'],
        'Friday'    => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'ABM-ECON']
    ],
    'humss' => [
        'Monday'    => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'HUMSS-TN'],
        'Tuesday'   => ['APP-PR2',   'APP-ENTR',  'CORE-PE3',   'HUMSS-DISS', 'HUMSS-PPG'],
        'Wednesday' => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'HUMSS-TN'],
        'Thursday'  => ['APP-PR2',   'APP-ENTR',  'CORE-PE3',   'HUMSS-DISS', 'HUMSS-PPG'],
        'Friday'    => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'HUMSS-TN']
    ],
    'tvl-he' => [
        'Monday'    => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'HE-FBS'],
        'Tuesday'   => ['APP-PR2',   'APP-ENTR',  'CORE-PE3',   'HE-TOUR',    'HE-HK'],
        'Wednesday' => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'HE-FBS'],
        'Thursday'  => ['APP-PR2',   'APP-ENTR',  'CORE-PE3',   'HE-TOUR',    'HE-HK'],
        'Friday'    => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'HE-FBS']
    ],
    'tvl-ict' => [
        'Monday'    => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'ICT-WEB'],
        'Tuesday'   => ['APP-PR2',   'APP-ENTR',  'CORE-PE3',   'APP-3I',     'ICT-ANIM'],
        'Wednesday' => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'ICT-WEB'],
        'Thursday'  => ['APP-PR2',   'APP-ENTR',  'CORE-PE3',   'APP-3I',     'ICT-ANIM'],
        'Friday'    => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'ICT-WEB']
    ],
    'tvl-ia' => [
        'Monday'    => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'IA-AUTO'],
        'Tuesday'   => ['APP-PR2',   'APP-ENTR',  'CORE-PE3',   'APP-3I',     'IA-DRAFT'],
        'Wednesday' => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'IA-AUTO'],
        'Thursday'  => ['APP-PR2',   'APP-ENTR',  'CORE-PE3',   'APP-3I',     'IA-DRAFT'],
        'Friday'    => ['CORE-IPHP', 'CORE-MIL',  'CORE-CPAR',  'CORE-UCSP',  'IA-AUTO']
    ],
];

// Time Periods Mapping
$timePeriods = [
    0 => ['07:00:00', '08:00:00'],
    1 => ['08:00:00', '09:00:00'],
    2 => ['09:00:00', '10:00:00'],
    3 => ['10:00:00', '11:00:00'],
    4 => ['11:00:00', '12:00:00']
];

$daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
$rooms    = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105', 'Room 201', 'Room 202', 'Room 203', 'Lab 1', 'Lab 2', 'Gym', 'Drawing Room'];

// ── 5. ALLOCATION ENGINE ─────────────────────────────────────
// To track teacher availability
$teacherBusy = []; // [$tId][$day][$period] = true

// Keep track of section assignments count
$totalSections  = 0;
$totalSchedules = 0;

// Helper function to find a free teacher for a subject on a given day/period
function allocateTeacherAndRoom($pdo, $subCode, $day, $period, $rooms, &$teacherBusy, $teachersByDept) {
    $dept = getDeptForSubject($subCode);
    $availableTeachers = $teachersByDept[$dept] ?? [];
    if (empty($availableTeachers)) {
        return [null, 'Room 999'];
    }

    // Try to find a teacher in that department who is free
    foreach ($availableTeachers as $tId) {
        if (!isset($teacherBusy[$tId][$day][$period])) {
            $teacherBusy[$tId][$day][$period] = true;
            
            // Choose a room based on subject/department
            $room = $rooms[($tId + $period) % count($rooms)];
            if (strpos($subCode, 'PE') !== false) {
                $room = 'Gymnasium';
            } elseif (strpos($subCode, 'COOK') !== false) {
                $room = 'Culinary Lab';
            } elseif (strpos($subCode, 'PROG') !== false || strpos($subCode, 'WEB') !== false || strpos($subCode, 'ETECH') !== false) {
                $room = 'Computer Lab';
            } elseif (strpos($subCode, 'SMAW') !== false) {
                $room = 'Welding Shop';
            } elseif (strpos($subCode, 'EIM') !== false) {
                $room = 'Electrical Lab';
            } elseif (strpos($subCode, 'AUTO') !== false) {
                $room = 'Automotive Shop';
            }
            
            return [$tId, $room];
        }
    }

    // Back-up: If all department teachers are busy, pick one and force it
    $fallbackT = $availableTeachers[0];
    $room = $rooms[($fallbackT + $period) % count($rooms)];
    return [$fallbackT, $room];
}

// ── 6. CREATE SECTIONS & GENERATE TIMETABLES ─────────────────

// Create JHS Sections
$jhsSections = [
    ['7', '7-A', 0],
    ['7', '7-B', 1],
    ['8', '8-A', 2],
    ['8', '8-B', 3],
    ['9', '9-A', 4],
    ['9', '9-B', 0],
    ['10', '10-A', 1],
    ['10', '10-B', 2]
];

function getSHSSubjectsForSemester($grade, $strand, $semester) {
    $strand = strtolower($strand);
    if ($grade == '11') {
        if ($semester == 1) {
            $specialized = [
                'stem'    => 'STEM-PC',
                'abm'     => 'ABM-MATH',
                'humss'   => 'HUMSS-CW',
                'tvl-he'  => 'HE-COOK',
                'tvl-ict' => 'ICT-CSS',
                'tvl-ia'  => 'IA-SMAW'
            ];
            return ['CORE-OC', 'CORE-GM', 'CORE-ELS', 'CORE-KPW', $specialized[$strand]];
        } else {
            $specialized = [
                'stem'    => 'STEM-BC',
                'abm'     => 'ABM-MGMT',
                'humss'   => 'HUMSS-CNF',
                'tvl-he'  => 'HE-BPP',
                'tvl-ict' => 'ICT-PROG',
                'tvl-ia'  => 'IA-EIM'
            ];
            return ['APP-EAPP', 'APP-ETECH', 'CORE-PE1', 'CORE-PD', $specialized[$strand]];
        }
    } else { // Grade 12
        if ($semester == 1) {
            $specialized = [
                'stem'    => 'STEM-PHYS1',
                'abm'     => 'ABM-ECON',
                'humss'   => 'HUMSS-TN',
                'tvl-he'  => 'HE-FBS',
                'tvl-ict' => 'ICT-WEB',
                'tvl-ia'  => 'IA-AUTO'
            ];
            return ['CORE-IPHP', 'CORE-MIL', 'CORE-CPAR', 'CORE-UCSP', $specialized[$strand]];
        } else {
            $specialized = [
                'stem'    => 'STEM-BIO2',
                'abm'     => 'ABM-FIN',
                'humss'   => 'HUMSS-DISS',
                'tvl-he'  => 'HE-TOUR',
                'tvl-ict' => 'ICT-ANIM',
                'tvl-ia'  => 'IA-DRAFT'
            ];
            $optSubject = ($strand === 'tvl-ict' || $strand === 'tvl-ia') ? 'APP-3I' : 'APP-PR2';
            return [$optSubject, 'APP-ENTR', 'CORE-PE3', $specialized[$strand], ($strand === 'abm' ? 'ABM-FABM2' : ($strand === 'stem' ? 'STEM-CHEM1' : ($strand === 'humss' ? 'HUMSS-PPG' : ($strand === 'tvl-he' ? 'HE-HK' : $specialized[$strand]))))];
        }
    }
}

$insSec = $pdo->prepare("INSERT INTO sections (name, level, grade_level, strand, max_students) VALUES (?,?,?,?,?)");
$insSched = $pdo->prepare("INSERT INTO section_schedules (section_id, subject_id, teacher_id, semester, day, start_time, end_time, room) VALUES (?,?,?,?,?,?,?,?)");

foreach ($jhsSections as [$grade, $secName, $secOffset]) {
    $insSec->execute([$secName, 'Junior High School', $grade, null, 40]);
    $secId = (int)$pdo->lastInsertId();
    $totalSections++;

    echo "Scheduling JHS Grade $grade - $secName (Offset: $secOffset)...\n";

    // Schedule 5 slots per day for this section
    foreach ($daysList as $dIdx => $day) {
        for ($p = 0; $p < 5; $p++) {
            // Apply stagger offset
            $templateIdx = ($p + $secOffset + $dIdx) % 5;
            $subCode = $jhsTemplate[$day][$templateIdx];
            $subId = $subjectMap[$subCode]['id'];

            [$tId, $room] = allocateTeacherAndRoom($pdo, $subCode, $day, $p, $rooms, $teacherBusy, $teachersByDept);
            [$sTime, $eTime] = $timePeriods[$p];

            // Seed both Semester 1 and Semester 2 for JHS (year-long classes)
            $insSched->execute([$secId, $subId, $tId, 1, $day, $sTime, $eTime, $room]);
            $insSched->execute([$secId, $subId, $tId, 2, $day, $sTime, $eTime, $room]);
            $totalSchedules += 2;
        }
    }
}

// Create SHS Sections
$shsStrands = ['stem', 'abm', 'humss', 'tvl-he', 'tvl-ict', 'tvl-ia'];
$shsGrades = ['11', '12'];
$shsSecNames = [
    ['A', 0],
    ['B', 2]
];

foreach ($shsStrands as $strand) {
    foreach ($shsGrades as $grade) {
        foreach ($shsSecNames as [$letter, $secOffset]) {
            $secName = $grade . '-' . strtoupper($strand) . '-' . $letter;
            $insSec->execute([$secName, 'Senior High School', $grade, $strand, 40]);
            $secId = (int)$pdo->lastInsertId();
            $totalSections++;

            echo "Scheduling SHS Grade $grade " . strtoupper($strand) . " - $secName (Offset: $secOffset)...\n";

            // Schedule for both Semester 1 and Semester 2
            for ($sem = 1; $sem <= 2; $sem++) {
                $subjectsList = getSHSSubjectsForSemester($grade, $strand, $sem);
                
                foreach ($daysList as $dIdx => $day) {
                    for ($p = 0; $p < 5; $p++) {
                        // Apply stagger offset
                        $templateIdx = ($p + $secOffset + $dIdx) % 5;
                        $subCode = $subjectsList[$templateIdx];
                        $subId = $subjectMap[$subCode]['id'];

                        [$tId, $room] = allocateTeacherAndRoom($pdo, $subCode, $day, $p, $rooms, $teacherBusy, $teachersByDept);
                        [$sTime, $eTime] = $timePeriods[$p];

                        $insSched->execute([$secId, $subId, $tId, $sem, $day, $sTime, $eTime, $room]);
                        $totalSchedules++;
                    }
                }
            }
        }
    }
}

// ── 7. PRINT SUMMARY ──────────────────────────────────────────
echo "\n==============================================\n";
echo "SEEDING COMPLETED SUCCESSFULLY!\n";
echo "Teachers : " . $pdo->query("SELECT COUNT(*) FROM teachers")->fetchColumn() . "\n";
echo "Subjects : " . $pdo->query("SELECT COUNT(*) FROM subjects")->fetchColumn() . "\n";
echo "Sections : " . $totalSections . "\n";
echo "Schedules: " . $totalSchedules . "\n";
echo "==============================================\n\n";

$rows = $pdo->query("
    SELECT s.level, s.grade_level, s.strand, s.name, COUNT(ss.id) AS cnt
    FROM sections s LEFT JOIN section_schedules ss ON ss.section_id=s.id
    GROUP BY s.id ORDER BY s.level DESC, s.grade_level, s.strand, s.name
")->fetchAll();
foreach ($rows as $r) {
    $label = 'G' . $r['grade_level']
        . ($r['strand'] ? ' ' . strtoupper($r['strand']) : '')
        . ' - ' . $r['name'];
    $ok = $r['cnt'] === 50 ? '✓' : '✗';
    echo "  $ok $label : {$r['cnt']} schedule entries\n";
}
