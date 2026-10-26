
import { useCallback, useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";

import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock3,
  UserRound,
  Stethoscope,
  Bell,
  LogOut,
  Activity,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";

import DoctorLogin from "./DoctorLogin.jsx";
import "./doctor.css";

const API = "http://localhost:3000";

const getDoctorToken = () =>
  sessionStorage.getItem("medcare_doctor_token") ||
  localStorage.getItem("medcare_doctor_token");

const clearDoctorToken = () => {
  sessionStorage.removeItem("medcare_doctor_token");
  localStorage.removeItem("medcare_doctor_token");
};

const menu = [
  { to: "/", label: "Басты бет", icon: LayoutDashboard },
  { to: "/appointments", label: "Қабылдаулар", icon: CalendarDays },
  { to: "/patients", label: "Пациенттерім", icon: Users },
  { to: "/schedule", label: "Менің кестем", icon: Clock3 },
  { to: "/profile", label: "Профиль", icon: UserRound },
];

const statusLabels = {
  pending: "Күтуде",
  confirmed: "Расталды",
  completed: "Аяқталды",
  cancelled: "Бас тартылды",
};

function todayString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Бір API сұрауын ортақ өңдеу
async function apiRequest(path, options = {}) {
  const token = getDoctorToken();

  if (!token) {
    throw new Error("Жүйеге қайта кіру қажет.");
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearDoctorToken();
    window.dispatchEvent(new Event("medcare-session-expired"));
    throw new Error(data.error || "Сессия аяқталды. Қайта кіріңіз.");
  }

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `Сервер қатесі: ${response.status}`
    );
  }

  return data;
}

// ==========================================
// SIDEBAR
// ==========================================

function Sidebar({ doctor }) {
  const fullName =
    doctor?.fullName || doctor?.full_name || "Дәрігер";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Activity size={25} />
        </div>
        <div>
          <strong>MedCare</strong>
          <small>Doctor Workspace</small>
        </div>
      </div>

      <div className="side-label">ДӘРІГЕР КАБИНЕТІ</div>

      <nav className="navigation">
        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <Icon size={19} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="doctor-mini">
          <div className="avatar">👩‍⚕️</div>
          <div>
            <strong>{fullName}</strong>
            <small>{doctor?.specialty || "Дәрігер"}</small>
          </div>
        </div>

        <a
          href="http://localhost:3000/index.html"
          className="logout"
        >
          <LogOut size={18} />
          Негізгі сайтқа қайту
        </a>
      </div>
    </aside>
  );
}

// ==========================================
// DASHBOARD
// ==========================================

