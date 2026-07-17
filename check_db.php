<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=enrollment_system;charset=utf8", 'root', '');

echo "=== STUDENTS AND SECTIONS IN DATABASE ===\n\n";

echo "--- Approved Students: ---\n";
$students = $pdo->query("SELECT id, first_name, last_name, level, grade_level, strand, class_section FROM students WHERE status='approved'")->fetchAll(PDO::FETCH_ASSOC);
foreach ($students as $s) {
    echo "ID: {$s['id']} | Name: {$s['first_name']} {$s['last_name']} | Level: {$s['level']} | Grade: {$s['grade_level']} | Strand: {$s['strand']} | Assigned Section: '{$s['class_section']}'\n";
}

echo "\n--- Sections and CONCAT output: ---\n";
$sections = $pdo->query("SELECT id, name, level, grade_level, strand, CONCAT(level, '-', grade_level, '-', IFNULL(strand, ''), '-', name) AS concat_code FROM sections")->fetchAll(PDO::FETCH_ASSOC);
foreach ($sections as $sec) {
    echo "ID: {$sec['id']} | Level: {$sec['level']} | Grade: {$sec['grade_level']} | Strand: {$sec['strand']} | Name: {$sec['name']} | Concat Code: '{$sec['concat_code']}'\n";
}

echo "\n--- Section Schedules count: ---\n";
$scheds = $pdo->query("SELECT s.name, COUNT(ss.id) AS cnt FROM sections s LEFT JOIN section_schedules ss ON s.id=ss.section_id GROUP BY s.id")->fetchAll(PDO::FETCH_ASSOC);
foreach ($scheds as $sch) {
    echo "Section Name: {$sch['name']} | Schedules Count: {$sch['cnt']}\n";
}
?>
