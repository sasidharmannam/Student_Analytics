
from schemas import StudentData, StudentInsight


def generate_insights(student: StudentData) -> StudentInsight:
    """
    Generate explainable student risk insights and recommendations.
    Risk score is assumed to range from 0 to 100,
    where a higher score indicates greater risk.
    """

    factors = []
    recommendations = []

    attendance = student.attendance_percentage
    marks = student.average_marks
    engagement = student.lms_engagement
    score = student.risk_score

    # Attendance analysis
    if attendance is not None:
        if attendance < 60:
            factors.append("Very low attendance")
            recommendations.append(
                "Arrange an attendance follow-up with the student."
            )
        elif attendance < 75:
            factors.append("Attendance needs improvement")
            recommendations.append(
                "Encourage regular class attendance and monitor progress."
            )

    # Academic performance analysis
    if marks is not None:
        if marks < 40:
            factors.append("Low academic performance")
            recommendations.append(
                "Provide subject-specific tutoring and academic support."
            )
        elif marks < 60:
            factors.append("Academic performance needs improvement")
            recommendations.append(
                "Create a study plan and schedule regular assessments."
            )

    # LMS engagement analysis
    if engagement is not None:
        if engagement < 30:
            factors.append("Very low LMS engagement")
            recommendations.append(
                "Check access to learning resources and encourage LMS participation."
            )
        elif engagement < 50:
            factors.append("LMS engagement needs improvement")
            recommendations.append(
                "Encourage regular use of online learning materials."
            )

    # Overall risk classification
    if score is not None:
        if score >= 70:
            risk_level = "High"
        elif score >= 40:
            risk_level = "Medium"
        else:
            risk_level = "Low"
    else:
        risk_level = "Unknown"

    # Add a general recommendation when no specific concern is identified
    if not recommendations:
        if risk_level == "High":
            recommendations.append(
                "Review the student's available data and arrange a support assessment."
            )
        elif risk_level == "Medium":
            recommendations.append(
                "Monitor academic progress and review the student at regular intervals."
            )
        elif risk_level == "Low":
            recommendations.append(
                "Continue monitoring progress and reinforce effective study habits."
            )
        else:
            recommendations.append(
                "Collect sufficient student data before assessing risk."
            )

    if not factors:
        if risk_level == "Unknown":
            factors.append("Insufficient data to assess risk")
        else:
            factors.append(
                "No specific concern identified by the available metric rules"
            )

    return StudentInsight(
        student_id=student.student_id,
        risk_level=risk_level,
        key_factors=factors,
        recommendations=list(dict.fromkeys(recommendations)),
    )
