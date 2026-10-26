
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../database/db.js";

const router = Router();

function authenticatePatient(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
        ? header.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({
            success: false,
            error: "Жүйеге кіру қажет"
        });
    }

    try {
        const auth = jwt.verify(token, process.env.JWT_SECRET);

        if (auth.role !== "patient") {
            return res.status(403).json({
                success: false,
                error: "Бұл бөлім тек пациенттерге арналған"
            });
        }

        req.auth = auth;
        next();
    } catch {
        return res.status(401).json({
            success: false,
            error: "Сессия жарамсыз немесе мерзімі аяқталған"
        });
    }
}

router.post("/register", async (req, res) => {
    try {
        const fullName = String(req.body?.fullName || "").trim();
        const email = String(req.body?.email || "")
            .trim()
            .toLowerCase();
        const password = req.body?.password;
        const phone = String(req.body?.phone || "").trim();

        if (
            !fullName ||
            !email ||
            typeof password !== "string" ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                error: "Аты-жөніңізді, email және құпиясөзді енгізіңіз"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: "Құпиясөз кемінде 8 таңбадан тұруы керек"
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                error: "Email форматы дұрыс емес"
            });
        }

        const existingUser = db.prepare(
            "SELECT id FROM users WHERE email = ?"
        ).get(email);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: "Бұл email бұрын тіркелген"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const createPatient = db.transaction(() => {
            const userResult = db.prepare(`
                INSERT INTO users (full_name, email, password_hash, role)
                VALUES (?, ?, ?, 'patient')
            `).run(fullName, email, passwordHash);

            const userId = Number(userResult.lastInsertRowid);

            const patientResult = db.prepare(`
                INSERT INTO patients (user_id, phone)
                VALUES (?, ?)
            `).run(userId, phone || null);

            return {
                userId,
                patientId: Number(patientResult.lastInsertRowid)
            };
        });

        const patient = createPatient();

        const token = jwt.sign(
            {
                userId: patient.userId,
                patientId: patient.patientId,
                role: "patient"
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        return res.status(201).json({
            success: true,
            message: "Тіркелу сәтті аяқталды",
            token,
            patient: {
                id: patient.patientId,
                fullName,
                email,
                phone
            }
        });
    } catch (error) {
        console.error("PATIENT REGISTER ERROR:", error.message);

        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                success: false,
                error: "Бұл email бұрын тіркелген"
            });
        }

        return res.status(500).json({
            success: false,
            error: "Тіркелу кезінде сервер қатесі пайда болды"
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const email = String(req.body?.email || "")
            .trim()
            .toLowerCase();
        const password = req.body?.password;

        if (!email || typeof password !== "string" || !password) {
            return res.status(400).json({
                success: false,
                error: "Email және құпиясөзді енгізіңіз"
            });
        }

        const patient = db.prepare(`
            SELECT
                u.id AS user_id,
                u.full_name,
                u.email,
                u.password_hash,
                p.id AS patient_id,
                p.phone
            FROM users u
            JOIN patients p ON p.user_id = u.id
            WHERE u.email = ? AND u.role = 'patient'
        `).get(email);

        const valid = patient
            ? await bcrypt.compare(password, patient.password_hash)
            : false;

        if (!valid) {
            return res.status(401).json({
                success: false,
                error: "Email немесе құпиясөз қате"
            });
        }

        const token = jwt.sign(
            {
                userId: patient.user_id,
                patientId: patient.patient_id,
                role: "patient"
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        return res.json({
            success: true,
            message: "Жүйеге кіру сәтті аяқталды",
            token,
            patient: {
                id: patient.patient_id,
                fullName: patient.full_name,
                email: patient.email,
                phone: patient.phone
            }
        });
    } catch (error) {
        console.error("PATIENT LOGIN ERROR:", error.message);

        return res.status(500).json({
            success: false,
            error: "Авторизация кезінде сервер қатесі пайда болды"
        });
    }
});

router.get("/me", authenticatePatient, (req, res) => {
    const patient = db.prepare(`
        SELECT
            p.id,
            u.full_name AS fullName,
            u.email,
            p.phone
        FROM patients p
        JOIN users u ON u.id = p.user_id
        WHERE p.id = ? AND u.id = ?
    `).get(req.auth.patientId, req.auth.userId);

    if (!patient) {
        return res.status(404).json({
            success: false,
            error: "Пациент табылмады"
        });
    }

    return res.json({
        success: true,
        patient
    });
});

export default router;
