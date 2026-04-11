from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
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
            
        conn.commit()

if __name__ == "__main__":
    print("Starting migration...")
    migrate()
    print("Migration complete.")
