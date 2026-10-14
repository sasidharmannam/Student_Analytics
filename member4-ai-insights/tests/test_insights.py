from insights import generate_insights
from schemas import StudentData


def test_high_risk_student():
    student = StudentData(
        student_id="STU001",
        attendance_percentage=55,
        average_marks=42,
        lms_engagement=20,
        risk_score=82,
    )

    result = generate_insights(student)

    assert result.risk_level == "High"
    assert len(result.key_factors) > 0
    assert len(result.recommendations) > 0


def test_medium_risk_student():
    student = StudentData(
        student_id="STU002",
        attendance_percentage=70,
        average_marks=55,
        lms_engagement=45,
        risk_score=55,
    )

    result = generate_insights(student)

    assert result.risk_level == "Medium"
    assert result.student_id == "STU002"
    assert len(result.recommendations) > 0


def test_low_risk_student():
    student = StudentData(
        student_id="STU003",
        attendance_percentage=95,
        average_marks=88,
        lms_engagement=90,
        risk_score=12,
    )

    result = generate_insights(student)

    assert result.risk_level == "Low"
    assert len(result.recommendations) > 0


def test_missing_metrics():
    student = StudentData(student_id="STU004")

    result = generate_insights(student)

    assert result.risk_level == "Unknown"
    assert result.student_id == "STU004"
    assert len(result.recommendations) > 0


def test_risk_score_boundary_70():
    student = StudentData(student_id="STU005", risk_score=70)

    result = generate_insights(student)

    assert result.risk_level == "High"


def test_risk_score_boundary_40():
    student = StudentData(student_id="STU006", risk_score=40)

    result = generate_insights(student)

    assert result.risk_level == "Medium"


def test_risk_score_below_40():
    student = StudentData(student_id="STU007", risk_score=39.9)

    result = generate_insights(student)

    assert result.risk_level == "Low"


def test_student_id_is_preserved():
    student = StudentData(
        student_id="STU008",
        attendance_percentage=50,
        average_marks=35,
        lms_engagement=20,
        risk_score=85,
    )

    result = generate_insights(student)

    assert result.student_id == "STU008"

def test_partially_missing_metrics():
    student = StudentData(
        student_id="STU009",
        attendance_percentage=55,
        average_marks=None,
        lms_engagement=30,
        risk_score=80,
    )

    result = generate_insights(student)

    assert result.student_id == "STU009"
    assert result.risk_level == "High"
    assert len(result.key_factors) > 0
    assert len(result.recommendations) > 0

def test_recommendations_match_student_problems():
    student = StudentData(
        student_id="STU010",
        attendance_percentage=40,
        average_marks=30,
        lms_engagement=20,
        risk_score=90,
    )

    result = generate_insights(student)

    recommendations_text = " ".join(result.recommendations).lower()

    assert any(
        word in recommendations_text
        for word in ["attendance", "attend"]
    )
    assert any(
        word in recommendations_text
        for word in ["tutor", "academic", "study"]
    )
