
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).parent
FILE = BASE_DIR / "output" / "merged_students.csv"

df = pd.read_csv(FILE)

print("Total students:", len(df))
print("Total columns:", len(df.columns))

print("\nCOLUMN NAMES:")
for column in df.columns:
    print(column)

print("\nMISSING VALUES BY COLUMN:")
missing = df.isna().sum()
missing = missing[missing > 0].sort_values(ascending=False)

if missing.empty:
    print("No missing values.")
else:
    print(missing.to_string())

print("\nDUPLICATE STUDENT IDs:",
      df["student_id"].duplicated().sum())

print("\nFIRST 5 STUDENT RECORDS:")
print(df.head().to_string(index=False))

print("\nInspection completed.")
