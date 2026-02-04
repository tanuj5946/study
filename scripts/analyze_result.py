import pandas as pd

df = pd.read_csv("data/assessments/deadlocks/results.csv")

summary = df.groupby("topic")["is_correct"].mean()

print("\nPerformance by topic:")
print(summary)
