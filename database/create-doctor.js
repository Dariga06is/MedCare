
import db from "./db.js";
import bcrypt from "bcryptjs";

const fullName = "Айгүл Сәрсенова";
const email = "doctor@medcare.kz";
const password = "MedCare2026!";
const specialty = "Стоматология";

const existing = db
  .prepare("SELECT id FROM users WHERE email = ?")
  .get(email);

if (existing) {
  console.log("⚠️ Бұл email бұрын тіркелген");
  process.exit(0);
}

const passwordHash = await bcrypt.hash(password, 12);

const createDoctor = db.transaction(() => {
  const result = db.prepare(`
    INSERT INTO users (full_name, email, password_hash, role)
    VALUES (?, ?, ?, 'doctor')
  `).run(fullName, email, passwordHash);

  db.prepare(`
    INSERT INTO doctors (user_id, specialty, experience)
    VALUES (?, ?, ?)
  `).run(result.lastInsertRowid, specialty, 5);
});

createDoctor();

console.log("✅ Дәрігер аккаунты құрылды!");
console.log("Email:", email);
