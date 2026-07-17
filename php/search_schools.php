<?php
/**
 * search_schools.php
 * Returns a JSON array of Philippine elementary/high schools matching a search query.
 * Used by the school autocomplete widget on the registration form.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$query = isset($_GET['q']) ? trim(strtolower($_GET['q'])) : '';
$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 10;
$limit = max(1, min($limit, 30)); // clamp between 1-30

if (strlen($query) < 2) {
    echo json_encode([]);
    exit;
}

// Load the schools list
$schoolsFile = __DIR__ . '/../database/schools_ph.json';
if (!file_exists($schoolsFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Schools database not found']);
    exit;
}

$schools = json_decode(file_get_contents($schoolsFile), true);
if (!is_array($schools)) {
    http_response_code(500);
    echo json_encode(['error' => 'Invalid schools data']);
    exit;
}

// Filter: starts-with gets priority, then contains
$startsWith = [];
$contains   = [];

foreach ($schools as $school) {
    $lc = strtolower($school);
    if (str_starts_with($lc, $query)) {
        $startsWith[] = $school;
    } elseif (str_contains($lc, $query)) {
        $contains[] = $school;
    }
}

// "School Not Found" always appears last
$notFound = 'School Not Found';
$results = array_merge($startsWith, $contains);
$results = array_filter($results, fn($s) => $s !== $notFound);
$results = array_values(array_slice($results, 0, $limit - 1));
$results[] = $notFound;

echo json_encode($results);
