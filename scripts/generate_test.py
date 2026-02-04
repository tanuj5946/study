import json
import random

# ---------- FILE PATHS ----------
QUESTIONS_FILE = "data/modules/operating_systems/deadlocks/questions/questions.json"
TEST_CONFIG_FILE = "data/assessments/deadlocks/test_config.json"

# ---------- LOAD QUESTIONS ----------
with open(QUESTIONS_FILE, "r") as f:
    questions = json.load(f)

# ---------- LOAD TEST CONFIG ----------
with open(TEST_CONFIG_FILE, "r") as f:
    config = json.load(f)

total_questions = config["total_questions"]

# ---------- RANDOMLY SELECT QUESTIONS ----------
if total_questions > len(questions):
    raise ValueError("Not enough questions in question bank")

selected_questions = random.sample(questions, total_questions)

# ---------- DISPLAY TEST ----------
print("\n===== GENERATED TEST =====\n")

for i, q in enumerate(selected_questions, start=1):
    print(f"Q{i}. {q['question']}")
    print(f"Difficulty: {q['difficulty']}")
    print()

print("Time Limit:", config["time_limit_minutes"], "minutes")
print("\n==========================")
