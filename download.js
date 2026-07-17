const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream("c:/xampp/htdocs/enrollment-system/enrollment-system/javascript/chart.umd.min.js");
https.get("https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js", function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close();
    console.log("Download completed.");
  });
}).on('error', function(err) {
  fs.unlink("c:/xampp/htdocs/enrollment-system/enrollment-system/javascript/chart.umd.min.js", () => {});
  console.error("Error: " + err.message);
});
