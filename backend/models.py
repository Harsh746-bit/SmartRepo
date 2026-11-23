
from sqlalchemy import Column, Integer, String, DateTime, BigInteger
from sqlalchemy.sql import func

from database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String(255), nullable=False)

    original_filename = Column(String(255), nullable=False)

    file_path = Column(String(500), nullable=False)

    content_type = Column(String(100))

    file_size = Column(BigInteger, default=0)

    category = Column(String(100), default="Uncategorized")

    sha256_hash = Column(String(64), index=True)

    uploaded_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# User model
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String(150), nullable=False)

    email = Column(String(255), unique=True, index=True, nullable=False)

    password_hash = Column(String(255), nullable=False)

    role = Column(String(20), nullable=False, default="Student")

    status = Column(String(20), nullable=False, default="Active")

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
