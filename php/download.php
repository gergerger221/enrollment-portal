<?php
$content = file_get_contents("https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js");
if ($content === false) {
    echo "FAILED";
} else {
    file_put_contents("../javascript/chart.umd.min.js", $content);
    echo "OK";
}
