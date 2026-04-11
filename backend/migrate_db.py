from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        # ── v1 columns ──
        for col, sql in [
            ("likelihood",   "ALTER TABLE analysis_results ADD COLUMN likelihood VARCHAR(50) DEFAULT 'Medium';"),
            ("impact",       "ALTER TABLE analysis_results ADD COLUMN impact VARCHAR(50) DEFAULT 'Medium';"),
            ("confidence",   "ALTER TABLE analysis_results ADD COLUMN confidence INT DEFAULT 85;"),
        ]:
            try:
                conn.execute(text(sql))
                print(f"Added {col} column.")
            except Exception as e:
                print(f"{col} column: {e}")

        # ── v2 columns ──
        for col, sql in [
            ("why_flagged",      "ALTER TABLE analysis_results ADD COLUMN why_flagged TEXT;"),
            ("attack_impact",    "ALTER TABLE analysis_results ADD COLUMN attack_impact TEXT;"),
            ("mitigation_steps", "ALTER TABLE analysis_results ADD COLUMN mitigation_steps TEXT;"),
        ]:
            try:
                conn.execute(text(sql))
                print(f"Added {col} column.")
            except Exception as e:
                print(f"{col} column: {e}")

        # ── v3 columns (file upload) ──
        for col, sql in [
            ("evidence",             "ALTER TABLE analysis_results ADD COLUMN evidence TEXT;"),
            ("source_filename",      "ALTER TABLE analysis_results ADD COLUMN source_filename VARCHAR(255);"),
            ("mitigation_priority",  "ALTER TABLE analysis_results ADD COLUMN mitigation_priority VARCHAR(50);"),
        ]:
            try:
                conn.execute(text(sql))
                print(f"Added {col} column.")
            except Exception as e:
                print(f"{col} column: {e}")

        # ── v4 columns (URL surface mapper) ──
        for col, sql in [
            ("source_url", "ALTER TABLE analysis_results ADD COLUMN source_url VARCHAR(2048);"),
        ]:
            try:
                conn.execute(text(sql))
                print(f"Added {col} column.")
            except Exception as e:
                print(f"{col} column: {e}")

        conn.commit()

if __name__ == "__main__":
    print("Starting migration...")
    migrate()
    print("Migration complete.")
