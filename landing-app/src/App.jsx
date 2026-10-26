
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:3000";

const specialties = [
  "Терапевт",
  "Кардиолог",
  "Невролог",
  "Офтальмолог",
  "Стоматолог",
  "Гинеколог",
  "Уролог",
  "Травматолог",
  "Педиатр",
];

const features = [
  {
    icon: "♙",
    title: "Білікті мамандар",
    description: "Тәжірибелі дәрігерлер туралы ақпарат",
  },
  {
    icon: "▦",
    title: "Клиникалар картасы",
    description: "Жақын маңдағы емханаларды табыңыз",
  },
  {
    icon: "✚",
    title: "Дәрілер",
    description: "Дәрілер туралы ақпарат пен нұсқаулық",
  },
  {
    icon: "⬡",
    title: "Қауіпсіздік",
    description: "Жеке деректеріңізді қорғау",
  },
  {
    icon: "♡",
    title: "Қолдау қызметі",
    description: "Сұрақтарыңызға көмектесуге дайынбыз",
  },
];

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

        if (!response.ok) {
          throw new Error(
            data.error || "Клиникаларды жүктеу мүмкін болмады"
          );
        }

        setClinics(
          Array.isArray(data) ? data : data.clinics || []
        );
      })
      .catch((err) => {
        setError(
          err.message ||
            "Клиникалар жүктелмеді. Серверді тексеріңіз."
        );
      });
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
        throw new Error(
          "Тіркелу үшін клиникалар тізімі қажет."
        );
      }

      if (isDoctor && isRegister && !clinicId) {
        throw new Error("Клиниканы таңдаңыз.");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Деректерді тексеріңіз."
        );
      }

      const token = data.token || data.accessToken;

      if (!token) {
        throw new Error("Сервер токен қайтармады.");
      }

      if (isDoctor) {
        const handoffResponse = await fetch(
          `${API}/api/doctor/handoff`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const handoffData = await handoffResponse
          .json()
          .catch(() => ({}));

        if (!handoffResponse.ok || !handoffData.code) {
          throw new Error(
            handoffData.error ||
              "Дәрігер кабинетін ашу мүмкін болмады."
          );
        }

        window.location.href =
          `http://localhost:5173/?handoff=${encodeURIComponent(
            handoffData.code
          )}`;
      } else {
        localStorage.setItem("medcare_patient_token", token);
        window.location.href = "http://localhost:3000/";
      }
    } catch (err) {
      setError(
        err.message || "Серверге қосылу мүмкін болмады."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="landing" id="home">
      <header className="landing-header">
        <a className="logo" href="#home" aria-label="MedCare басты бет">
          <span className="logo-icon">✚</span>
          <span>Med<span className="logo-blue">Care</span></span>
        </a>

        <nav className="main-nav">
          <a className="nav-active" href="#home">Басты бет</a>
          <a href="#features">Дәрігерлер</a>
          <a href="#features">Клиникалар</a>
          <a href="#features">Дәрілер</a>
          <a href="#features">Денсаулық</a>
        </nav>

        <button
          className="header-login"
          onClick={() =>
            document.getElementById("auth-card")?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            })
          }
          type="button"
        >
          <span>♙</span> Кіру / Тіркелу
        </button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-icon">✧</span>
            САНДЫҚ ДЕНСАУЛЫҚ САҚТАУ
          </div>

          <h1>
            Денсаулығыңызға
            <br />
            <span>қамқорлық жасаңыз</span>
          </h1>

          <p className="hero-description">
            MedCare — дәрігерлерді іздеу, қабылдауға жазылу
            және денсаулығыңызды бақылауға арналған
            ыңғайлы медициналық платформа.
          </p>

          <div className="hero-benefits">
            <div><span>✓</span> Қабылдауға онлайн жазылу</div>
            <div><span>✓</span> Дәрігерлер туралы ақпарат</div>
            <div><span>✓</span> Ыңғайлы жеке кабинет</div>
          </div>

          <div className="hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setRole("patient");
                setMode("login");
                setError("");
                document.getElementById("auth-card")?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }}
            >
              <span>▦</span> Дәрігерге жазылу <b>→</b>
            </button>

            <a className="secondary-button" href="#features">
              <span>▷</span> Қызметтерді көру
            </a>
          </div>

          <div className="trust-note">
            <span className="trust-icon">✓</span>
            Сіздің денсаулығыңыз — біздің басымдығымыз
          </div>
        </div>

        <div className="medical-art" aria-label="MedCare дәрігері">
          <div className="doctor-glow"></div>
          <div className="doctor-plus plus-one">+</div>
          <div className="doctor-plus plus-two">✚</div>

          <img
            className="doctor-image"
            src="/images/doctor.png"
            alt="Ақ халат киген дәрігер"
          />

          <div className="doctor-badge">
            <span className="badge-heart">♡</span>
            <div>
              <strong>Сенің денсаулығың</strong>
              <small>Біздің қамқорлығымызда</small>
            </div>
          </div>

          <div className="doctor-caption">
            <span>✚</span>
            <div>
              <strong>MedCare</strong>
              <small>Денсаулыққа қамқорлық</small>
            </div>
          </div>
        </div>

        <section className="auth-card" id="auth-card">
          {!role ? (
            <>
              <span className="card-eyebrow">ҚОШ КЕЛДІҢІЗ</span>
              <h2>Жалғастыру үшін таңдаңыз</h2>
              <p className="card-description">
                MedCare жүйесіне қай рөлмен кіресіз?
              </p>

              <button
                className="role-card"
                onClick={() => chooseRole("patient")}
                type="button"
              >
                <span className="role-icon patient-icon">♙</span>
                <span className="role-text">
                  <strong>Мен пациентпін</strong>
                  <small>
                    Дәрігер табу және қабылдауға жазылу
                  </small>
                </span>
                <span className="role-arrow">→</span>
              </button>

              <button
                className="role-card"
                onClick={() => chooseRole("doctor")}
                type="button"
              >
                <span className="role-icon doctor-icon">⚕</span>
                <span className="role-text">
                  <strong>Мен дәрігермін</strong>
                  <small>
                    Қабылдаулар мен жұмыс кестесін басқару
                  </small>
                </span>
                <span className="role-arrow">→</span>
              </button>

              <div className="secure-note">
                <span>♧</span>
                Сіздің деректеріңіз қорғалады
              </div>
            </>
          ) : (
            <>
              <button
                className="back-button"
                onClick={() => chooseRole("")}
                type="button"
              >
                ← Рөлді өзгерту
              </button>

              <span className="card-eyebrow">
                {role === "patient"
                  ? "ПАЦИЕНТ КАБИНЕТІ"
                  : "ДӘРІГЕР КАБИНЕТІ"}
              </span>

              <h2>
                {mode === "register"
                  ? "Тіркелу"
                  : "Қайта қош келдіңіз!"}
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
                    <label htmlFor="fullName">Аты-жөніңіз</label>
                    <input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Аты-жөніңізді енгізіңіз"
                      autoComplete="name"
                      required
                    />

                    {role === "patient" ? (
                      <>
                        <label htmlFor="phone">Телефон</label>
                        <input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+7 700 000 00 00"
                          autoComplete="tel"
                          required
                        />
                      </>
                    ) : (
                      <>
                        <label htmlFor="specialty">Мамандығы</label>
                        <select
                          id="specialty"
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          required
                        >
                          <option value="">Мамандықты таңдаңыз</option>
                          {specialties.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>

                        <label htmlFor="experience">
                          Жұмыс тәжірибесі (жыл)
                        </label>
                        <input
                          id="experience"
                          type="number"
                          min="0"
                          max="70"
                          value={experience}
                          onChange={(e) => setExperience(e.target.value)}
                          required
                        />

                        <label htmlFor="clinicId">Клиника</label>
                        <select
                          id="clinicId"
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

                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  autoComplete="email"
                  required
                />

                <label htmlFor="password">Құпиясөз</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Құпиясөзіңізді енгізіңіз"
                  autoComplete={
                    mode === "register"
                      ? "new-password"
                      : "current-password"
                  }
                  minLength={mode === "register" ? 8 : 1}
                  required
                />

                {error && (
                  <div className="form-error" role="alert">
                    {error}
                  </div>
                )}

                <button
                  className="submit-button"
                  type="submit"
                  disabled={loading}
                >
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
                  Дәрігер туралы мәліметтер тіркелгеннен кейін
                  деректер базасында сақталады.
                </p>
              )}
            </>
          )}
        </section>
      </section>

      <section className="features" id="features">
        {features.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <div className="feature-icon">{feature.icon}</div>
            <div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          </article>
        ))}
      </section>

      <footer className="landing-footer">
        <span>© 2026 MedCare. Барлық құқық қорғалған.</span>
        <div>
          <a href="#features">Құпиялық саясаты</a>
          <span className="footer-divider">|</span>
          <a href="#features">Пайдалану шарттары</a>
        </div>
      </footer>
    </main>
  );
}
