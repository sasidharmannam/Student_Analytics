
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "student_success_datasets_1500"
OUTPUT_DIR = BASE_DIR / "output"

FILES = [
    "academic.csv",
    "attendance.csv",
    "lms_and_placement.csv",
]


def load_and_check(filename):
    path = DATA_DIR / filename

    if not path.exists():
        raise FileNotFoundError(f"Missing file: {path}")

    df = pd.read_csv(path)

    if "student_id" not in df.columns:
        raise ValueError(
            f"{filename} does not contain student_id"
        )

    if df["student_id"].isna().any():
        raise ValueError(
            f"{filename} has missing student IDs"
        )

    if df["student_id"].duplicated().any():
        raise ValueError(
            f"{filename} has duplicate student IDs"
        )

    # Normalize ID formatting before merging.
    df["student_id"] = df["student_id"].astype(str).str.strip()

    if df["student_id"].eq("").any():
        raise ValueError(
            f"{filename} has blank student IDs"
        )

    return df


def merge_datasets():
    academic = load_and_check("academic.csv")
    attendance = load_and_check("attendance.csv")
    lms_placement = load_and_check("lms_and_placement.csv")

    # Verify that the student IDs match across the files.
    id_sets = [
        set(df["student_id"])
        for df in [academic, attendance, lms_placement]
    ]

    if not (id_sets[0] == id_sets[1] == id_sets[2]):
        print("WARNING: The datasets contain different student IDs.")

    merged = academic.merge(
        attendance,
        on="student_id",
        how="outer",
        validate="one_to_one",
        suffixes=("", "_attendance"),
        indicator="_attendance_source",
    )

    merged = merged.drop(columns="_attendance_source")

    merged = merged.merge(
        lms_placement,
        on="student_id",
        how="outer",
        validate="one_to_one",
        suffixes=("", "_lms"),
        indicator="_lms_source",
    )

    print("\nMerged dataset")
    print("Rows:", len(merged))
    print("Columns:", len(merged.columns))
    print("Unique student IDs:", merged["student_id"].nunique())
    print("Missing cells:", merged.isna().sum().sum())

    OUTPUT_DIR.mkdir(exist_ok=True)

    output_file = OUTPUT_DIR / "merged_students.csv"
    merged.to_csv(output_file, index=False)

    print("Saved to:", output_file)

    return merged


if __name__ == "__main__":
    try:
        merged_df = merge_datasets()
        print("\nDataset integration completed successfully.")
    except (ValueError, FileNotFoundError) as error:
        print("\nIntegration failed:", error)
