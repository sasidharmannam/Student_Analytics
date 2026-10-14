
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).parent
INPUT_FILE = BASE_DIR / "output" / "merged_students.csv"
OUTPUT_DIR = BASE_DIR / "output"

def clean_dataset():
    df = pd.read_csv(INPUT_FILE)

    print("Original rows:", len(df))

    # Remove the technical merge indicator.
    if "_lms_source" in df.columns:
        df = df.drop(columns=["_lms_source"])

    # Save a report of missing values before cleaning.
    missing_report = df.isna().sum()
    missing_report = missing_report[missing_report > 0]
    missing_report.to_csv(
        OUTPUT_DIR / "missing_values_report.csv",
        header=["missing_count"]
    )

    print("\nMissing values before cleaning:")
    print(missing_report.to_string())

    # Check the unique student key.
    if df["student_id"].isna().any():
        raise ValueError("Missing student IDs found.")

    if df["student_id"].duplicated().any():
        raise ValueError("Duplicate student IDs found.")

    # Validate numeric ranges before imputation.
    for col in df.columns:
        name = col.lower()

        if "cgpa" in name:
            values = pd.to_numeric(df[col], errors="coerce")
            invalid = values.notna() & (
                (values < 0) | (values > 10)
            )
            if invalid.any():
                raise ValueError(f"Invalid CGPA values in {col}")

        elif any(word in name for word in
                 ["pct", "score_100"]):
            values = pd.to_numeric(df[col], errors="coerce")
            invalid = values.notna() & (
                (values < 0) | (values > 100)
            )
            if invalid.any():
                raise ValueError(
                    f"Invalid percentage/score values in {col}"
                )

    # Preserve indicators showing which values were missing.
    missing_columns = df.columns[df.isna().any()].tolist()

    for col in missing_columns:
        df[f"{col}_was_missing"] = df[col].isna().astype(int)

    # Fill missing numeric values with the column median.
    # Keep a separate indicator so imputed values are identifiable.
    for col in df.select_dtypes(include="number").columns:
        if df[col].isna().any():
            median_value = df[col].median()

            if pd.isna(median_value):
                raise ValueError(
                    f"Cannot impute entirely empty column: {col}"
                )

            df[col] = df[col].fillna(median_value)

    # Fill missing categorical values with the mode.
    for col in df.select_dtypes(
        include=["object", "category"]
    ).columns:
        if df[col].isna().any():
            modes = df[col].mode()

            if modes.empty:
                raise ValueError(
                    f"Cannot impute categorical column: {col}"
                )

            df[col] = df[col].fillna(modes.iloc[0])

    # Final checks.
    if df.isna().any().any():
        raise ValueError("Missing values remain after cleaning.")

    if df["student_id"].duplicated().any():
        raise ValueError("Duplicate IDs found after cleaning.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output_file = OUTPUT_DIR / "clean_students.csv"
    df.to_csv(output_file, index=False)

    print("\nCleaning completed successfully.")
    print("Final rows:", len(df))
    print("Final columns:", len(df.columns))
    print("Remaining missing cells:", int(df.isna().sum().sum()))
    print("Unique students:", df["student_id"].nunique())
    print("Saved to:", output_file)


if __name__ == "__main__":
    clean_dataset()
