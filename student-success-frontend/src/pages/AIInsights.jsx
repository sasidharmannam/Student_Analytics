import { useEffect, useState } from "react";
import api from "../api";

// Map the backend analytics score band to a dashboard risk label.
function getRisk(student) {
  const band = (student.score_band || "").toLowerCase().trim();

  if (
    band.includes("support recommended") ||
    band.includes("high risk")
  ) {
    return "High Risk";
  }

  if (band === "monitor" || band.includes("medium risk")) {
    return "Medium Risk";
  }

  if (band === "on track" || band.includes("low risk")) {
    return "Low Risk";
  }

  // Use thresholds only when no recognized score band is available.
  const attendance = Number(student.overall_attendance_pct);
  const cgpa = Number(student.cgpa);
  const backlogs = Number(student.backlog_count);

  if (
    (student.overall_attendance_pct != null &&
      Number.isFinite(attendance) &&
      attendance < 60) ||
    (student.cgpa != null &&
      Number.isFinite(cgpa) &&
      cgpa < 5) ||
    (student.backlog_count != null &&
      Number.isFinite(backlogs) &&
      backlogs >= 3)
  ) {
    return "High Risk";
  }

  if (
    (student.overall_attendance_pct != null &&
      Number.isFinite(attendance) &&
      attendance < 75) ||
    (student.cgpa != null &&
      Number.isFinite(cgpa) &&
      cgpa < 6.5) ||
    (student.backlog_count != null &&
      Number.isFinite(backlogs) &&
      backlogs >= 1)
  ) {
    return "Medium Risk";
  }

  return "Low Risk";
}

// Explain the existing analytics output without inventing a specific trigger.
function getRiskExplanation(student) {
  const explanation = student.risk_explanation?.trim();

  if (
    explanation &&
    explanation !== "No configured risk rule triggered"
  ) {
    return explanation;
  }

  const band = (student.score_band || "").toLowerCase().trim();

  if (band.includes("support recommended")) {
    return "Analytics classified this student as Support Recommended.";
  }

  if (band === "monitor") {
    return "Analytics classified this student as Monitor; no specific risk trigger was recorded.";
  }

  if (band === "on track") {
    return "Analytics classified this student as On Track; no specific risk trigger was recorded.";
  }

  const reasons = [];

  if (
    student.overall_attendance_pct != null &&
    Number(student.overall_attendance_pct) < 75
  ) {
    reasons.push("Attendance below 75%");
  }

  if (student.cgpa != null && Number(student.cgpa) < 6.5) {
    reasons.push("CGPA below 6.5");
  }

  if (
    student.backlog_count != null &&
    Number(student.backlog_count) > 0
  ) {
    reasons.push("One or more backlogs");
  }

  if (student.placement_support_flag === true) {
    reasons.push("Placement preparation support indicated");
  }

  if (student.declining_marks_flag === true) {
    reasons.push("Declining marks indicator");
  }

  return reasons.length
    ? reasons.join("; ")
    : "No detailed risk explanation is available.";
}


function getRecommendation(student) {
  const actions = [];

  const attendance = Number(student.overall_attendance_pct);
  const cgpa = Number(student.cgpa);
  const backlogs = Number(student.backlog_count);

  if (
    student.overall_attendance_pct != null &&
    Number.isFinite(attendance) &&
    attendance < 75
  ) {
    actions.push("Schedule an attendance check-in");
  }

  if (
    (student.cgpa != null &&
      Number.isFinite(cgpa) &&
      cgpa < 6.5) ||
    (student.backlog_count != null &&
      Number.isFinite(backlogs) &&
      backlogs > 0)
  ) {
    actions.push("Arrange academic mentoring");
  }

  if (student.placement_support_flag === true) {
    actions.push("Provide aptitude and coding practice");
  }

  if (student.declining_marks_flag === true) {
    actions.push("Review recent assessment performance");
  }

  // Prefer an intervention based on the student's actual indicators.
  if (actions.length > 0) {
    return actions.join("; ");
  }

  // Use the backend recommendation when no indicator requires intervention.
  const backendAction = student.recommended_action?.trim();

  if (backendAction) {
    return backendAction;
  }

  return "Continue monitoring and regular mentoring";

}
function average(values, digits = 1) {
  const valid = values
    .map(Number)
    .filter(Number.isFinite);

  if (!valid.length) return "—";

  return (
    valid.reduce((sum, value) => sum + value, 0) / valid.length
  ).toFixed(digits);
}

const cardStyle = {
  padding: 20,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  minWidth: 0,
  boxSizing: "border-box",
};

