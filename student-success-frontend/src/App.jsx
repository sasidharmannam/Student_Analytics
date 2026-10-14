import { useState } from "react";

import Analytics from "./components/Analytics";
import Students from "./pages/Students";
import RiskAnalysis from "./pages/RiskAnalysis";
import AIInsights from "./pages/AIInsights";

import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  BrainCircuit,
  GraduationCap,
  Settings,
  Search,
  Bell,
  Menu,
  X,
} from "lucide-react";

import "./App.css";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Students", icon: Users },
  { label: "Risk Analysis", icon: ShieldAlert },
  { label: "AI Insights", icon: BrainCircuit },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function changePage(page) {
    setActivePage(page);
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <GraduationCap size={25} />
          </div>

          <div>
            <h2>EduAnalytics</h2>
            <span>STUDENT SUCCESS AI</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <nav>
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activePage === label ? "active" : ""}`}
              onClick={() => changePage(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => alert("Settings coming soon")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <div className="profile">
            <div className="avatar">TL</div>
            <div>
              <strong>Team Leader</strong>
              <span>Administrator</span>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />
              <input
                placeholder="Search students..."
                aria-label="Search students"
              />
              <kbd>⌘ K</kbd>
            </label>

            <button className="icon-button" aria-label="Notifications">
              <Bell size={19} />
              <span className="notification-dot" />
            </button>

            <div className="top-avatar">TL</div>
          </div>
        </header>

        <section className="dashboard">
          {activePage === "Students" ? (
            <Students />
          ) : activePage === "Risk Analysis" ? (
            <RiskAnalysis />
          ) : activePage === "AI Insights" ? (
            <AIInsights />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">STUDENT PERFORMANCE CENTER</p>
                  <h1>{activePage}</h1>
                  <p className="page-description">
                    Monitor academic performance and help every student succeed.
                  </p>
                </div>

                <span className="system-status">
                  <span className="status-dot" />
                  Platform UI ready
                </span>
              </div>

              <div className="welcome-panel">
                <div className="welcome-content">
                  <span className="welcome-tag">AI-POWERED ANALYTICS</span>

                  <h2>Student Success Platform</h2>

                  <p>
                    Turn academic data into actionable insights. Identify
                    students who need support and make informed decisions.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() => changePage("Risk Analysis")}
                  >
                    <ShieldAlert size={17} />
                    Explore Risk Analysis
                  </button>

                  {activePage !== "Dashboard" && (
                    <p className="page-placeholder">
                      The {activePage} module will be added in the next
                      development step.
                    </p>
                  )}
                </div>

                <div className="welcome-art">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />

                  <div className="hero-icon">
                    <BrainCircuit size={57} strokeWidth={1.4} />
                  </div>

                  <div className="floating-chip chip-one">AI Insights</div>

                  <div className="floating-chip chip-two">Student Success</div>
                </div>
              </div>

              {activePage === "Dashboard" && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Performance Overview</h2>
                      <p>Your student analytics at a glance.</p>
                    </div>

                    <span className="demo-label">LIVE DATA</span>
                  </div>

                  <Analytics />
                </>
              )}
            </>
          )}

          <footer>
            <span>EduAnalytics · Student Success Platform</span>
            <span>
              {activePage === "Students"
                ? "Student directory"
                : `${activePage} page`}
            </span>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default App;
