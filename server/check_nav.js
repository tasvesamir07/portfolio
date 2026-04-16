const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.get("SELECT custom_nav FROM about LIMIT 1", (err, row) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Custom Nav:", row.custom_nav);
    }
    db.close();
});
