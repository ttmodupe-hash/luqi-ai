import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Safely extract live Google Cloud SQL connection URI or local SQLite fallback
DATABASE_URL = os.environ.get("DATABASE_URL")

# Provide safe local SQLite fallback if production DB string isn't found
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./fallback_test.db"

# Create robust connection engine with optimal thread management
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# FastAPI Dependency injection provider to handle clean connection lifecycles
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
