
import { useState } from "react";
import {
  Activity,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  CalendarDays,
  Users,
  ChartNoAxesColumnIncreasing,
  ArrowRight,
  ShieldCheck,
  Globe2,
  CheckCircle2,
  Stethoscope,
  TrendingUp,
  Clock3,
  AlertCircle
} from "lucide-react";

import "./DoctorLogin.css";

const API = "http://localhost:3000";

const translations = {
  kk: {
    badge: "ДӘРІГЕРЛЕРГЕ АРНАЛҒАН ПЛАТФОРМА",
    title1: "Дәрігердің",
    title2: "жеке жұмыс",
    title3: "кеңістігі",
    description:
      "Пациенттеріңізді, қабылдауларды және жұмыс кестеңізді бір платформада ыңғайлы басқарыңыз.",
    feature1: "Қабылдауларды басқару",
    detail1: "Күнделікті жазылулар мен кесте",
    feature2: "Пациенттермен байланыс",
    detail2: "Толық ақпарат және тарихы",
    feature3: "Жұмыс тиімділігі",
    detail3: "Статистика және аналитика",
    welcome: "Қош келдіңіз!",
    subtitle: "Дәрігер аккаунтыңызға кіріңіз",
    email: "Электрондық пошта",
    password: "Құпиясөз",
    remember: "Мені есте сақтау",
    forgot: "Құпиясөзді ұмыттыңыз ба?",
    login: "Жүйеге кіру",
    loading: "Тексерілуде...",
    or: "немесе",
    register: "Дәрігер ретінде тіркелу (растау арқылы)",
    security: "Сіздің деректеріңіз қорғалған",
    securityDetail: "MEDCARE • Қауіпсіз авторизация",
    appointments: "Бүгінгі қабылдаулар",
    next: "Келесі қабылдау",
    demo: "Дизайн үлгісі",
    recovery:
      "Құпиясөзді қалпына келтіруді әкімші арқылы орындаймыз.",
    registration:
      "Дәрігер аккаунтын MEDCARE әкімшісі жасайды және растайды.",
    close: "Жабу"
  },

  ru: {
    badge: "ПЛАТФОРМА ДЛЯ ВРАЧЕЙ",
    title1: "Личное",
    title2: "рабочее",
    title3: "пространство",
    description:
      "Управляйте пациентами, приёмами и рабочим расписанием в одной удобной платформе.",
    feature1: "Управление приёмами",
    detail1: "Ежедневные записи и расписание",
    feature2: "Работа с пациентами",
    detail2: "Информация и история",
    feature3: "Эффективность работы",
    detail3: "Статистика и аналитика",
    welcome: "Добро пожаловать!",
    subtitle: "Войдите в аккаунт врача",
    email: "Электронная почта",
    password: "Пароль",
    remember: "Запомнить меня",
    forgot: "Забыли пароль?",
    login: "Войти в систему",
    loading: "Проверяем...",
    or: "или",
    register: "Регистрация врача (с подтверждением)",
    security: "Ваши данные защищены",
    securityDetail: "MEDCARE • Безопасная авторизация",
    appointments: "Приёмов сегодня",
    next: "Следующий приём",
    demo: "Демонстрация дизайна",
    recovery:
      "Восстановление пароля пока выполняется через администратора.",
    registration:
      "Аккаунт врача создаёт и подтверждает администратор MEDCARE.",
    close: "Закрыть"
  }
};