function Dashboard({ doctor }) {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [appointmentsData, patientsData] = await Promise.all([
        apiRequest("/api/doctor/appointments"),
        apiRequest("/api/doctor/patients"),
      ]);

      setAppointments(appointmentsData.appointments || []);
      setPatients(patientsData.patients || []);
    } catch (err) {
      setError(err.message || "Деректерді жүктеу мүмкін болмады");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const todayAppointments = appointments.filter(
    (item) => item.date === todayString()
  );

  const pendingCount = appointments.filter(
    (item) => item.status === "pending"
  ).length;

  const completedCount = appointments.filter(
    (item) => item.status === "completed"
  ).length;

  const stats = [
    {
      label: "Бүгінгі қабылдаулар",
      value: todayAppointments.length,
      icon: CalendarDays,
    },
    {
      label: "Менің пациенттерім",
      value: patients.length,
      icon: Users,
    },
    {
      label: "Күтудегі жазылулар",
      value: pendingCount,
      icon: Clock3,
    },
    {
      label: "Аяқталған қабылдаулар",
      value: completedCount,
      icon: CheckCircle2,
    },
  ];

  const fullName =
    doctor?.fullName || doctor?.full_name || "Дәрігер";

  const firstName = fullName.split(" ")[0];

  return (
    <>
      <div className="welcome">
        <div>
          <div className="eyebrow">
            MEDCARE / ДӘРІГЕР КАБИНЕТІ
          </div>

          <h1>Қайырлы күн, {firstName}! 👋</h1>

          <p>
            Бүгінгі қабылдаулар мен жұмыс кестеңізді осы жерден басқарыңыз.
          </p>
        </div>

        <div className="welcome-icon">
          <Stethoscope size={43} />
        </div>
      </div>

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}

      <div className="stats">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div className="stat-card" key={item.label}>
              <div className="stat-top">
                <span>{item.label}</span>
                <div className="stat-icon">
                  <Icon size={21} />
                </div>
              </div>

              <strong>{loading ? "…" : item.value}</strong>
              <small>Деректер базасынан</small>
            </div>
          );
        })}
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Бүгінгі қабылдаулар</h2>
              <p>Бүгінге жоспарланған пациенттер</p>
            </div>

            <NavLink to="/appointments" className="view-all">
              Барлығын көру
              <ArrowUpRight size={16} />
            </NavLink>
          </div>

          {loading ? (
            <p>Қабылдаулар жүктелуде...</p>
          ) : todayAppointments.length === 0 ? (
            <p>Бүгінге қабылдаулар табылмады.</p>
          ) : (
            <div className="appointment-list">
              {todayAppointments.map((item) => (
                <div className="appointment-row" key={item.id}>
                  <div className="patient-avatar">
                    {(item.patientName || "?").charAt(0)}
                  </div>

                  <div className="patient-info">
                    <strong>{item.patientName || "Пациент"}</strong>
                    <small>
                      {item.patientPhone ||
                        item.patientEmail ||
                        "Байланыс дерегі жоқ"}
                    </small>
                  </div>

                  <span className="appointment-time">
                    {item.time || "—"}
                  </span>

                  <span className={`status ${item.status}`}>
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel schedule-panel">
          <div className="panel-heading">
            <div>
              <h2>Жұмыс кестесі</h2>
              <p>Бүгінгі жоспар</p>
            </div>
          </div>

          <div className="schedule-highlight">
            <Clock3 size={23} />
            <div>
              <strong>09:00 – 18:00</strong>
              <span>Қабылдау уақыты</span>
            </div>
          </div>

          <div className="schedule-info">
            <span>☕ Үзіліс</span>
            <strong>13:00 – 14:00</strong>
          </div>

          <NavLink className="primary-btn" to="/schedule">
            Кестені басқару
          </NavLink>
        </section>
      </div>
    </>
  );
}

// ==========================================
// APPOINTMENTS
// ==========================================

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/doctor/appointments");
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err.message || "Қабылдауларды жүктеу мүмкін болмады");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  async function changeStatus(id, status) {
    setSavingId(id);
    setError("");

    try {
      await apiRequest(`/api/doctor/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      await loadAppointments();
    } catch (err) {
      setError(err.message || "Мәртебені сақтау мүмкін болмады");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Қабылдаулар</h2>
          <p>Деректер базасындағы жазылулар тізімі</p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={loadAppointments}
          disabled={loading}
        >
          {loading ? "Жүктелуде..." : "Жаңарту"}
        </button>
      </div>

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p>Қабылдаулар жүктелуде...</p>
      ) : appointments.length === 0 ? (
        <p>Әзірге қабылдаулар жоқ.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Пациент</th>
                <th>Күні</th>
                <th>Уақыты</th>
                <th>Мәртебесі</th>
                <th>Мәртебені өзгерту</th>
              </tr>
            </thead>

            <tbody>
              {appointments.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.patientName || "Пациент"}</strong>
                    <br />
                    <small>
                      {item.patientPhone ||
                        item.patientEmail ||
                        "Байланыс дерегі жоқ"}
                    </small>
                  </td>

                  <td>{item.date || "—"}</td>
                  <td>{item.time || "—"}</td>

                  <td>
                    <span className={`status ${item.status}`}>
                      {statusLabels[item.status] || item.status}
                    </span>
                  </td>

                  <td>
                    <select
                      value={item.status}
                      disabled={savingId === item.id}
                      onChange={(event) =>
                        changeStatus(item.id, event.target.value)
                      }
                      aria-label={`Қабылдау ${item.id} мәртебесі`}
                    >
                      <option value="pending">Күтуде</option>
                      <option value="confirmed">Расталды</option>
                      <option value="completed">Аяқталды</option>
                      <option value="cancelled">Бас тартылды</option>
                    </select>

                    {savingId === item.id && (
                      <small> Сақталуда...</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ==========================================
// PATIENTS
// ==========================================

function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/doctor/patients");
      setPatients(data.patients || []);
    } catch (err) {
      setError(err.message || "Пациенттерді жүктеу мүмкін болмады");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filteredPatients = patients.filter((patient) => {
    const text = search.trim().toLowerCase();

    return (
      (patient.fullName || "").toLowerCase().includes(text) ||
      (patient.email || "").toLowerCase().includes(text) ||
      (patient.phone || "").toLowerCase().includes(text)
    );
  });

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Пациенттерім</h2>
          <p>Сізге жазылған пациенттер тізімі</p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={loadPatients}
          disabled={loading}
        >
          {loading ? "Жүктелуде..." : "Жаңарту"}
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Аты-жөні, email немесе телефон бойынша іздеу..."
        className="search-input"
      />

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p>Пациенттер жүктелуде...</p>
      ) : filteredPatients.length === 0 ? (
        <p>
          {search
            ? "Іздеу бойынша пациент табылмады."
            : "Әзірге пациенттер жоқ."}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Аты-жөні</th>
                <th>Email</th>
                <th>Телефон</th>
                <th>Қабылдаулар саны</th>
                <th>Соңғы қабылдау</th>
              </tr>
            </thead>

            <tbody>
              {filteredPatients.map((patient, index) => (
                <tr key={patient.id}>
                  <td>{index + 1}</td>
                  <td><strong>{patient.fullName || "—"}</strong></td>
                  <td>{patient.email || "—"}</td>
                  <td>{patient.phone || "—"}</td>
                  <td>{patient.appointmentCount ?? 0}</td>
                  <td>{patient.lastAppointment || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ==========================================
// OTHER PAGES
// ==========================================

function Placeholder({ title, description }) {
  return (
    <section className="panel placeholder">
      <Stethoscope size={40} />
      <h2>{title}</h2>
      <p>{description}</p>

      <NavLink to="/" className="primary-btn">
        Басты бетке қайту
      </NavLink>
    </section>
  );
}

// ==========================================
// MAIN APP
// ==========================================
let doctorHandoffPromise = null;
export default function App() {
  const [doctor, setDoctor] = useState(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    function handleExpired() {
      setDoctor(null);
      setSessionError("Сессия аяқталды. Қайта кіріңіз.");
      setChecking(false);
    }

    window.addEventListener(
      "medcare-session-expired",
      handleExpired
    );

    return () => {
      window.removeEventListener(
        "medcare-session-expired",
        handleExpired
      );
    };
  }, []);
useEffect(() => {
  let cancelled = false;

  async function checkSession() {
    let token = getDoctorToken();

    const params = new URLSearchParams(window.location.search);
    const handoffCode = params.get("handoff");

    if (handoffCode) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      if (!doctorHandoffPromise) {
        doctorHandoffPromise = (async () => {
          const response = await fetch(
            `${API}/api/doctor/handoff/redeem`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ code: handoffCode }),
            }
          );

          const data = await response.json().catch(() => ({}));

          if (!response.ok || !data.token) {
            throw new Error(
              data.error || "Не удалось подтвердить вход врача"
            );
          }

          localStorage.setItem("medcare_doctor_token", data.token);
          return data.token;
        })().finally(() => {
          doctorHandoffPromise = null;
        });
      }
    }

    try {
      if (handoffCode || doctorHandoffPromise) {
        token = await doctorHandoffPromise;
      }

      if (!token) {
        if (!cancelled) {
          setDoctor(null);
          setChecking(false);
        }
        return;
      }

      const response = await fetch(`${API}/api/doctor/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearDoctorToken();

        if (!cancelled) {
          setDoctor(null);
          setSessionError("Сессия аяқталды. Қайта кіріңіз.");
        }
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Сессияны тексеру мүмкін болмады"
        );
      }

      if (!cancelled) {
        setDoctor(data.doctor || data);
        setSessionError("");
      }
    } catch (err) {
      console.error("SESSION ERROR:", err);

      if (!cancelled) {
        setDoctor(null);
        setSessionError(
          err.message || "Сервермен байланыс жоқ."
        );
      }
    } finally {
      if (!cancelled) {
        setChecking(false);
      }
    }
  }

  checkSession();

  return () => {
    cancelled = true;
  };
}, []);
  

  function handleLogin(doctorData) {
    setDoctor(doctorData);
    setSessionError("");
    setChecking(false);
  }

  function handleLogout() {
    clearDoctorToken();
    setDoctor(null);
    setSessionError("");
  }

  if (checking) {
    return (
      <div className="loading-screen">
        MEDCARE жүктелуде...
      </div>
    );
  }

  if (!doctor) {
    return (
      <>
        {sessionError && (
          <div className="login-error" role="alert">
            {sessionError}
          </div>
        )}

        <DoctorLogin onLogin={handleLogin} />
      </>
    );
  }

  const fullName =
    doctor.fullName || doctor.full_name || "Дәрігер";

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar doctor={doctor} />

        <main className="main">
          <header className="topbar">
            <div className="workspace-label">
              <Stethoscope size={18} />
              <span>
                {fullName} · {doctor.specialty || "Дәрігер"}
              </span>
            </div>

            <div className="top-actions">
              <span className="online-dot">● Жүйеде</span>
              <Bell size={20} />

              <button
                type="button"
                className="doctor-logout-btn"
                onClick={handleLogout}
              >
                Шығу
              </button>
            </div>
          </header>

          <div className="page-content">
            <Routes>
              <Route
                path="/"
                element={<Dashboard doctor={doctor} />}
              />

              <Route
                path="/appointments"
                element={<Appointments />}
              />

              <Route
                path="/patients"
                element={<Patients />}
              />

              <Route
                path="/schedule"
                element={
                  <Placeholder
                    title="Менің кестем"
                    description="Дәрігердің жұмыс кестесін басқару."
                  />
                }
              />

              <Route
                path="/profile"
                element={
                  <Placeholder
                    title="Профиль"
                    description={`${fullName} — ${doctor.specialty || "Дәрігер"}`}
                  />
                }
              />

              <Route
                path="*"
                element={
                  <Placeholder
                    title="Бет табылмады"
                    description="Қажетті бөлімді мәзірден таңдаңыз."
                  />
                }
              />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
