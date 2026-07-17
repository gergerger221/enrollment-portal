<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=enrollment_system;charset=utf8", 'root', '');
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $table) {
    echo "TABLE: $table\n";
    $cols = $pdo->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $col) {
        echo "  " . $col['Field'] . " - " . $col['Type'] . "\n";
    }
}
?>
