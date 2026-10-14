 import { useEffect, useState } from "react";
import api from "../api";

function getRisk(student) {
  // Prefer the risk category supplied by the backend analytics.
  const band = String(student.score_band ?? "").toLowerCase();

  if (band.includes("high") || band.includes("support recommended")) {
    return "High Risk";
  }

  if (band.includes("medium") || band === "monitor") {
    return "Medium Risk";
  }

  if (band.includes("low") || band === "on track") {
    return "Low Risk";
  }

  // Fallback only if analytics data is unavailable.
  const attendance = Number(student.overall_attendance_pct);
  const cgpa = Number(student.cgpa);
  const backlogs = Number(student.backlog_count);

  if (
    (student.overall_attendance_pct != null && attendance < 60) ||
    (student.cgpa != null && cgpa < 5) ||
    (student.backlog_count != null && backlogs >= 3)
  ) {
    return "High Risk";
  }

  if (
    (student.overall_attendance_pct != null && attendance < 75) ||
    (student.cgpa != null && cgpa < 6.5) ||
    (student.backlog_count != null && backlogs >= 1)
  ) {
    return "Medium Risk";
  }

  return "Low Risk";
}

function getExplanation(student) {
  const explanation = student.risk_explanation;

  if (
    explanation &&
    explanation !== "No configured risk rule triggered"
  ) {
    return explanation;
  }

  const reasons = [];

  if (student.overall_attendance_pct != null) {
    if (Number(student.overall_attendance_pct) < 75) {
      reasons.push("Attendance below 75%");
    }
  }

  if (student.cgpa != null && Number(student.cgpa) < 6.5) {
    reasons.push("CGPA below 6.5");
  }

  if (student.backlog_count != null && Number(student.backlog_count) > 0) {
    reasons.push("Pending backlogs");
  }

  if (
    student.attendance_trend === "Declining" ||
    student.declining_marks_flag === true
  ) {
    reasons.push(
      student.attendance_trend === "Declining"
        ? "Attendance trend is declining"
        : "Marks are declining"
    );
  }

  return reasons.length
    ? reasons.join("; ")
    : "No configured risk rule triggered";
}

function getScore(student) {
  const score = Number(student.success_score);

  return student.success_score != null && Number.isFinite(score)
    ? score.toFixed(2)
    : "—";
}

function getRiskStyle(risk) {
  if (risk === "High Risk") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  if (risk === "Medium Risk") {
    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  return {
    background: "#dcfce7",
    color: "#166534",
  };
}

export default function RiskAnalysis() {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const stats = await api.get("/stats");
        const total = Number(stats.data?.total_students) || 0;

        const offsets = Array.from(
          { length: Math.ceil(total / 500) },
          (_, i) => i * 500
        );

        const responses = await Promise.all(
          offsets.map((offset) =>
            api.get("/students", {
              params: { limit: 500, offset },
            })
          )
        );

        const records = responses.flatMap((response) =>
          Array.isArray(response.data)
            ? response.data
            : response.data?.students || []
        );

        setStudents(records);
      } catch {
        setError(
          "Cannot load students. Check that the backend is running."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const classified = students.map((student) => ({
    ...student,
    risk: getRisk(student),
    explanation: getExplanation(student),
  }));

  const visible = classified.filter(
    (student) => filter === "All" || student.risk === filter
  );

  async function openDetails(student) {
    try {
      const response = await api.get(
        `/students/${encodeURIComponent(student.student_id)}`
      );
      setSelectedStudent(response.data);
    } catch {
      // Keep the already-loaded student record available.
      setSelectedStudent(student);
    }
  }

  return (
    <section style={{ padding: 20 }}>
      <h1>Risk Analysis</h1>
      <p>Identify students who may need academic support.</p>

      <h2>Total students: {loading ? "Loading..." : students.length}</h2>

      <label>
        Filter risk:{" "}
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="All">All</option>
          <option value="High Risk">High Risk</option>
          <option value="Medium Risk">Medium Risk</option>
          <option value="Low Risk">Low Risk</option>
        </select>
      </label>

      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <div
  style={{
    width: "100%",
    maxWidth: "100%",
    overflowX: "auto",
    marginTop: 20,
    boxSizing: "border-box",
  }}
>
          <table
            style={{
              width: "100%",
              textAlign: "left",
              borderCollapse: "collapse",
    minWidth: "900px",
    
  }}
>,
            
            <thead>
              <tr>
                {[
                  "Student ID",
                  "Department",
                  "CGPA",
                  "Attendance",
                  "Backlogs",
                  "Success Score",
                  "Risk",
                  "Risk Explanation",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: 12,
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {visible.map((student, index) => (
                <tr key={student.student_id ?? index}>
                  <td style={{ padding: 12 }}>
                    {student.student_id ?? "—"}
                  </td>
                  <td style={{ padding: 12 }}>
                    {student.department ?? "—"}
                  </td>
                  <td style={{ padding: 12 }}>
                    {student.cgpa ?? "—"}
                  </td>
                  <td style={{ padding: 12 }}>
                    {student.overall_attendance_pct == null
                      ? "—"
                      : `${student.overall_attendance_pct}%`}
                  </td>
                  <td style={{ padding: 12 }}>
                    {student.backlog_count ?? "—"}
                  </td>
                  <td style={{ padding: 12, fontWeight: 600 }}>
                    {getScore(student)}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span
                      style={{
                        ...getRiskStyle(student.risk),
                        padding: "5px 9px",
                        borderRadius: 6,
                        whiteSpace: "nowrap",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {student.risk}
                    </span>
                  </td>
                  <td style={{ padding: 12, maxWidth: 260 }}>
                    {student.explanation}
                  </td>
                  <td style={{ padding: 12 }}>
                    <button onClick={() => openDetails(student)}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))}

              {visible.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 20 }}>
                    No students found for this risk filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 20, fontSize: 13 }}>
        Risk categories use the backend score band when available.
        The fallback thresholds are prototype rules, not a trained
        predictive model. Success Score and Risk Category are different
        measures.
      </p>

      {selectedStudent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="risk-student-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            style={{
              background: "#fff",
              color: "#111827",
              padding: 24,
              borderRadius: 12,
              width: "100%",
              maxWidth: 600,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              style={{ float: "right" }}
              onClick={() => setSelectedStudent(null)}
            >
              Close
            </button>

            <h2 id="risk-student-title">
              Student Profile: {selectedStudent.student_id}
            </h2>

            <p>
              <strong>Success Score:</strong>{" "}
              {getScore(selectedStudent)} / 100
            </p>
            <p>
              <strong>Score Band:</strong>{" "}
              {selectedStudent.score_band ?? "Unavailable"}
            </p>
            <p>
              <strong>Department:</strong>{" "}
              {selectedStudent.department ?? "—"}
            </p>
            <p>
              <strong>CGPA:</strong> {selectedStudent.cgpa ?? "—"}
            </p>
            <p>
              <strong>Attendance:</strong>{" "}
              {selectedStudent.overall_attendance_pct == null
                ? "—"
                : `${selectedStudent.overall_attendance_pct}%`}
            </p>
            <p>
              <strong>Backlogs:</strong>{" "}
              {selectedStudent.backlog_count ?? "—"}
            </p>
            <p>
              <strong>Risk Explanation:</strong>{" "}
              {getExplanation(selectedStudent)}
            </p>
            <p>
              <strong>Recommended Intervention:</strong>{" "}
              {selectedStudent.recommended_action ??
                "No recommendation available"}
            </p>

            <button onClick={() => setSelectedStudent(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
