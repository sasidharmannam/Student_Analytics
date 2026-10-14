import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "./students.css";

function getRecords(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.students)) return data.students;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function getAttendance(student) {
  return (
    student?.overall_attendance_pct ??
    student?.subject_attendance_avg_pct ??
    student?.attendance_percentage ??
    student?.attendance
  );
}

function display(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? `${number}${suffix}` : `${value}${suffix}`;
}

function getRisk(student) {
  const band = String(student?.score_band ?? "").toLowerCase();
  const explanation = String(student?.risk_explanation ?? "").toLowerCase();
  if (
    band.includes("support recommended") ||
    explanation.includes("critical") ||
    explanation.includes("high risk")
  ) {
    return "High Risk";
  }

  const attendance = Number(getAttendance(student));
  const cgpa = Number(student?.cgpa);
  const backlogs = Number(student?.backlog_count ?? student?.backlogs);

  if (
    (getAttendance(student) != null && Number.isFinite(attendance) && attendance < 60) ||
    (student?.cgpa != null && Number.isFinite(cgpa) && cgpa < 5) ||
    (Number.isFinite(backlogs) && backlogs >= 3)
  ) {
    return "High Risk";
  }

  if (
    band.includes("monitor") ||
    (getAttendance(student) != null && Number.isFinite(attendance) && attendance < 75) ||
    (student?.cgpa != null && Number.isFinite(cgpa) && cgpa < 6.5) ||
    (Number.isFinite(backlogs) && backlogs >= 1)
  ) {
    return "Medium Risk";
  }

  return "Low Risk";
}

