"""CRUD operations for LUQI AI database models"""
from typing import List, Optional, Type, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload


class CRUDBase:
    """Generic CRUD base class for any SQLAlchemy model."""

    def __init__(self, model: Type[Any]):
        self.model = model

    async def get(self, db: AsyncSession, id: int) -> Optional[Any]:
        result = await db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Any]:
        result = await db.execute(select(self.model).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, db: AsyncSession, obj_in: dict) -> Any:
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, db_obj: Any, obj_in: dict) -> Any:
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, id: int) -> bool:
        result = await db.execute(delete(self.model).where(self.model.id == id))
        await db.commit()
        return result.rowcount > 0

    async def count(self, db: AsyncSession) -> int:
        from sqlalchemy import func
        result = await db.execute(select(func.count()).select_from(self.model))
        return result.scalar()


class CRUDUser(CRUDBase):
    """User-specific CRUD with email lookup."""

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[Any]:
        from backend.models import User
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_active_users(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Any]:
        from backend.models import User
        result = await db.execute(
            select(User).where(User.is_active == True).offset(skip).limit(limit)
        )
        return result.scalars().all()


class CRUDProject(CRUDBase):
    """Project-specific CRUD with owner filtering."""

    async def get_by_owner(self, db: AsyncSession, owner_id: int, skip: int = 0, limit: int = 100) -> List[Any]:
        from backend.models import Project
        result = await db.execute(
            select(Project).where(Project.owner_id == owner_id).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def get_with_tasks(self, db: AsyncSession, project_id: int) -> Optional[Any]:
        from backend.models import Project
        result = await db.execute(
            select(Project)
            .where(Project.id == project_id)
            .options(selectinload(Project.tasks))
        )
        return result.scalar_one_or_none()


class CRUDTask(CRUDBase):
    """Task-specific CRUD with status filtering."""

    async def get_by_project(self, db: AsyncSession, project_id: int, skip: int = 0, limit: int = 100) -> List[Any]:
        from backend.models import Task
        result = await db.execute(
            select(Task).where(Task.project_id == project_id).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def get_by_status(self, db: AsyncSession, status: str, skip: int = 0, limit: int = 100) -> List[Any]:
        from backend.models import Task
        result = await db.execute(
            select(Task).where(Task.status == status).offset(skip).limit(limit)
        )
        return result.scalars().all()


class CRUDFeedback(CRUDBase):
    """Feedback-specific CRUD."""

    async def get_by_user(self, db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100) -> List[Any]:
        from backend.models import Feedback
        result = await db.execute(
            select(Feedback).where(Feedback.user_id == user_id).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def get_by_type(self, db: AsyncSession, feedback_type: str, skip: int = 0, limit: int = 100) -> List[Any]:
        from backend.models import Feedback
        result = await db.execute(
            select(Feedback).where(Feedback.feedback_type == feedback_type).offset(skip).limit(limit)
        )
        return result.scalars().all()


class CRUDFavorite(CRUDBase):
    """Favorite-specific CRUD."""

    async def get_by_user(self, db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100) -> List[Any]:
        from backend.models import Favorite
        result = await db.execute(
            select(Favorite).where(Favorite.user_id == user_id).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def is_favorited(self, db: AsyncSession, user_id: int, item_type: str, item_id: int) -> bool:
        from backend.models import Favorite
        result = await db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.item_type == item_type,
                Favorite.item_id == item_id,
            )
        )
        return result.scalar_one_or_none() is not None


# Singleton instances
from backend.models import User, Project, Task, Feedback, Favorite

user = CRUDUser(User)
project = CRUDProject(Project)
task = CRUDTask(Task)
feedback = CRUDFeedback(Feedback)
favorite = CRUDFavorite(Favorite)
