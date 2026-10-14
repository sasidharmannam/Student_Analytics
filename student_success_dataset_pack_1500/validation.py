
from pathlib import Path
import pandas as pd

DATA_DIR = Path(__file__).parent / "student_success_datasets_1500"

FILES = [
    "academic.csv",
    "attendance.csv",
    "lms_and_placement.csv",
]

for filename in FILES:
    path = DATA_DIR / filename

    print("\n" + "=" * 45)
    print("Checking:", filename)

    if not path.exists():
        print("ERROR: File not found:", path)
        continue

    df = pd.read_csv(path)

    print("Rows:", len(df))
    print("Columns:", len(df.columns))
    print("Duplicate complete rows:", df.duplicated().sum())
    print("Missing values:", df.isna().sum().sum())

    if "student_id" in df.columns:
        print("Unique student IDs:", df["student_id"].nunique())
        print("Missing IDs:", df["student_id"].isna().sum())
        print(
            "Duplicate IDs:",
            df["student_id"].dropna().duplicated().sum()
        )
    else:
        print("WARNING: student_id column not found")

print("\nValidation completed.")
