<?php
session_start();
$_SESSION['student_id'] = 10;
$_SESSION['role'] = 'student';

// Simulate the getSchedule action logic from api.php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=enrollment_system;charset=utf8", 'root', '');

$studentId = $_SESSION['student_id'];

// First get the student's section
$studentStmt = $pdo->prepare("SELECT class_section FROM students WHERE id = ?");
$studentStmt->execute([$studentId]);
$student = $studentStmt->fetch(PDO::FETCH_ASSOC);

if ($student && !empty($student['class_section'])) {
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

    $grouped = [
        'monday' => [],
        'tuesday' => [],
        'wednesday' => [],
        'thursday' => [],
        'friday' => []
    ];
    foreach ($schedule as $s) {
        $day = strtolower($s['day']);
        if (array_key_exists($day, $grouped)) {
            $timeStr = date("g:i A", strtotime($s['start_time'])) . ' - ' . date("g:i A", strtotime($s['end_time']));
            $grouped[$day][] = [
                'subject' => $s['subject'],
                'time' => $timeStr,
                'room' => ($s['room'] ? $s['room'] . ' ' : '') . ($s['teacher_name'] ? '(' . $s['teacher_name'] . ')' : '')
            ];
        }
    }
    echo json_encode(['success' => true, 'data' => $grouped], JSON_PRETTY_PRINT);
} else {
    echo json_encode(['success' => true, 'data' => 'no_section'], JSON_PRETTY_PRINT);
}
?>
