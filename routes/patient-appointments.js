
import express from "express";
import db from "../database/db.js";
import jwt from "jsonwebtoken";


const router = express.Router();

// 1. Список врачей
router.get("/doctors", (req, res) => {
    try {
        const doctors = db.prepare(`
            SELECT
                d.id,
                u.full_name,
                d.specialty,
                d.experience,
                d.description,
                d.clinic_id
            FROM doctors d
            JOIN users u ON u.id = d.user_id
            ORDER BY u.full_name
        `).all();

        res.json({
            success: true,
            doctors
        });
    } catch (err) {
        console.error("Ошибка загрузки врачей:", err);

        res.status(500).json({
            success: false,
            message: "Не удалось загрузить список врачей"
        });
    }
});


// 2. Создание записи на приём

router.post("/appointments", (req, res) => {
    const {
        doctorId,
        appointmentDate,
        appointmentTime,
        fullName,
        phone,
        email,
        comment
    } = req.body;

    const doctor = Number(doctorId);

    if (!Number.isInteger(doctor) || doctor <= 0 ||
        !appointmentDate || !appointmentTime) {
        return res.status(400).json({
            success: false,
            message: "Дәрігерді, күнді және уақытты таңдаңыз"
        });
    }

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Пациент аккаунтына қайта кіріңіз."
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "patient" || !decoded.patientId) {
            return res.status(403).json({
                success: false,
                message: "Бұл әрекет пациент аккаунтына арналған."
            });
        }

        const patient = Number(decoded.patientId);

        const doctorExists = db.prepare(
            "SELECT id FROM doctors WHERE id = ?"
        ).get(doctor);

        if (!doctorExists) {
            return res.status(404).json({
                success: false,
                message: "Дәрігер табылмады."
            });
        }

        const patientExists = db.prepare(
            "SELECT id FROM patients WHERE id = ?"
        ).get(patient);

        if (!patientExists) {
            return res.status(404).json({
                success: false,
                message: "Пациент табылмады."
            });
        }

        const result = db.prepare(`
            INSERT INTO appointments (
                patient_id,
                doctor_id,
                appointment_date,
                appointment_time,
                status
            )
            VALUES (?, ?, ?, ?, 'pending')
        `).run(patient, doctor, appointmentDate, appointmentTime);

        return res.status(201).json({
            success: true,
            message: "Жазылу сәтті орындалды!",
            appointment: {
                id: Number(result.lastInsertRowid),
                patientId: patient,
                doctorId: doctor,
                appointmentDate,
                appointmentTime,
                fullName: fullName || "",
                phone: phone || "",
                email: email || "",
                comment: comment || "",
                status: "pending"
            }
        });
    } catch (err) {
        if (err.name === "JsonWebTokenError" ||
            err.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Сессия аяқталды. Қайта кіріңіз."
            });
        }

        console.error("Appointment error:", err);

        return res.status(500).json({
            success: false,
            message: "Жазылуды сақтау мүмкін болмады."
        });
    }
});

// 4. Отмена записи
router.patch("/appointments/:id/cancel", (req, res) => {
    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Некорректный ID записи"
        });
    }

    try {
        const appointment = db.prepare(`
            SELECT id, status
            FROM appointments
            WHERE id = ?
        `).get(appointmentId);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Запись не найдена"
            });
        }

        if (!["pending", "confirmed"].includes(
            String(appointment.status).toLowerCase()
        )) {
            return res.status(409).json({
                success: false,
                message: "Эту запись уже нельзя отменить",
                status: appointment.status
            });
        }

        db.prepare(`
            UPDATE appointments
            SET status = 'cancelled'
            WHERE id = ?
        `).run(appointmentId);

        return res.json({
            success: true,
            message: "Запись отменена",
            id: appointmentId,
            status: "cancelled"
        });
    } catch (err) {
        console.error("Ошибка отмены записи:", err);

        return res.status(500).json({
            success: false,
            message: "Не удалось отменить запись"
        });
    }
});

export default router;
