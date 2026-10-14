
import pandas as pd
import numpy as np

# 1. Load the cleaned student dataset
INPUT_FILE = "datasets/clean_students.csv"
OUTPUT_FILE = "student_analytics_output.csv"

df = pd.read_csv(INPUT_FILE)

print("Dataset loaded successfully!")
print("Number of students:", len(df))


# 2. Calculate component scores
df["academic_score"] = (
    0.70 * (df["cgpa"] * 10)
    + 0.30 * df["semester_marks_pct"]
)

df["attendance_score"] = df["overall_attendance_pct"]

df["lms_score"] = (
    0.60 * df["learning_activity_score_100"]
    + 0.40 * df["assignment_completion_pct"]
)

df["engagement_component"] = df["engagement_score_100"]

df["placement_score"] = (
    0.40 * df["aptitude_score_100"]
    + 0.40 * df["coding_score_100"]
    + 0.20 * df["mock_interview_score_100"]
)


# 3. Calculate the overall score.
# Missing components are excluded and remaining weights
# are rescaled. Scores are marked provisional if incomplete.

components = {
    "academic_score": 0.30,
    "attendance_score": 0.25,
    "lms_score": 0.15,
    "engagement_component": 0.10,
    "placement_score": 0.20,
}

weighted_values = pd.DataFrame({
    col: df[col] * weight
    for col, weight in components.items()
})

available_weights = pd.DataFrame({
    col: df[col].notna() * weight
    for col, weight in components.items()
}).sum(axis=1)

df["success_score"] = (
    weighted_values.sum(axis=1, min_count=1)
    / available_weights.replace(0, np.nan)
)

df["score_provisional"] = available_weights < 1.0


# 4. Assign a score band

def score_band(score):
    if pd.isna(score):
        return "Insufficient Data"
    if score >= 80:
        return "On Track"
    if score >= 60:
        return "Monitor"
    return "Support Recommended"

df["score_band"] = df["success_score"].apply(score_band)


# 5. Identify possible support needs

df["low_attendance_flag"] = (
    df["overall_attendance_pct"].lt(75).fillna(False)
)

df["academic_risk_flag"] = (
    df["semester_marks_pct"].lt(50).fillna(False)
    | df["backlog_count"].ge(2).fillna(False)
)

df["placement_support_flag"] = (
    df["placement_score"].lt(50).fillna(False)
)

df["declining_marks_flag"] = (
    (
        df["recent_assessment_marks_pct"]
        < df["previous_semester_marks_pct"] - 10
    ).fillna(False)
)


# 6. Explain why a student may need support

def explain_student(row):
    reasons = []

    if row["low_attendance_flag"]:
        reasons.append("Attendance below 75%")

    if row["academic_risk_flag"]:
        reasons.append("Low marks or multiple backlogs")

    if row["placement_support_flag"]:
        reasons.append("Low placement readiness")

    if row["declining_marks_flag"]:
        reasons.append("Recent marks have declined")

    if not reasons:
        return "No configured risk rule triggered"

    return "; ".join(reasons)

df["risk_explanation"] = df.apply(explain_student, axis=1)


# 7. Assign student segments

def segment_student(row):
    required = [
        "academic_score",
        "attendance_score",
        "placement_score",
        "success_score",
    ]

    if row[required].isna().any():
        return "Incomplete Data"

    if row["academic_score"] >= 75 and row["placement_score"] < 50:
        return "Placement Preparation"

    if (
        row["attendance_score"] < 75
        and row["academic_score"] < 60
    ):
        return "Academic and Attendance Support"

    if (
        row["academic_score"] >= 75
        and row["placement_score"] >= 70
    ):
        return "Strong Academic and Placement"

    if row["success_score"] < 60:
        return "General Support"

    return "Monitor Progress"

df["student_segment"] = df.apply(segment_student, axis=1)


# 8. Recommend actions

def recommend_action(row):
    actions = []

    if row["low_attendance_flag"]:
        actions.append("Schedule attendance check-in")

    if row["academic_risk_flag"]:
        actions.append("Arrange academic mentoring")

    if row["placement_support_flag"]:
        actions.append("Provide aptitude and coding practice")

    if row["declining_marks_flag"]:
        actions.append("Review recent assessment performance")

    if not actions:
        return "Continue monitoring and regular mentoring"

    return "; ".join(actions)

df["recommended_action"] = df.apply(recommend_action, axis=1)


# 9. Export the analytics output

df.to_csv(OUTPUT_FILE, index=False)

print("\nAnalytics completed!")
print("Output saved to:", OUTPUT_FILE)
print("\nScore band counts:")
print(df["score_band"].value_counts(dropna=False))

print("\nSample results:")
print(
    df[
        [
            "student_id",
            "success_score",
            "score_band",
            "student_segment",
            "risk_explanation",
        ]
    ].head(10).to_string(index=False)
)