function DetailItem({ label, value }) {
  return (
    <div className="student-detail-item">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}

function StudentDetailsModal({ student, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const attendance = getAttendance(student);
  const fields = [
    ["Student ID", student.student_id ?? student.id],
    ["Department", student.department],
    ["Year", display(student.year)],
    ["Semester", display(student.semester)],
    ["Section", student.section],
    ["CGPA", display(student.cgpa)],
    ["Attendance", display(attendance, "%")],
    ["Internal marks", display(student.internal_marks_pct ?? student.internal_marks, "%")],
    ["Recent assessment", display(student.recent_assessment_marks_pct ?? student.recent_assessment, "%")],
    ["Backlogs", display(student.backlog_count ?? student.backlogs)],
    ["Learning activity", display(student.learning_activity_score_100 ?? student.learning_activity_score, " / 100")],
    ["Aptitude score", display(student.aptitude_score_100 ?? student.aptitude_score)],
    ["Coding score", display(student.coding_score_100 ?? student.coding_score)],
    ["Mock interview score", display(student.mock_interview_score_100 ?? student.mock_interview_score)],
    ["Student segment", student.student_segment],
    ["Risk category", getRisk(student)],
  ];

  return (
    <div
      className="student-detail-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="student-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-detail-title"
      >
        <div className="student-detail-heading">
          <div>
            <p className="students-eyebrow">STUDENT PROFILE</p>
            <h2 id="student-detail-title">
              {student.student_id ?? student.id ?? "Student details"}
            </h2>
          </div>
          <button type="button" className="students-reset" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="student-detail-score">
          <span>Student Success Score</span>
          <strong>{display(student.success_score, " / 100")}</strong>
          <span>{student.score_band ?? getRisk(student)}</span>
        </div>

        <h3>Student information</h3>
        <div className="student-detail-grid">
          {fields.map(([label, value]) => (
            <DetailItem key={label} label={label} value={value} />
          ))}
        </div>

        <h3>Risk explanation</h3>
        <p className="student-detail-copy">
          {student.risk_explanation ||
            "No calculated risk explanation was returned for this student."}
        </p>

        <h3>Recommended intervention</h3>
        <p className="student-detail-copy">
          {student.recommended_action ||
            "Review this student's academic, attendance, and placement indicators with the relevant faculty member to agree on a support plan."}
        </p>

        <div className="student-detail-actions">
          <button type="button" className="students-refresh" onClick={onClose}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [semester, setSemester] = useState("All");
  const [risk, setRisk] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const pageSize = 20;

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      setLoading(true);
      setError("");
      try {
        const statsResponse = await api.get("/stats");
        const total = Math.max(0, Number(statsResponse.data?.total_students) || 0);
        let records = [];

        if (total > 0) {
          const offsets = Array.from(
            { length: Math.ceil(total / 500) },
            (_, index) => index * 500
          );
          const responses = await Promise.all(
            offsets.map((offset) =>
              api.get("/students", { params: { limit: 500, offset } })
            )
          );
          records = responses.flatMap((response) => getRecords(response.data));
        } else {
          // Still try one request in case /stats uses a different total field.
          const response = await api.get("/students", {
            params: { limit: 500, offset: 0 },
          });
          records = getRecords(response.data);
        }

        if (!cancelled) setStudents(records);
      } catch (err) {
        console.error("Unable to load students:", err);
        if (!cancelled) {
          setError(
            "Could not load student records. Check that the backend is running and that /students returns a list."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStudents();
    return () => {
      cancelled = true;
    };
  }, []);

  const departments = useMemo(
    () =>
      [...new Set(students.map((student) => student.department).filter(Boolean))].sort(),
    [students]
  );

  const semesters = useMemo(
    () =>
      [
        ...new Set(
          students
            .map((student) => student.semester)
            .filter((value) => value !== null && value !== undefined && value !== "")
        ),
      ].sort((a, b) => Number(a) - Number(b)),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        !query ||
        String(student.student_id ?? student.id ?? "").toLowerCase().includes(query) ||
        String(student.department ?? "").toLowerCase().includes(query) ||
        String(student.section ?? "").toLowerCase().includes(query);

      const matchesDepartment =
        department === "All" || student.department === department;
      const matchesSemester =
        semester === "All" || String(student.semester) === semester;
      const matchesRisk = risk === "All" || getRisk(student) === risk;

      return matchesSearch && matchesDepartment && matchesSemester && matchesRisk;
    });
  }, [students, search, department, semester, risk]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function resetFilters() {
    setSearch("");
    setDepartment("All");
    setSemester("All");
    setRisk("All");
    setPage(1);
  }

  function refreshStudents() {
    window.location.reload();
  }

  return (
    <section className="students-page">
      <div className="students-heading">
        <div>
          <p className="students-eyebrow">STUDENT DIRECTORY</p>
          <h1>Students</h1>
          <p className="students-description">
            Search student records and review academic performance, attendance,
            success scores, and risk categories.
          </p>
        </div>
        <button className="students-refresh" onClick={refreshStudents} type="button">
          Refresh data
        </button>
      </div>

      <div className="students-summary">
        <div className="students-summary-card">
          <span>Total records loaded</span>
          <strong>{loading ? "…" : students.length.toLocaleString()}</strong>
        </div>
        <div className="students-summary-card">
          <span>Matching students</span>
          <strong>{loading ? "…" : filteredStudents.length.toLocaleString()}</strong>
        </div>
        <div className="students-summary-card">
          <span>High risk in results</span>
          <strong>
            {loading
              ? "…"
              : filteredStudents.filter((student) => getRisk(student) === "High Risk").length.toLocaleString()}
          </strong>
        </div>
      </div>

      <div className="students-filters">
        <input
          type="search"
          aria-label="Search students"
          placeholder="Search student ID, department, section..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter by department"
          value={department}
          onChange={(event) => {
            setDepartment(event.target.value);
            setPage(1);
          }}
        >
          <option value="All">All departments</option>
          {departments.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select
          aria-label="Filter by semester"
          value={semester}
          onChange={(event) => {
            setSemester(event.target.value);
            setPage(1);
          }}
        >
          <option value="All">All semesters</option>
          {semesters.map((item) => (
            <option key={item} value={String(item)}>Semester {item}</option>
          ))}
        </select>
        <select
          aria-label="Filter by risk"
          value={risk}
          onChange={(event) => {
            setRisk(event.target.value);
            setPage(1);
          }}
        >
          <option value="All">All risk levels</option>
          <option value="Low Risk">Low risk</option>
          <option value="Medium Risk">Medium risk</option>
          <option value="High Risk">High risk</option>
        </select>
        <button className="students-reset" onClick={resetFilters} type="button">
          Clear filters
        </button>
      </div>

      {loading && (
        <div className="students-message">Loading student records from the backend…</div>
      )}

      {!loading && error && (
        <div className="students-message students-error">
          <p>{error}</p>
          <button type="button" onClick={refreshStudents}>Try again</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="students-table-wrapper">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Department</th>
                  <th>Year</th>
                  <th>Semester</th>
                  <th>CGPA</th>
                  <th>Attendance</th>
                  <th>Success score</th>
                  <th>Risk level</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student, index) => {
                  const riskLevel = getRisk(student);
                  return (
                    <tr key={student.student_id ?? student.id ?? `${student.department}-${student.semester}-${index}`}>
                      <td className="student-id">{student.student_id ?? student.id ?? "—"}</td>
                      <td>{student.department ?? "—"}</td>
                      <td>{display(student.year)}</td>
                      <td>{display(student.semester)}</td>
                      <td>{display(student.cgpa)}</td>
                      <td>{display(getAttendance(student), "%")}</td>
                      <td>{display(student.success_score)}</td>
                      <td>
                        <span className={`student-risk ${riskLevel.toLowerCase().replace(" ", "-")}`}>
                          {riskLevel}
                        </span>
                      </td>
                      <td>
                        <button
                          className="students-refresh"
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          aria-label={`View details for ${student.student_id ?? student.id ?? "student"}`}
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {visibleStudents.length === 0 && (
                  <tr>
                    <td colSpan={9} className="students-empty">
                      No students match your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="students-pagination">
            <span>
              Showing {filteredStudents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              –{Math.min(currentPage * pageSize, filteredStudents.length)} of{" "}
              {filteredStudents.length.toLocaleString()} students
            </span>
            <div className="students-page-buttons">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <p className="students-note">
        Risk levels are screening categories based on available project indicators
        and analytics fields; they are not validated predictive assessments.
      </p>

      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </section>
  );
}
