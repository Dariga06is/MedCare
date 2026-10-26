
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import db from "../database/db.js";

const router = Router();

// Одноразовые коды действуют 60 секунд.
const doctorHandoffs = new Map();

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: "Жүйеге кіру қажет",
    });
  }

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);

    if (req.auth.role !== "doctor") {
      return res.status(403).json({
        error: "Тек дәрігерге рұқсат",
      });
    }

    next();
  } catch {
    return res.status(401).json({
      error: "Сессия жарамсыз немесе мерзімі аяқталған",
    });
  }
}

// ==========================================
// БІР РЕТТІК КІРУ КОДЫН ЖАСАУ
// ==========================================

router.post("/handoff", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: "Жүйеге кіру қажет",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.role !== "doctor") {
      return res.status(403).json({
        error: "Тек дәрігерге рұқсат",
      });
    }

    const code = randomBytes(32).toString("hex");

    // Ескі кодтарды тазалау.
    for (const [savedCode, handoff] of doctorHandoffs) {
      if (handoff.expiresAt < Date.now()) {
        doctorHandoffs.delete(savedCode);
      }
    }

    doctorHandoffs.set(code, {
      token,
      expiresAt: Date.now() + 60_000,
    });

    return res.json({
      success: true,
      code,
    });
  } catch {
    return res.status(401).json({
      error: "Сессия жарамсыз",
    });
  }
});

// ==========================================
// БІР РЕТТІК КОДТЫ ТЕКСЕРУ
// ==========================================

router.post("/handoff/redeem", (req, res) => {
  const code = String(req.body?.code || "");
  const handoff = doctorHandoffs.get(code);

  if (!handoff || handoff.expiresAt < Date.now()) {
    doctorHandoffs.delete(code);

    return res.status(401).json({
      error: "Код жарамсыз немесе мерзімі аяқталған",
    });
  }

  // Кодты екінші рет пайдалануға болмайды.
  doctorHandoffs.delete(code);

  return res.json({
    success: true,
    token: handoff.token,
  });
});

// ==========================================
// ДӘРІГЕРДІ ТІРКЕУ
// ==========================================

router.post("/register", async (req, res) => {
  try {
    const fullName = String(req.body?.fullName || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = req.body?.password;
    const specialty = String(req.body?.specialty || "").trim();
    const clinicId = Number(req.body?.clinicId);
    const experience = Math.max(0, Number(req.body?.experience) || 0);

    if (
      !fullName ||
      !email ||
      typeof password !== "string" ||
      password.length < 8 ||
      !specialty ||
      !Number.isInteger(clinicId) ||
      clinicId < 1
    ) {
      return res.status(400).json({
        error:
          "Барлық өрістерді дұрыс толтырыңыз. Құпиясөз кемінде 8 таңбадан тұруы керек.",
      });
    }

    const clinic = db.prepare(
      "SELECT id FROM clinics WHERE id = ?"
    ).get(clinicId);

    if (!clinic) {
      return res.status(400).json({
        error: "Клиника табылмады",
      });
    }

    const existing = db.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).get(email);

    if (existing) {
      return res.status(409).json({
        error: "Бұл email бұрын тіркелген",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const createDoctor = db.transaction(() => {
      const userResult = db.prepare(`
        INSERT INTO users (full_name, email, password_hash, role)
        VALUES (?, ?, ?, 'doctor')
      `).run(fullName, email, passwordHash);

      const userId = Number(userResult.lastInsertRowid);

      const doctorResult = db.prepare(`
        INSERT INTO doctors (user_id, clinic_id, specialty, experience)
        VALUES (?, ?, ?, ?)
      `).run(userId, clinicId, specialty, experience);

      return {
        userId,
        doctorId: Number(doctorResult.lastInsertRowid),
      };
    });

    const created = createDoctor();

    const token = jwt.sign(
      {
        userId: created.userId,
        doctorId: created.doctorId,
        role: "doctor",
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(201).json({
      success: true,
      token,
      doctor: {
        id: created.doctorId,
        fullName,
        email,
        specialty,
        experience,
      },
    });
  } catch (error) {
    console.error("DOCTOR REGISTER ERROR:", error.message);

    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "Бұл email бұрын тіркелген",
      });
    }

    return res.status(500).json({
      error: "Дәрігерді тіркеу кезінде қате пайда болды",
    });
  }
});

// ==========================================
// ДӘРІГЕРДІҢ ЖҮЙЕГЕ КІРУІ
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = req.body?.password;

    if (!email || typeof password !== "string" || !password) {
      return res.status(400).json({
        error: "Email және құпиясөзді енгізіңіз",
      });
    }

    const doctor = db.prepare(`
      SELECT
        u.id AS user_id,
        u.full_name,
        u.email,
        u.password_hash,
        d.id AS doctor_id,
        d.specialty,
        d.experience,
        d.clinic_id,
        c.name AS clinic_name
      FROM users u
      JOIN doctors d ON d.user_id = u.id
      LEFT JOIN clinics c ON c.id = d.clinic_id
      WHERE u.email = ? AND u.role = 'doctor'
    `).get(email);

    const valid = doctor
      ? await bcrypt.compare(password, doctor.password_hash)
      : false;

    if (!valid) {
      return res.status(401).json({
        error: "Email немесе құпиясөз қате",
      });
    }

    const token = jwt.sign(
      {
        userId: doctor.user_id,
        doctorId: doctor.doctor_id,
        role: "doctor",
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      success: true,
      token,
      doctor: {
        id: doctor.doctor_id,
        fullName: doctor.full_name,
        email: doctor.email,
        specialty: doctor.specialty,
        experience: doctor.experience,
        clinicName: doctor.clinic_name,
      },
    });
  } catch (error) {
    console.error("DOCTOR LOGIN ERROR:", error.message);

    return res.status(500).json({
      error: "Авторизация қатесі",
    });
  }
});

// ==========================================
// АҒЫМДАҒЫ ДӘРІГЕР
// ==========================================

router.get("/me", authenticate, (req, res) => {
  const doctor = db.prepare(`
    SELECT
      d.id,
      u.full_name AS fullName,
      u.email,
      d.specialty,
      d.experience,
      c.name AS clinicName
    FROM doctors d
    JOIN users u ON u.id = d.user_id
    LEFT JOIN clinics c ON c.id = d.clinic_id
    WHERE d.id = ? AND u.id = ?
  `).get(req.auth.doctorId, req.auth.userId);

  if (!doctor) {
    return res.status(404).json({
      error: "Дәрігер табылмады",
    });
  }

  return res.json({
    success: true,
    doctor,
  });
});

export default router;
