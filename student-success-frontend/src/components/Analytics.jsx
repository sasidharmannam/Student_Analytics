
import { useEffect, useState } from "react";
import api from "../api";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import {
  Users,
  GraduationCap,
  CalendarCheck,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

const RISK_COLORS = {
  "Low Risk": "#34d399",
  "Medium Risk": "#fbbf24",
  "High Risk": "#fb7185",
};

const tooltipStyle = {
  backgroundColor: "#111c2e",
  border: "1px solid #30405a",
  borderRadius: "8px",
  color: "#e5eaf5",
  fontSize: "12px",
};

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getStudentRecords(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.students)) return data.students;
  return [];
}

function calculateAverage(records, field) {
  const values = records
    .map((student) => toNumber(student[field]))
    .filter((value) => value !== null);

  if (!values.length) return null;

  return Number(
    (
      values.reduce((total, value) => total + value, 0) /
      values.length
    ).toFixed(2)
  );
}

// Match the risk classification used by AI Insights.
// Use backend score_band first and fallback rules only if it is missing.
function getStudentRisk(student) {
  const scoreBand = String(student.score_band ?? "")
    .trim()
    .toLowerCase();

  if (scoreBand === "support recommended") {
    return "High Risk";
  }

  if (scoreBand === "monitor") {
    return "Medium Risk";
  }

  if (scoreBand === "on track") {
    return "Low Risk";
  }

  const attendance = toNumber(student.overall_attendance_pct);
  const cgpa = toNumber(student.cgpa);
  const backlogs = toNumber(student.backlog_count);

  if (
    (attendance !== null && attendance < 60) ||
    (cgpa !== null && cgpa < 5) ||
    (backlogs !== null && backlogs >= 3)
  ) {
    return "High Risk";
  }

  if (
    (attendance !== null && attendance < 75) ||
    (cgpa !== null && cgpa < 6.5) ||
    (backlogs !== null && backlogs >= 1)
  ) {
    return "Medium Risk";
  }

  return "Low Risk";
}

const kpis = [
  { title: "Total Students", icon: Users, color: "#60a5fa" },
  { title: "Average CGPA", icon: GraduationCap, color: "#a78bfa" },
  { title: "Attendance Rate", icon: CalendarCheck, color: "#34d399" },
  { title: "At-Risk Students", icon: ShieldAlert, color: "#fb7185" },
];

