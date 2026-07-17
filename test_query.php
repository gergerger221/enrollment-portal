<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=enrollment_system;charset=utf8", 'root', '');

$studentId = 10; // student ID for 'we we'

// First get the student's section
$studentStmt = $pdo->prepare("SELECT class_section FROM students WHERE id = ?");
$studentStmt->execute([$studentId]);
$student = $studentStmt->fetch(PDO::FETCH_ASSOC);

echo "Student Class Section: '{$student['class_section']}'\n";

$stmt = $pdo->prepare("
    SELECT ss.*, sub.name as subject, t.name as teacher_name 
    FROM section_schedules ss
    JOIN sections s ON ss.section_id = s.id
    JOIN subjects sub ON ss.subject_id = sub.id
    LEFT JOIN teachers t ON ss.teacher_id = t.id
    WHERE CONCAT(s.level, '-', s.grade_level, '-', IFNULL(s.strand, ''), '-', s.name) = ?
");
$stmt->execute([$student['class_section']]);
$schedule = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Number of schedules found: " . count($schedule) . "\n";
foreach ($schedule as $s) {
    echo "Day: {$s['day']} | Subject: {$s['subject']} | Time: {$s['start_time']} - {$s['end_time']} | Room: {$s['room']}\n";
}
?>
