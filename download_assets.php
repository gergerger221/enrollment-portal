<?php
/**
 * download_assets.php
 * Helper script to download Google Fonts and Unsplash images for offline deployment.
 * Run this by opening http://localhost/BagSaPwetNiTerd/download_assets.php in your browser.
 */

header('Content-Type: text/plain; charset=utf-8');
echo "=== BIRINGAN UNIVERSITY OFFLINE ASSETS DOWNLOADER ===\n\n";

// 1. Ensure Directories Exist
$directories = [
    __DIR__ . '/css',
    __DIR__ . '/css/fonts',
    __DIR__ . '/img'
];
foreach ($directories as $dir) {
    if (!file_exists($dir)) {
        if (mkdir($dir, 0777, true)) {
            echo "Created directory: $dir\n";
        } else {
            echo "ERROR: Failed to create directory: $dir\n";
            exit(1);
        }
    }
}

// Helper to download files
function downloadFile($url, $savePath, $userAgent = null) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    if ($userAgent) {
        curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);
    }
    
    $data = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200 && $data) {
        if (file_put_contents($savePath, $data) !== false) {
            echo "Successfully downloaded: " . basename($savePath) . "\n";
            return true;
        }
    }
    echo "FAILED to download from $url (HTTP Code: $httpCode)\n";
    return false;
}

// 2. Download Images
echo "\n--- Downloading Unsplash Images ---\n";
$images = [
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80' => __DIR__ . '/img/hero.jpg',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80' => __DIR__ . '/img/campus.jpg'
];
foreach ($images as $url => $path) {
    downloadFile($url, $path);
}

// 3. Download Google Font CSS and WOFF2 Files
echo "\n--- Downloading Google Fonts ---\n";
$fontCssUrl = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap';
$userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $fontCssUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$cssContent = curl_exec($ch);
curl_close($ch);

if (!$cssContent) {
    echo "ERROR: Failed to fetch Google Fonts CSS.\n";
    exit(1);
}

// Find all woff2 URLs in the CSS content
preg_match_all('/url\((https:\/\/fonts\.gstatic\.com\/[^\)]+)\)/', $cssContent, $matches);
$woffUrls = array_unique($matches[1] ?? []);

echo "Found " . count($woffUrls) . " font weight files to download.\n";

$replacements = [];
foreach ($woffUrls as $url) {
    // Generate a safe unique filename for the font file
    $filename = basename($url);
    if (!str_ends_with($filename, '.woff2')) {
        $filename .= '.woff2';
    }
    
    $savePath = __DIR__ . '/css/fonts/' . $filename;
    
    if (downloadFile($url, $savePath)) {
        $replacements[$url] = 'fonts/' . $filename;
    }
}

// Replace remote URLs in the CSS with local relative paths
foreach ($replacements as $remoteUrl => $localPath) {
    $cssContent = str_replace($remoteUrl, $localPath, $cssContent);
}

// Save the rewritten CSS locally
$cssSavePath = __DIR__ . '/css/plus-jakarta-sans.css';
if (file_put_contents($cssSavePath, $cssContent) !== false) {
    echo "\nSaved rewritten local font CSS to: css/plus-jakarta-sans.css\n";
} else {
    echo "\nERROR: Failed to save rewritten CSS.\n";
}

echo "\n=== ALL DONE! You can now link to css/plus-jakarta-sans.css and img/hero.jpg / img/campus.jpg locally ===\n";
?>
