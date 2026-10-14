
from fastapi import FastAPI, HTTPException

from insights import generate_insights
from schemas import StudentData
from sample_data import SAMPLE_STUDENTS

app = FastAPI(
    title="Student Success AI Insights API",
    description="Explainable student risk insights and recommendations",
    version="1.0.0",
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Student Success AI Insights API",
    }


@app.get("/students")
def get_students():
    return [student.model_dump() for student in SAMPLE_STUDENTS]


@app.get("/students/{student_id}/insights")
def get_student_insights(student_id: str):
    student = next(
        (
            item
            for item in SAMPLE_STUDENTS
            if item.student_id == student_id
        ),
        None,
    )

    if student is None:
        raise HTTPException(
            status_code=404,
            detail=f"Student {student_id} not found",
        )

    return generate_insights(student).model_dump()


@app.post("/insights")
def create_student_insights(student: StudentData):
    return generate_insights(student).model_dump()
