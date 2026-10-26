
const Database = require("better-sqlite3");

const db = new Database("./database/medcare.db");

console.log("\n--- ВРАЧИ ---");
console.table(
    db.prepare("SELECT * FROM doctors").all()
);

console.log("\n--- ПОЛЬЗОВАТЕЛИ ---");
console.table(
    db.prepare(
        "SELECT id, name, email, role FROM users"
    ).all()
);

console.log("\n--- ПАЦИЕНТЫ ---");
console.table(
    db.prepare("SELECT * FROM patients").all()
);

db.close();
