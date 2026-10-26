
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:3000";

export default function App() {
  const [role, setRole] = useState("");
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [experience, setExperience] = useState("0");
  const [clinicId, setClinicId] = useState("");
  const [clinics, setClinics] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role !== "doctor" || mode !== "register") return;

    fetch(`${API}/api/clinics`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Клиникаларды жүктеу мүмкін болмады");
        setClinics(Array.isArray(data) ? data : data.clinics || []);
      })
      .catch(() => setError("Клиникалар жүктелмеді. Сервердегі клиникалар API маршрутын тексеріңіз."));
  }, [role, mode]);

  function chooseRole(selectedRole) {
    setRole(selectedRole);
    setMode("login");
    setError("");
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const isDoctor = role === "doctor";
      const isRegister = mode === "register";

      if (isDoctor && isRegister && !clinics.length) {
        throw new Error("Тіркелу үшін клиника тізімі қажет. Сервердегі клиникалар маршрутын тексеріңіз.");
      }

      const endpoint = isDoctor
        ? `${API}/api/doctor/${isRegister ? "register" : "login"}`
        : `${API}/api/patient/${isRegister ? "register" : "login"}`;

      const body = isDoctor
        ? isRegister
          ? {
              fullName,
              email,
              password,
              specialty,
              experience: Number(experience),
              clinicId: Number(clinicId),
            }
          : { email, password }
        : isRegister
          ? { fullName, email, password, phone }
          : { email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Деректерді тексеріңіз.");
      }

      const token = data.token || data.accessToken;

      if (!token) throw new Error("Сервер токен қайтармады.");

      if (isDoctor) {
        localStorage.setItem("medcare_doctor_token", token);
        window.location.href = "http://localhost:5173/";
      } else {
        localStorage.setItem("medcare_patient_token", token);
        window.location.href = "http://localhost:3000/";
      }
    } catch (err) {
      setError(err.message || "Серверге қосылу мүмкін болмады.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="landing">
      <header className="landing-header">
        <a className="logo" href="/">
          <span className="logo-icon">✚</span>
          <span>MedCare</span>
        </a>
        <span className="header-label">Денсаулығыңыз — басты орында</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">САНДЫҚ ДЕНСАУЛЫҚ САҚТАУ</span>
          <h1>
            Денсаулығыңызға
            <br />
            <span>қамқорлық</span> жасаңыз
          </h1>
          <p>
            Дәрігерлерді іздеңіз, қабылдауға жазылыңыз
            және медициналық қызметтерді бір жерден басқарыңыз.
          </p>

          <div className="hero-benefits">
            <div><span>✓</span> Қабылдауға онлайн жазылу</div>
            <div><span>✓</span> Дәрігерлер туралы ақпарат</div>
            <div><span>✓</span> Ыңғайлы жеке кабинет</div>
          </div>

          <div className="medical-art" aria-hidden="true">
            <div className="art-circle circle-one"></div>
            <div className="art-circle circle-two"></div>
            <div className="medical-cross">✚</div>
            <div className="art-card card-one">♡ <span>Денсаулық</span></div>
            <div className="art-card card-two">✚ <span>MedCare</span></div>
          </div>
        </div>

        <div className="auth-card">
          {!role ? (
            <>
              <span className="card-eyebrow">ҚОШ КЕЛДІҢІЗ</span>
              <h2>Жалғастыру үшін таңдаңыз</h2>
              <p className="card-description">
                MedCare жүйесіне қай рөлмен кіресіз?
              </p>

              <button className="role-card" onClick={() => chooseRole("patient")}>
                <span className="role-icon patient-icon">♙</span>
                <span className="role-text">
                  <strong>Мен пациентпін</strong>
                  <small>Дәрігер табу және қабылдауға жазылу</small>
                </span>
                <span className="role-arrow">→</span>
              </button>

              <button className="role-card" onClick={() => chooseRole("doctor")}>
                <span className="role-icon doctor-icon">⚕</span>
                <span className="role-text">
                  <strong>Мен дәрігермін</strong>
                  <small>Қабылдаулар мен жұмыс кестесін басқару</small>
                </span>
                <span className="role-arrow">→</span>
              </button>

              <div className="secure-note">
                <span>♧</span> Сіздің деректеріңіз қорғалады
              </div>
            </>
          ) : (
            <>
              <button className="back-button" onClick={() => chooseRole("")} type="button">
                ← Рөлді өзгерту
              </button>

              <span className="card-eyebrow">
                {role === "patient" ? "ПАЦИЕНТ КАБИНЕТІ" : "ДӘРІГЕР КАБИНЕТІ"}
              </span>

              <h2>
                {mode === "register" ? "Тіркелу" : "Қайта қош келдіңіз!"}
              </h2>

              <p className="card-description">
                {role === "patient"
                  ? "Пациент ретінде жүйеге кіріңіз."
                  : "Дәрігер кабинетіне кіріңіз немесе жаңа аккаунт ашыңыз."}
              </p>

              <div className="auth-tabs">
                <button
                  type="button"
                  className={mode === "login" ? "selected" : ""}
                  onClick={() => changeMode("login")}
                >
                  Кіру
                </button>
                <button
                  type="button"
                  className={mode === "register" ? "selected" : ""}
                  onClick={() => changeMode("register")}
                >
                  Тіркелу
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {mode === "register" && (
                  <>
                    <label>Аты-жөніңіз</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Аты-жөніңізді енгізіңіз"
                      required
                    />

                    {role === "patient" ? (
                      <>
                        <label>Телефон</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+7 700 000 00 00"
                          required
                        />
                      </>
                    ) : (
                      <>
                        <label>Мамандығы</label>
                        <select
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          required
                        >
                          <option value="">Мамандықты таңдаңыз</option>
                          <option value="Терапевт">Терапевт</option>
                          <option value="Кардиолог">Кардиолог</option>
                          <option value="Невролог">Невролог</option>
                          <option value="Офтальмолог">Офтальмолог</option>
                          <option value="Стоматолог">Стоматолог</option>
                          <option value="Гинеколог">Гинеколог</option>
                          <option value="Уролог">Уролог</option>
                          <option value="Травматолог">Травматолог</option>
                          <option value="Педиатр">Педиатр</option>
                        </select>

                        <label>Жұмыс тәжірибесі (жыл)</label>
                        <input
                          type="number"
                          min="0"
                          max="70"
                          value={experience}
                          onChange={(e) => setExperience(e.target.value)}
                          required
                        />

                        <label>Клиника</label>
                        <select
                          value={clinicId}
                          onChange={(e) => setClinicId(e.target.value)}
                          required
                        >
                          <option value="">Клиниканы таңдаңыз</option>
                          {clinics.map((clinic) => (
                            <option key={clinic.id} value={clinic.id}>
                              {clinic.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </>
                )}

                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                />

                <label>Құпиясөз</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Құпиясөзіңізді енгізіңіз"
                  minLength={mode === "register" ? 8 : 1}
                  required
                />

                {error && <div className="form-error" role="alert">{error}</div>}

                <button className="submit-button" type="submit" disabled={loading}>
                  {loading
                    ? "Күте тұрыңыз..."
                    : mode === "register"
                      ? "Тіркелу"
                      : "Жүйеге кіру"}
                  {!loading && <span>→</span>}
                </button>
              </form>

              {role === "doctor" && mode === "register" && (
                <p className="doctor-hint">
                  Дәрігер туралы мәліметтер тіркелгеннен кейін деректер базасында сақталады.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <footer className="landing-footer">
        <span>© 2026 MedCare</span>
        <span>Сіздің денсаулығыңызға қамқорлықпен</span>
      </footer>
    </main>
  );
}
