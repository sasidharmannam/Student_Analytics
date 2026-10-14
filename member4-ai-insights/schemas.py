
from pydantic import BaseModel, Field
from typing import List, Optional


class StudentData(BaseModel):
    student_id: str
    attendance_percentage: Optional[float] = Field(
        default=None, ge=0, le=100
    )
    average_marks: Optional[float] = Field(
        default=None, ge=0, le=100
    )
    lms_engagement: Optional[float] = Field(
        default=None, ge=0, le=100
    )
    risk_score: Optional[float] = Field(
        default=None, ge=0, le=100
    )


class StudentInsight(BaseModel):
    student_id: str
    risk_level: str
    key_factors: List[str]
    recommendations: List[str]
