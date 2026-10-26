
import fs from "node:fs";
import db from "../database/db.js";

// clinic.html файлынан клиникалар тізімін оқу
const html = fs.readFileSync("clinic.html", "utf8");

const match = html.match(
  /const clinics=(\{[\s\S]*?\});\s*const specFiles=/
);

if (!match) {
  throw new Error("clinic.html ішінен клиникалар тізімі табылмады.");
}

const clinics = JSON.parse(match[1]);

const findClinic = db.prepare(
  "SELECT id FROM clinics WHERE phone = ?"
);

const updateClinic = db.prepare(`
  UPDATE clinics
  SET name = ?, address = ?, type = ?, phone = ?
  WHERE id = ?
`);

const insertClinic = db.prepare(`
  INSERT INTO clinics (name, address, type, phone)
  VALUES (?, ?, ?, ?)
`);

const importClinics = db.transaction(() => {
  let added = 0;
  let updated = 0;

  for (const clinic of Object.values(clinics)) {
    // Бір мамандықтағы клиниканы атауынан ажыратамыз
    const name = `${clinic.name} — ${clinic.specialty}`;

    const existing = findClinic.get(clinic.phone);

    if (existing) {
      // Бұрынғы жазбаның ID-сін сақтаймыз
      updateClinic.run(
        name,
        clinic.address,
        clinic.type,
        clinic.phone,
        existing.id
      );
      updated++;
    } else {
      insertClinic.run(
        name,
        clinic.address,
        clinic.type,
        clinic.phone
      );
      added++;
    }
  }

  return { added, updated };
});

const result = importClinics();

console.log("Клиникалар импортталды!");
console.log("Жаңадан қосылды:", result.added);
console.log("Жаңартылды:", result.updated);
console.log(
  "Дерекқордағы клиникалардың жалпы саны:",
  db.prepare("SELECT COUNT(*) AS total FROM clinics").get().total
);
