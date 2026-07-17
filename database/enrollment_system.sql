-- Database: enrollment_system
CREATE DATABASE IF NOT EXISTS `enrollment_system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `enrollment_system`;

DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `courses`;
DROP TABLE IF EXISTS `enrollments`;

CREATE TABLE `students` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `last_name` VARCHAR(100) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `middle_name` VARCHAR(100) DEFAULT NULL,
  `email` VARCHAR(180) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `dob` DATE NOT NULL,
  `address` TEXT NOT NULL,
  `guardian_name` VARCHAR(150) NOT NULL,
  `guardian_phone` VARCHAR(20) NOT NULL,
  `guardian_email` VARCHAR(180) NOT NULL,
  `guardian_relationship` VARCHAR(50) NOT NULL,
  `guardian_address` TEXT NOT NULL,
  `program` VARCHAR(150) NOT NULL,
  `section` VARCHAR(100) NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_students_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `courses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_courses_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `enrollments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` INT UNSIGNED NOT NULL,
  `course_id` INT UNSIGNED NOT NULL,
  `enrolled_date` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_enrollments_student` (`student_id`),
  KEY `idx_enrollments_course` (`course_id`),
  CONSTRAINT `fk_enrollments_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enrollments_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `courses` (`code`, `name`, `description`) VALUES
('CS101', 'Introduction to Computer Science', 'Learn the basics of programming and computer science concepts'),
('MATH201', 'Calculus I', 'Differential and integral calculus fundamentals'),
('ENG102', 'English Composition', 'Academic writing and critical thinking skills'),
('PHY101', 'Physics Fundamentals', 'Introduction to mechanics and thermodynamics'),
('BIO201', 'Biology I', 'Cell biology and genetics');

INSERT INTO `students` (`last_name`, `first_name`, `middle_name`, `email`, `phone`, `dob`, `address`, `guardian_name`, `guardian_phone`, `guardian_email`, `guardian_relationship`, `guardian_address`, `program`, `section`, `status`, `password_hash`, `created_at`) VALUES
('Admin', 'System', NULL, 'admin@university.local', '0000000000', '1990-01-01', 'Admin Office', 'Admin', '0000000000', 'admin@university.local', 'Admin', 'Admin Office', 'Administration', 'N/A', 'approved', '$2y$10$7mW98TPBzQAskjs3FtFsS.sUu7is24IZm6rds54zz.DOU0QW9CkHG', NOW());
