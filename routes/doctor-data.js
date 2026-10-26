
import { Router } from "express";
import jwt from "jsonwebtoken";
import db from "../database/db.js";

const router = Router();

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: "Жүйеге кіру қажет"
    });
  }

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);

    if (
      req.auth.role !== "doctor" ||
      !req.auth.doctorId
    ) {
      return res.status(403).json({
        error: "Тек дәрігерге рұқсат"
      });
    }

    next();
  } catch {
    return res.status(401).json({
      error: "Сессия жарамсыз немесе мерзімі аяқталған"
    });
  }
}

// Дәрігердің қабылдаулары
router.get("/appointments", authenticate, (req, res) => {
  try {
    const appointments = db.prepare(`
      SELECT
        a.id,
        a.appointment_date AS date,
        a.appointment_time AS time,
        a.status,
        u.full_name AS patientName,
        p.phone AS patientPhone,
        u.email AS patientEmail
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN users u ON u.id = p.user_id
      WHERE a.doctor_id = ?
      ORDER BY a.appointment_date DESC,
               a.appointment_time ASC
    `).all(req.auth.doctorId);

    res.json({ success: true, appointments });
  } catch (error) {
    console.error("APPOINTMENTS ERROR:", error.message);
    res.status(500).json({
      error: "Қабылдауларды жүктеу мүмкін болмады"
    });
  }
});

// Қабылдау статусын өзгерту
router.patch("/appointments/:id/status", authenticate, (req, res) => {
  const { status } = req.body;
  const allowedStatuses = [
    "pending",
    "confirmed",
    "completed",
    "cancelled"
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: "Қабылдау статусы дұрыс емес"
    });
  }

  try {
    const result = db.prepare(`
      UPDATE appointments
      SET status = ?
      WHERE id = ? AND doctor_id = ?
    `).run(status, req.params.id, req.auth.doctorId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Қабылдау табылмады"
      });
    }

    res.json({
      success: true,
      message: "Қабылдау статусы жаңартылды"
    });
  } catch (error) {
    console.error("STATUS UPDATE ERROR:", error.message);
    res.status(500).json({
      error: "Статусты өзгерту мүмкін болмады"
    });
  }
});

// Осы дәрігер қабылдайтын пациенттер
router.get("/patients", authenticate, (req, res) => {
  try {
    const patients = db.prepare(`
      SELECT
        p.id,
        u.full_name AS fullName,
        u.email,
        p.phone,
        COUNT(a.id) AS appointmentCount,
        MAX(a.appointment_date) AS lastAppointment
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN users u ON u.id = p.user_id
      WHERE a.doctor_id = ?
      GROUP BY p.id, u.full_name, u.email, p.phone
      ORDER BY u.full_name ASC
    `).all(req.auth.doctorId);

    res.json({ success: true, patients });
  } catch (error) {
    console.error("PATIENTS ERROR:", error.message);
    res.status(500).json({
      error: "Пациенттерді жүктеу мүмкін болмады"
    });
  }
});

export default router;