function KpiCard({ item, value, note }) {
  const Icon = item.icon;

  return (
    <article className="kpi-card">
      <div className="kpi-top">
        <span>{item.title}</span>
        <span
          className="kpi-icon"
          style={{
            color: item.color,
            backgroundColor: `${item.color}18`,
          }}
        >
          <Icon size={19} />
        </span>
      </div>

      <div className="kpi-value">{value}</div>

      <div className="kpi-foot">
        <span className="kpi-indicator" style={{ color: item.color }}>
          <TrendingUp size={14} />
          {note}
        </span>
      </div>
    </article>
  );
}

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <article className={`chart-card ${className}`}>
      <div className="chart-card-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setLoading(true);
      setApiError("");

      try {
        const statsResponse = await api.get("/stats");

        if (cancelled) return;

        const backendStats = statsResponse.data;
        setStats(backendStats);

        const totalStudents = Math.max(
          0,
          Number(backendStats.total_students) || 0
        );

        const pageSize = 500;
        const offsets = Array.from(
          { length: Math.ceil(totalStudents / pageSize) },
          (_, index) => index * pageSize
        );

        const pageResponses = await Promise.all(
          offsets.map((offset) =>
            api.get("/students", {
              params: {
                limit: pageSize,
                offset,
              },
            })
          )
        );

        if (cancelled) return;

        const allStudents = pageResponses.flatMap((response) =>
          getStudentRecords(response.data)
        );

        setStudents(allStudents);

        if (allStudents.length !== totalStudents) {
          console.warn(
            `Expected ${totalStudents} students but loaded ${allStudents.length}.`
          );
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);

        if (!cancelled) {
          setApiError(
            "Unable to load live data. Check that the backend is running and the API URL is correct."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Calculate average CGPA by semester.
  const liveAcademicData = Object.values(
    students.reduce((groups, student) => {
      const semester = toNumber(student.semester);
      const cgpa = toNumber(student.cgpa);

      if (semester === null || cgpa === null) return groups;

      if (!groups[semester]) {
        groups[semester] = {
          semester: `Sem ${semester}`,
          total: 0,
          count: 0,
        };
      }

      groups[semester].total += cgpa;
      groups[semester].count += 1;

      return groups;
    }, {})
  )
    .map((group) => ({
      semester: group.semester,
      cgpa: Number((group.total / group.count).toFixed(2)),
    }))
    .sort(
      (a, b) =>
        Number(a.semester.replace("Sem ", "")) -
        Number(b.semester.replace("Sem ", ""))
    );

  const averageCgpa = calculateAverage(students, "cgpa");
  const averageAttendance = calculateAverage(
    students,
    "overall_attendance_pct"
  );

  // Risk distribution using backend score bands.
  const riskData = [
    { name: "Low Risk", value: 0, color: RISK_COLORS["Low Risk"] },
    { name: "Medium Risk", value: 0, color: RISK_COLORS["Medium Risk"] },
    { name: "High Risk", value: 0, color: RISK_COLORS["High Risk"] },
  ];

  students.forEach((student) => {
    const category = getStudentRisk(student);
    const riskItem = riskData.find((item) => item.name === category);

    if (riskItem) {
      riskItem.value += 1;
    }
  });

  const highRisk =
    riskData.find((item) => item.name === "High Risk").value;

  const mediumRisk =
    riskData.find((item) => item.name === "Medium Risk").value;

  const atRiskStudents = highRisk + mediumRisk;
  const totalStudents = stats?.total_students ?? students.length;

  const kpiValues = [
    {
      value:
        loading && !stats
          ? "Loading..."
          : Number(totalStudents).toLocaleString(),
      note: "Backend student count",
    },
    {
      value: averageCgpa === null ? "—" : `${averageCgpa.toFixed(2)} / 10`,
      note: "Average CGPA from loaded records",
    },
    {
      value:
        averageAttendance === null
          ? "—"
          : `${averageAttendance.toFixed(1)}%`,
      note: "Average student attendance",
    },
    {
      value:
        loading && students.length === 0
          ? "Loading..."
          : atRiskStudents.toLocaleString(),
      note: "Medium + high risk from backend score bands",
    },
  ];

  const liveAttendanceData =
    averageAttendance === null
      ? []
      : [
          {
            category: "All Students",
            attendance: averageAttendance,
          },
        ];

  return (
    <section className="analytics-section">
      <div style={{ marginBottom: "16px", fontSize: "13px" }}>
        {apiError ? (
          <p style={{ color: "#f87171" }}>{apiError}</p>
        ) : loading ? (
          <p style={{ color: "#94a3b8" }}>
            Connecting to backend and loading student records...
          </p>
        ) : (
          <p style={{ color: "#34d399" }}>
            <span style={{ marginRight: "6px" }}>●</span>
            Live backend connected · {students.length.toLocaleString()} records
            loaded
          </p>
        )}
      </div>

      <div className="kpi-grid">
        {kpis.map((item, index) => (
          <KpiCard
            key={item.title}
            item={item}
            value={kpiValues[index].value}
            note={kpiValues[index].note}
          />
        ))}
      </div>

      <div className="charts-grid">
        <ChartCard
          title="Academic Performance"
          subtitle="Average CGPA by semester from student records"
          className="academic-chart"
        >
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={liveAcademicData}
                margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="cgpaGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#25334a"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="semester"
                  tick={{ fill: "#8b9bb4", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[0, 10]}
                  tick={{ fill: "#8b9bb4", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip contentStyle={tooltipStyle} />

                <Area
                  type="monotone"
                  dataKey="cgpa"
                  name="Average CGPA"
                  stroke="#60a5fa"
                  strokeWidth={2.5}
                  fill="url(#cgpaGradient)"
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {!loading && liveAcademicData.length === 0 && (
            <p>No CGPA records are available to chart.</p>
          )}
        </ChartCard>

        <ChartCard
          title="Attendance Overview"
          subtitle={
            averageAttendance === null
              ? "Waiting for attendance records"
              : `Average attendance across loaded records: ${averageAttendance.toFixed(1)}%`
          }
        >
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={liveAttendanceData}
                margin={{ top: 10, right: 4, left: -22, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#25334a"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="category"
                  tick={{ fill: "#8b9bb4", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#8b9bb4", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${value}%`, "Attendance"]}
                />

                <Bar
                  dataKey="attendance"
                  name="Average Attendance"
                  fill="#34d399"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={80}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Student Risk Distribution"
          subtitle="Risk categories based on backend score bands"
          className="risk-chart"
        >
          <div className="risk-chart-layout">
            <div className="donut-area">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="86%"
                    paddingAngle={4}
                    stroke="none"
                  >
                    {riskData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>

                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              <div className="donut-center">
                <strong>{students.length.toLocaleString()}</strong>
                <span>Loaded</span>
              </div>
            </div>

            <div className="risk-legend">
              {riskData.map((item) => (
                <div className="risk-legend-item" key={item.name}>
                  <span
                    className="risk-legend-dot"
                    style={{ background: item.color }}
                  />
                  <span>{item.name}</span>
                  <strong>{item.value.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <p className="demo-disclaimer">
        Dashboard metrics are calculated from records returned by the backend.
        Risk categories use backend score bands when available; fallback rules
        apply when a score band is missing or unrecognized. These categories
        should not be interpreted as guaranteed predictions. Attendance is
        displayed as an overall average, not a month-by-month trend.
      </p>
    </section>
  );
}
