"""Presentations, extracted slides, study materials and quiz attempts."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    json_type = sa.JSON().with_variant(JSONB(), "postgresql")
    op.create_table("presentations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("file_type", sa.String(4), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("slide_count", sa.Integer()),
        sa.Column("subject", sa.String(100)),
        sa.Column("description", sa.String(500)),
        sa.Column("error_message", sa.Text()),
        sa.CheckConstraint("file_type IN ('PDF', 'PPTX')", name="valid_file_type"),
        sa.CheckConstraint("status IN ('UPLOADING', 'EXTRACTING', 'READY', 'FAILED')", name="valid_status"),
        sa.CheckConstraint("file_size_bytes > 0", name="positive_file_size"),
        sa.CheckConstraint("slide_count IS NULL OR slide_count >= 0", name="valid_slide_count"),
    )
    op.create_index("ix_presentations_uploaded_at", "presentations", ["uploaded_at"])
    op.create_table("slide_contents",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("presentation_id", sa.Uuid(), sa.ForeignKey("presentations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("title", sa.Text()), sa.Column("content", sa.Text(), nullable=False),
        sa.UniqueConstraint("presentation_id", "number", name="unique_slide_number"),
        sa.CheckConstraint("number > 0", name="positive_slide_number"),
    )
    op.create_index("ix_slide_contents_presentation_id", "slide_contents", ["presentation_id"])
    op.create_table("study_materials",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("presentation_id", sa.Uuid(), sa.ForeignKey("presentations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("content", json_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("kind IN ('notes', 'quiz', 'flashcards')", name="valid_material_kind"),
    )
    op.create_index("ix_study_materials_presentation_id", "study_materials", ["presentation_id"])
    op.create_table("quiz_attempts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("quiz_id", sa.Uuid(), sa.ForeignKey("study_materials.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answers", json_type, nullable=False), sa.Column("results", json_type, nullable=False),
        sa.Column("score", sa.Integer(), nullable=False), sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("total > 0 AND score >= 0 AND score <= total", name="valid_score"),
    )
    op.create_index("ix_quiz_attempts_quiz_id", "quiz_attempts", ["quiz_id"])


def downgrade():
    for name in ("quiz_attempts", "study_materials", "slide_contents", "presentations"):
        op.drop_table(name)
