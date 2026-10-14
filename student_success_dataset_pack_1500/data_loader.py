
from pathlib import Path
import pandas as pd

# CSV files are inside the student_success_datasets_1500 folder
DATA_DIR = Path(__file__).parent / "student_success_datasets_1500"

FILES = [
    "academic.csv",
    "attendance.csv",
    "lms_and_placement.csv",
]


def inspect_csv(filename):
    path = DATA_DIR / filename

    print("\n" + "=" * 50)
    print("FILE:", filename)
    print("=" * 50)

    if not path.exists():
        print("ERROR: File not found:", path)
        return

    df = pd.read_csv(path)

    print("Total rows:", len(df))
    print("Total columns:", len(df.columns))
    print("Column names:")
    print(df.columns.tolist())

    print("\nMissing values per column:")
    print(df.isnull().sum().to_string())

    if "student_id" in df.columns:
        print(
            "\nDuplicate student IDs:",
            df["student_id"].duplicated().sum()
        )
        print(
            "Missing student IDs:",
            df["student_id"].isnull().sum()
        )

    print("\nFirst 5 records:")
    print(df.head().to_string(index=False))


if __name__ == "__main__":
    try:
        import pandas
    except ImportError:
        print("Pandas is not installed.")
        print("Run: python -m pip install pandas")
        raise SystemExit(1)

    for filename in FILES:
        try:
            inspect_csv(filename)
        except Exception as error:
            print(f"Could not inspect {filename}: {error}")

    print("\nDataset inspection completed!")

