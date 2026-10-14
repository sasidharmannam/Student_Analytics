# Student Success AI Insights Module — Member 4

## Project Overview

This module generates explainable student risk insights and recommendations for the Student Success Analytics Platform.

It uses student attendance, academic marks, LMS engagement, and a risk score to identify potential concerns and suggest appropriate support actions.

## Features

- Student risk classification: High, Medium, Low, or Unknown.
- Identification of potential academic and engagement concerns.
- Actionable student support recommendations.
- REST API built with FastAPI.
- Interactive API documentation using Swagger UI.
- Automated tests using pytest.
- Handling of unknown student IDs.

## Project Structure

```text
member4-ai-insights/
├── main.py
├── insights.py
├── schemas.py
├── sample_data.py
├── requirements.txt
├── README.md
├── .gitignore
└── tests/
    └── test_insights.py
```

## Requirements

- Python 3.11 or compatible version
- pip
- Visual Studio Code (recommended)

## Installation

Create and activate a virtual environment.

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

## Run the API

Start the development server:

```powershell
python -m uvicorn main:app --reload --port 8001
```

Open Swagger UI:

http://127.0.0.1:8001/docs

Health endpoint:

http://127.0.0.1:8001/health

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check API status |
| GET | `/students` | Retrieve sample students |
| GET | `/students/{student_id}/insights` | Generate insights for a sample student |
| POST | `/insights` | Generate insights from a submitted student profile |

## Example Student Input

```json
{
  "student_id": "STU004",
  "attendance_percentage": 52,
  "average_marks": 35,
  "lms_engagement": 20,
  "risk_score": 85
}
```

## Run Tests

```powershell
python -m pytest tests/test_insights.py -v
```

The current automated test suite checks high-risk students, low-risk students, and missing metrics.

## Current Limitations

- Sample student profiles are fictional and used for development testing.
- Risk thresholds are provisional and must be aligned with the team's scoring logic.
- This module uses explainable, rule-based logic; it is not a trained machine-learning model.
- Integration with the team's actual dataset, backend, and frontend remains to be completed.

## Team Integration

Before final integration, align the student input fields with the team's dataset and scoring output. Integrate the insights function with the existing backend rather than maintaining a duplicate production API.

## Member Responsibility

**Member 4:** AI insights, risk explanations, student support recommendations, API testing, and integration support.