
import os
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent
CLEAN_FILE = BASE_DIR / "output" / "clean_students.csv"

# Analytics output is generated in the separate analytics project folder.
ANALYTICS_FILE = (
    BASE_DIR.parent
    / "student-success-analytics"
    / "student_analytics_output.csv"
)

app = FastAPI(
    title="EduAnalytics Student Success API",
    description="Student records, success scores, and explainable risk analysis",
    version="2.0.0",
)

frontend_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *frontend_origins,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_students():
    if not CLEAN_FILE.exists():
        raise HTTPException(
            status_code=500,
            detail="clean_students.csv not found. Run cleaning.py first.",
        )

    df = pd.read_csv(CLEAN_FILE)

    if "student_id" not in df.columns:
        raise HTTPException(
            status_code=500,
            detail="student_id column is missing.",
        )

    if ANALYTICS_FILE.exists():
        analytics = pd.read_csv(ANALYTICS_FILE)

        if "student_id" in analytics.columns:
            fields = [
                "student_id",
                "success_score",
                "score_band",
                "score_provisional",
                "student_segment",
                "risk_explanation",
                "recommended_action",
                "low_attendance_flag",
                "academic_risk_flag",
                "placement_support_flag",
                "declining_marks_flag",
            ]

            available = [
                column for column in fields
                if column in analytics.columns
            ]

            analytics = analytics[available].drop_duplicates(
                subset=["student_id"]
            )

            # Remove any stale versions before merging.
            extra_fields = [
                column for column in available
                if column != "student_id" and column in df.columns
            ]
            df = df.drop(columns=extra_fields, errors="ignore")

            df = df.merge(
                analytics,
                on="student_id",
                how="left",
                validate="many_to_one",
            )

    return df


@app.get("/")
def home():
    return {
        "message": "EduAnalytics API is running",
        "documentation": "/docs",
        "analytics_available": ANALYTICS_FILE.exists(),
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/students")
def get_students(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    df = load_students()

    return {
        "total": len(df),
        "limit": limit,
        "offset": offset,
        "students": df.iloc[offset:offset + limit]
        .astype(object)
        .where(pd.notna(df.iloc[offset:offset + limit]), None)
        .to_dict(orient="records"),
    }


@app.get("/students/{student_id}")
def get_student(student_id: str):
    df = load_students()
    result = df[df["student_id"].astype(str) == student_id]

    if result.empty:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    row = result.iloc[0]
    return {
        key: value if pd.notna(value) else None
        for key, value in row.to_dict().items()
    }


@app.get("/stats")
def get_stats():
    df = load_students()

    return {
        "total_students": len(df),
        "total_columns": len(df.columns),
        "missing_cells": int(df.isna().sum().sum()),
        "unique_students": int(df["student_id"].nunique()),
        "analytics_available": "success_score" in df.columns,
    }
