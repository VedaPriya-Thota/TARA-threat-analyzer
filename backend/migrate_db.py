from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        # ── Original columns ──
        try:
            conn.execute(text("ALTER TABLE analysis_results ADD COLUMN likelihood VARCHAR(50) DEFAULT 'Medium';"))
            print("Added likelihood column.")
        except Exception as e:
            print(f"Likelihood column: {e}")

        try:
            conn.execute(text("ALTER TABLE analysis_results ADD COLUMN impact VARCHAR(50) DEFAULT 'Medium';"))
            print("Added impact column.")
        except Exception as e:
            print(f"Impact column: {e}")

        try:
            conn.execute(text("ALTER TABLE analysis_results ADD COLUMN confidence INT DEFAULT 85;"))
            print("Added confidence column.")
        except Exception as e:
            print(f"Confidence column: {e}")

        # ── New enrichment columns ──
        try:
            conn.execute(text("ALTER TABLE analysis_results ADD COLUMN why_flagged TEXT;"))
            print("Added why_flagged column.")
        except Exception as e:
            print(f"why_flagged column: {e}")

        try:
            conn.execute(text("ALTER TABLE analysis_results ADD COLUMN attack_impact TEXT;"))
            print("Added attack_impact column.")
        except Exception as e:
            print(f"attack_impact column: {e}")

        try:
            conn.execute(text("ALTER TABLE analysis_results ADD COLUMN mitigation_steps TEXT;"))
            print("Added mitigation_steps column.")
        except Exception as e:
            print(f"mitigation_steps column: {e}")

        conn.commit()

if __name__ == "__main__":
    print("Starting migration...")
    migrate()
    print("Migration complete.")