export default function AIInsights() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      try {
        setLoading(true);
        setError("");

        const statsResponse = await api.get("/stats");
        const total = Number(statsResponse.data?.total_students) || 0;

        if (total === 0) {
          if (!cancelled) setStudents([]);
          return;
        }

        const offsets = Array.from(
          { length: Math.ceil(total / 500) },
          (_, index) => index * 500
        );

        const responses = await Promise.all(
          offsets.map((offset) =>
            api.get("/students", {
              params: { limit: 500, offset },
            })
          )
        );

        const records = responses.flatMap((response) => {
          if (Array.isArray(response.data)) {
            return response.data;
          }

          if (Array.isArray(response.data?.students)) {
            return response.data.students;
          }

          return [];
        });

        if (!cancelled) {
          setStudents(records);
        }
      } catch (err) {
        console.error("AI Insights loading error:", err);

        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
              "Unable to load insights. Check that the backend is running and the API endpoints are available."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, []);

  const classified = students.map((student) => ({
    ...student,
    risk: getRisk(student),
    reasons: getRiskExplanation(student),
    recommendation: getRecommendation(student),
  }));

  const high = classified.filter(
    (student) => student.risk === "High Risk"
  );

  const medium = classified.filter(
    (student) => student.risk === "Medium Risk"
  );

  const low = classified.filter(
    (student) => student.risk === "Low Risk"
  );

  const avgCgpa = average(
    students
      .filter((student) => student.cgpa != null)
      .map((student) => student.cgpa),
    2
  );

  const avgAttendance = average(
    students
      .filter((student) => student.overall_attendance_pct != null)
      .map((student) => student.overall_attendance_pct),
    1
  );

  const avgScore = average(
    students
      .filter(
        (student) =>
          student.success_score != null &&
          Number.isFinite(Number(student.success_score))
      )
      .map((student) => student.success_score),
    2
  );

  const segments = classified.reduce((result, student) => {
    const segment = student.student_segment || "Unclassified";
    result[segment] = (result[segment] || 0) + 1;
    return result;
  }, {});

  const attendanceConcern = classified.filter(
    (student) =>
      student.overall_attendance_pct != null &&
      Number(student.overall_attendance_pct) < 75
  );

  const backlogConcern = classified.filter(
    (student) =>
      student.backlog_count != null &&
      Number(student.backlog_count) > 0
  );

  const decliningAttendance = classified.filter(
    (student) =>
      String(student.attendance_trend || "").toLowerCase() ===
      "declining"
  );

  const visibleStudents = classified.filter(
    (student) => filter === "All" || student.risk === filter
  );

  return (
    <section
      style={{
        padding: "clamp(16px, 3vw, 24px)",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <h1>AI Insights</h1>

      <p>
        Student performance indicators, explainable risk patterns, and
        recommended academic support based on available student records.
      </p>

      {loading && <p>Analyzing student records...</p>}

      {error && (
        <div
          role="alert"
          style={{
            padding: 16,
            marginTop: 16,
            border: "1px solid #fca5a5",
            borderRadius: 8,
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
              gap: 16,
              margin: "24px 0",
            }}
          >
            {[
              ["Students Analyzed", students.length],
              ["High Risk", high.length],
              ["Medium Risk", medium.length],
              ["Low Risk", low.length],
              ["Average Success Score", avgScore],
              ["Average CGPA", avgCgpa],
              ["Average Attendance", `${avgAttendance}%`],
            ].map(([label, value]) => (
              <div key={label} style={cardStyle}>
                <p style={{ margin: "0 0 8px", color: "#64748b" }}>
                  {label}
                </p>
                <h2 style={{ margin: 0 }}>{value}</h2>
              </div>
            ))}
          </div>

          <h2>Key Findings</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div style={cardStyle}>
              <h3>Academic Risk</h3>
              <p>
                {high.length} students are classified as high risk under
                the current risk mapping.
              </p>
              <p>
                Review individual records and prioritize students whose
                academic indicators suggest a need for support.
              </p>
            </div>

            <div style={cardStyle}>
              <h3>Attendance</h3>
              <p>
                {attendanceConcern.length} students have attendance
                below 75%.
              </p>
              <p>
                {decliningAttendance.length} students have a recorded
                declining attendance trend.
              </p>
            </div>

            <div style={cardStyle}>
              <h3>Backlogs</h3>
              <p>
                {backlogConcern.length} students have one or more
                backlogs.
              </p>
              <p>
                Subject-level mentoring and follow-up may help these
                students.
              </p>
            </div>
          </div>

          <h2>Student Segments</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {Object.entries(segments)
              .sort((a, b) => b[1] - a[1])
              .map(([segment, count]) => (
                <div key={segment} style={cardStyle}>
                  <p style={{ marginTop: 0 }}>{segment}</p>
                  <h2 style={{ marginBottom: 0 }}>{count}</h2>
                  <small>students</small>
                </div>
              ))}
          </div>

          <h2>Recommended Actions</h2>

          <ul>
            <li>
              Review attendance and follow up with students below the
              institution's attendance threshold.
            </li>
            <li>
              Arrange faculty mentoring for students with low CGPA or
              pending backlogs.
            </li>
            <li>
              Review placement readiness and provide aptitude, coding,
              or mock interview practice where indicated.
            </li>
            <li>
              Refresh analytics when new academic, attendance, or
              placement records become available.
            </li>
          </ul>

          <h2>Student-Level Insights</h2>

          <p>
            Filter the list to review student scores, risk explanations,
            and suggested interventions.
          </p>

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

          <div style={{ overflowX: "auto", marginTop: 16 }}>
            <table
              style={{
                width: "100%",
                minWidth: 850,
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Student ID",
                    "Success Score",
                    "Risk",
                    "Risk Explanation",
                    "Recommended Action",
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
                {visibleStudents.map((student, index) => (
                  <tr key={student.student_id ?? index}>
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {student.student_id ?? "—"}
                    </td>

                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {student.success_score == null ||
                      !Number.isFinite(Number(student.success_score))
                        ? "—"
                        : Number(student.success_score).toFixed(2)}
                    </td>

                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {student.risk}
                    </td>

                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {student.reasons}
                    </td>

                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {student.recommendation}
                    </td>
                  </tr>
                ))}

                {visibleStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 16 }}>
                      No students match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p
            style={{
              marginTop: 24,
              fontSize: 13,
              color: "#64748b",
            }}
          >
            <strong>Methodology:</strong> Success Scores, score bands,
            and explanations are read from the existing analytics output
            when available. Support Recommended maps to High Risk,
            Monitor maps to Medium Risk, and On Track maps to Low Risk.
            Threshold-based fallbacks apply when a recognized score
            band is unavailable. These are rule-based prototype insights,
            not proof of a trained predictive AI model. Faculty should
            review recommendations before taking action.
          </p>
        </>
      )}
    </section>
  );
}
