from flask import Flask, render_template, request
import json
import os

app = Flask(__name__, template_folder="../web/templates",
            static_folder="../web/static")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)

MODULE_DIR = os.path.join(
    PROJECT_DIR, "data", "modules",
    "operating_systems", "deadlocks"
)

@app.route("/", methods=["GET", "POST"])
def index():
    # Load module info
    with open(os.path.join(MODULE_DIR, "module.json")) as f:
        module = json.load(f)

    # Load notes
    notes = []
    notes_dir = os.path.join(MODULE_DIR, "notes")
    for file in os.listdir(notes_dir):
        with open(os.path.join(notes_dir, file)) as f:
            notes.append(f.read())

    # Load questions
    with open(os.path.join(MODULE_DIR, "questions", "questions.json")) as f:
        questions = json.load(f)

    score = None
    weak_topic = None

    # Handle test submission
    if request.method == "POST":
        correct = 0
        topic_score = {}

        for q in questions:
            user_ans = request.form.get(q["question_id"])
            if user_ans == q["correct"]:
                correct += 1
            else:
                topic = q["topic"]
                topic_score[topic] = topic_score.get(topic, 0) + 1

        score = f"{correct}/{len(questions)}"
        weak_topic = max(topic_score, key=topic_score.get) if topic_score else "None"

    return render_template(
        "index.html",
        module=module,
        notes=notes,
        questions=questions,
        score=score,
        weak_topic=weak_topic
    )

if __name__ == "__main__":
    app.run(debug=True)
