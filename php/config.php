<?php
session_start();

$host = '127.0.0.1';
$db = 'enrollment_system';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host={$host};dbname={$db};charset={$charset}";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

function tableExists(PDO $pdo, string $tableName): bool
{
    $rows = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN, 0);
    return in_array($tableName, $rows, true);
}

function ensureAppSchema(PDO $pdo): void
{
    if (!tableExists($pdo, 'students')) {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS `students` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `last_name` VARCHAR(100) NOT NULL,
                `first_name` VARCHAR(100) NOT NULL,
                `middle_name` VARCHAR(100) DEFAULT NULL,
                `email` VARCHAR(255) NOT NULL,
                `phone` VARCHAR(20) NOT NULL,
                `dob` DATE NOT NULL,
                `address` TEXT NOT NULL,
                `guardian_name` VARCHAR(150) NOT NULL,
                `guardian_phone` VARCHAR(20) NOT NULL,
                `guardian_email` VARCHAR(255) NOT NULL,
                `guardian_relationship` VARCHAR(50) NOT NULL,
                `guardian_address` TEXT NOT NULL,
                `program` VARCHAR(150) NOT NULL,
                `section` VARCHAR(100) NOT NULL,
                `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
                `password_hash` VARCHAR(255) DEFAULT NULL,
                `approved_at` DATETIME DEFAULT NULL,
                `created_at` DATETIME NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uniq_students_email` (`email`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }

    $columns = $pdo->query('SHOW COLUMNS FROM `students`')->fetchAll(PDO::FETCH_COLUMN, 0);
    $expectedColumns = [
        'guardian_address' => 'ADD COLUMN `guardian_address` TEXT DEFAULT NULL',
        'status' => "ADD COLUMN `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'",
        'password_hash' => 'ADD COLUMN `password_hash` VARCHAR(255) DEFAULT NULL',
        'approved_at' => 'ADD COLUMN `approved_at` DATETIME DEFAULT NULL',
        'birth_cert_path' => 'ADD COLUMN `birth_cert_path` VARCHAR(255) DEFAULT NULL',
        'report_card_path' => 'ADD COLUMN `report_card_path` VARCHAR(255) DEFAULT NULL',
        'good_moral_path' => 'ADD COLUMN `good_moral_path` VARCHAR(255) DEFAULT NULL',
        'voucher_path' => 'ADD COLUMN `voucher_path` VARCHAR(255) DEFAULT NULL',
        'gwa' => 'ADD COLUMN `gwa` DECIMAL(5,2) DEFAULT NULL',
        'is_repeater' => "ADD COLUMN `is_repeater` VARCHAR(10) DEFAULT 'No'"
    ];
    $alter = [];
    foreach ($expectedColumns as $column => $definition) {
        if (!in_array($column, $columns, true)) {
            $alter[] = $definition;
        }
    }
    if ($alter) {
        $pdo->exec('ALTER TABLE `students` ' . implode(', ', $alter));
    }

    if (!tableExists($pdo, 'courses')) {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS `courses` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `code` VARCHAR(50) NOT NULL,
                `name` VARCHAR(150) NOT NULL,
                `description` TEXT NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uniq_courses_code` (`code`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }

    if (!tableExists($pdo, 'enrollments')) {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS `enrollments` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `student_id` INT UNSIGNED NOT NULL,
                `course_id` INT UNSIGNED NOT NULL,
                `enrolled_date` DATETIME NOT NULL,
                PRIMARY KEY (`id`),
                KEY `idx_enrollments_student` (`student_id`),
                KEY `idx_enrollments_course` (`course_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }

    if (!tableExists($pdo, 'payments')) {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS `payments` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `student_id` INT UNSIGNED NOT NULL,
                `amount` DECIMAL(10,2) NOT NULL,
                `cardholder_name` VARCHAR(150) NOT NULL,
                `card_number_masked` VARCHAR(20) NOT NULL,
                `reference_no` VARCHAR(50) NOT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_payments_student` (`student_id`),
                CONSTRAINT `fk_payments_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }

    $stmt = $pdo->prepare('SELECT id, status, password_hash, portal_password FROM students WHERE email = ?');
    $stmt->execute(['admin@university.local']);
    $admin = $stmt->fetch();
    $defaultPasswordHash = password_hash('password123', PASSWORD_DEFAULT);
    if ($admin) {
        $updates = [];
        $params = [];
        if ($admin['password_hash'] === null) {
            $updates[] = '`password_hash` = ?';
            $params[] = $defaultPasswordHash;
        }
        if (empty($admin['portal_password'])) {
            $updates[] = '`portal_password` = ?';
            $params[] = $defaultPasswordHash;
        }
        if ($admin['status'] !== 'approved') {
            $updates[] = '`status` = ?';
            $params[] = 'approved';
        }
        if ($updates) {
            $params[] = $admin['id'];
            $pdo->prepare('UPDATE students SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);
        }
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO students (last_name, first_name, middle_name, email, phone, dob, address, guardian_name, guardian_phone, guardian_email, guardian_relationship, guardian_address, program, section, status, password_hash, portal_password, portal_access, approved_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())'
        );
        $stmt->execute([
            'Admin',
            'System',
            null,
            'admin@university.local',
            '0000000000',
            '1990-01-01',
            'Admin Office',
            'Admin',
            '0000000000',
            'admin@university.local',
            'Admin',
            'Admin Office',
            'Administration',
            'N/A',
            'approved',
            $defaultPasswordHash,
            $defaultPasswordHash,
            '2024-01-01 00:00:00'
        ]);
    }
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    ensureAppSchema($pdo);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}
