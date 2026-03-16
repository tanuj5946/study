import os
import json
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def format_subject_name(folder_name):
    return folder_name.replace("_", " ").title()


def get_or_create_subject(conn, subject_name):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM subjects WHERE name = %s", (subject_name,))
        result = cur.fetchone()

        if result:
            return result[0]

        cur.execute(
            "INSERT INTO subjects (name) VALUES (%s) RETURNING id",
            (subject_name,)
        )
        return cur.fetchone()[0]


def get_or_create_module(conn, subject_id, module_data):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id FROM modules
            WHERE subject_id = %s AND module_name = %s
        """, (subject_id, module_data.get("module_name")))

        result = cur.fetchone()

        if result:
            module_id = result[0]
            cur.execute("""
                UPDATE modules
                SET difficulty = %s,
                    estimated_hours = %s
                WHERE id = %s
            """, (
                module_data.get("difficulty"),
                module_data.get("estimated_hours"),
                module_id
            ))
            return module_id

        cur.execute("""
            INSERT INTO modules (subject_id, module_name, difficulty, estimated_hours)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (
            subject_id,
            module_data.get("module_name"),
            module_data.get("difficulty"),
            module_data.get("estimated_hours")
        ))
        return cur.fetchone()[0]


def replace_notes(conn, module_id, notes_path):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM notes WHERE module_id = %s", (module_id,))

    for filename in os.listdir(notes_path):
        if filename.endswith(".md"):
            with open(os.path.join(notes_path, filename), "r", encoding="utf-8") as f:
                content = f.read()

            title = filename.replace(".md", "").replace("_", " ").title()

            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO notes (module_id, title, content)
                    VALUES (%s, %s, %s)
                """, (module_id, title, content))


def replace_questions(conn, module_id, questions_file):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM questions WHERE module_id = %s", (module_id,))

    with open(questions_file, "r", encoding="utf-8") as f:
        questions = json.load(f)

    with conn.cursor() as cur:
        for q in questions:
            cur.execute("""
                INSERT INTO questions (
                    module_id,
                    topic,
                    difficulty,
                    question,
                    options,
                    correct_answer
                )
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                module_id,
                q.get("topic"),
                q.get("difficulty"),
                q.get("question"),
                Json(q.get("options")),
                q.get("correct")
            ))


def import_subject(subject_folder_path):
    subject_folder_name = os.path.basename(subject_folder_path)
    subject_name = format_subject_name(subject_folder_name)

    print(f"\nImporting subject: {subject_name}")

    conn = get_connection()
    conn.autocommit = False

    try:
        subject_id = get_or_create_subject(conn, subject_name)

        for module_folder in os.listdir(subject_folder_path):
            module_path = os.path.join(subject_folder_path, module_folder)

            if not os.path.isdir(module_path):
                continue

            print(f"  Processing module: {module_folder}")

            module_json_path = os.path.join(module_path, "module.json")
            notes_path = os.path.join(module_path, "notes")
            questions_path = os.path.join(module_path, "questions", "questions.json")

            with open(module_json_path, "r", encoding="utf-8") as f:
                module_data = json.load(f)

            module_id = get_or_create_module(conn, subject_id, module_data)

            replace_notes(conn, module_id, notes_path)
            replace_questions(conn, module_id, questions_path)

        conn.commit()
        print(f"Subject '{subject_name}' imported successfully.")

    except Exception as e:
        conn.rollback()
        print("Error occurred. Rolling back.")
        print(e)

    finally:
        conn.close()


if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_modules_path = os.path.join(script_dir, "..", "data", "modules")

    base_modules_path = os.path.abspath(base_modules_path)

    print(f"Scanning modules directory: {base_modules_path}")

    if not os.path.exists(base_modules_path):
        print("Modules folder not found.")
        exit(1)

    subject_folders = [
        f for f in os.listdir(base_modules_path)
        if os.path.isdir(os.path.join(base_modules_path, f))
    ]

    for subject_folder in subject_folders:
        full_subject_path = os.path.join(base_modules_path, subject_folder)
        import_subject(full_subject_path)