export default function DoctorLogin({ onLogin }) {
  const [language, setLanguage] = useState("kk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState("");

  const t = translations[language];

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/doctor/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Жүйеге кіру мүмкін болмады"
        );
      }

      if (!data.token || !data.doctor) {
        throw new Error(
          "Сервер токенді немесе дәрігер деректерін жібермеді"
        );
      }

      // Ескі токендерді өшіреміз.
      sessionStorage.removeItem("medcare_doctor_token");
      localStorage.removeItem("medcare_doctor_token");

      // «Мені есте сақтау» таңдауына қарай сақтаймыз.
      const storage = remember ? localStorage : sessionStorage;

      storage.setItem("medcare_doctor_token", data.token);

      // Дәрігер кабинетін ашамыз.
      onLogin(data.doctor);
    } catch (err) {
      console.error("DOCTOR LOGIN ERROR:", err);

      if (err instanceof TypeError) {
        setError(
          "Сервермен байланыс жоқ. Backend серверінің іске қосылғанын тексеріңіз."
        );
      } else {
        setError(
          err.message || "Жүйеге кіру мүмкін болмады"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mc-login-page">
      <div className="mc-login-top">
        <div className="mc-logo">
          <Activity size={34} strokeWidth={2.8} />

          <div>
            <strong>
              Med<span>Care</span>
            </strong>
            <small>DOCTOR WORKSPACE</small>
          </div>
        </div>

        <button
          type="button"
          className="mc-language"
          onClick={() =>
            setLanguage(language === "kk" ? "ru" : "kk")
          }
        >
          <Globe2 size={18} />
          {language === "kk" ? "Қазақша" : "Русский"}
          <span>⌄</span>
        </button>
      </div>

      <div className="mc-login-layout">
        <section className="mc-hero">
          <div className="mc-hero-content">
            <div className="mc-hero-badge">
              <span className="mc-pulse" />
              {t.badge}
            </div>

            <h1>
              {t.title1}
              <br />
              {t.title2}
              <br />
              <span>{t.title3}</span>
            </h1>

            <p className="mc-description">
              {t.description}
            </p>

            <div className="mc-features">
              {[
                {
                  icon: CalendarDays,
                  title: t.feature1,
                  detail: t.detail1
                },
                {
                  icon: Users,
                  title: t.feature2,
                  detail: t.detail2
                },
                {
                  icon: ChartNoAxesColumnIncreasing,
                  title: t.feature3,
                  detail: t.detail3
                }
              ].map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <div className="mc-feature" key={index}>
                    <div className="mc-feature-icon">
                      <Icon size={24} />
                    </div>

                    <div>
                      <strong>{feature.title}</strong>
                      <span>{feature.detail}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mc-hero-footer">
              <div className="mc-progress">
                <span />
                <span />
                <span />
              </div>

              <small>
                © 2026 MedCare — Medical Platform
              </small>
            </div>
          </div>

          <div className="mc-doctor-visual">
            <div className="mc-doctor-circle" />

            <img
              className="mc-doctor-photo"
              src="/doctor-hero.png"
              alt="MEDCARE дәрігері"
            />

            <div className="mc-floating-card mc-floating-top">
              <div className="mc-floating-icon">
                <TrendingUp size={23} />
              </div>

              <div>
                <small>{t.appointments}</small>
                <strong>
                  12 <span>↗ +3%</span>
                </strong>
                <em>{t.demo}</em>
              </div>
            </div>

            <div className="mc-floating-card mc-floating-bottom">
              <div className="mc-floating-icon">
                <Clock3 size={23} />
              </div>

              <div>
                <small>{t.next}</small>
                <strong>10:30</strong>
                <em>{t.demo}</em>
              </div>
            </div>
          </div>
        </section>

        <section className="mc-form-section">
          <div className="mc-login-card">
            <div className="mc-form-brand">
              <Activity size={33} />

              <div>
                <strong>
                  Med<span>Care</span>
                </strong>
                <small>DOCTOR WORKSPACE</small>
              </div>
            </div>

            <h2>{t.welcome}</h2>
            <p className="mc-form-subtitle">
              {t.subtitle}
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="mc-email">
                {t.email}
              </label>

              <div className="mc-input">
                <Mail size={21} />

                <input
                  id="mc-email"
                  type="email"
                  placeholder="doctor@medcare.kz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <label htmlFor="mc-password">
                {t.password}
              </label>

              <div className="mc-input">
                <LockKeyhole size={21} />

                <input
                  id="mc-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="mc-eye"
                  aria-label={
                    showPassword
                      ? "Құпиясөзді жасыру"
                      : "Құпиясөзді көрсету"
                  }
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword
                    ? <EyeOff size={20} />
                    : <Eye size={20} />}
                </button>
              </div>

              <div className="mc-form-options">
                <label className="mc-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) =>
                      setRemember(e.target.checked)
                    }
                  />
                  <span>{t.remember}</span>
                </label>

                <button
                  type="button"
                  className="mc-text-button"
                  onClick={() => setModal("recovery")}
                >
                  {t.forgot}
                </button>
              </div>

              {error && (
                <div className="mc-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                className="mc-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? t.loading : t.login}
                {!loading && <ArrowRight size={20} />}
              </button>
            </form>

            <div className="mc-divider">
              <span />
              {t.or}
              <span />
            </div>

            <button
              type="button"
              className="mc-register"
              onClick={() => setModal("registration")}
            >
              <Users size={20} />
              {t.register}
              <ArrowRight size={18} />
            </button>

            <div className="mc-security">
              <ShieldCheck size={27} />

              <div>
                <strong>{t.security}</strong>
                <span>{t.securityDetail}</span>
              </div>

              <CheckCircle2 size={17} />
            </div>
          </div>
        </section>
      </div>

      {modal && (
        <div
          className="mc-modal-backdrop"
          onClick={() => setModal("")}
        >
          <div
            className="mc-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <Stethoscope size={32} />

            <h3>
              {modal === "recovery"
                ? t.forgot
                : t.register}
            </h3>

            <p>
              {modal === "recovery"
                ? t.recovery
                : t.registration}
            </p>

            <button
              type="button"
              onClick={() => setModal("")}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
