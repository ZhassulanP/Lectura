from io import BytesIO
from pathlib import PurePosixPath
from zipfile import ZipFile

from pptx import Presentation as PowerPoint
from pypdf import PdfReader

from app.core.config import Settings
from app.exceptions import AppError
from app.schemas import Slide


def file_type(filename: str) -> str:
    suffix = PurePosixPath(filename.lower()).suffix
    if suffix not in (".pdf", ".pptx"):
        raise AppError("Upload a PDF or PPTX file.", 415, "unsupported_format")
    return suffix[1:].upper()


def shape_text(shapes):
    for shape in shapes:
        if shape.has_text_frame:
            yield shape.text
        if shape.has_table:
            for row in shape.table.rows:
                yield " | ".join(cell.text for cell in row.cells)
        if hasattr(shape, "shapes"):
            yield from shape_text(shape.shapes)


def extract_document(data: bytes, kind: str, settings: Settings) -> list[Slide]:
    if not data:
        raise AppError("This file is empty.", 422, "empty_file")
    if len(data) > settings.max_upload_bytes:
        raise AppError("This file exceeds the upload size limit.", 413, "file_too_large")
    try:
        if kind == "PDF":
            if not data[:1024].lstrip().startswith(b"%PDF-"):
                raise AppError("The file is not a valid PDF.", 422, "malformed_document")
            reader = PdfReader(BytesIO(data))
            if reader.is_encrypted:
                raise AppError("Encrypted PDFs are not supported. Upload an unencrypted copy.", 422, "encrypted_document")
            if len(reader.pages) > settings.max_document_pages:
                raise AppError("This document has too many pages.", 413, "document_too_large")
            slides = []
            total_chars = 0
            for number, page in enumerate(reader.pages, 1):
                text = (page.extract_text() or "").replace("\x00", "").strip()
                total_chars += len(text)
                if total_chars > settings.max_extracted_chars:
                    raise AppError("Extracted text exceeds the document limit.", 413, "document_too_large")
                slides.append(Slide(number=number, content=text))
        elif kind == "PPTX":
            with ZipFile(BytesIO(data)) as archive:
                names = set(archive.namelist())
                if not {"[Content_Types].xml", "ppt/presentation.xml"}.issubset(names):
                    raise AppError("The file is not a valid PPTX presentation.", 422, "malformed_document")
                if len(names) > 20000 or sum(item.file_size for item in archive.infolist()) > min(settings.max_upload_bytes * 10, 200 * 1024 * 1024):
                    raise AppError("The PPTX archive exceeds the expanded size limit.", 413, "document_too_large")
                if any(item.flag_bits & 1 for item in archive.infolist()):
                    raise AppError("Encrypted presentations are not supported.", 422, "encrypted_document")
            deck = PowerPoint(BytesIO(data))
            if len(deck.slides) > settings.max_document_pages:
                raise AppError("This document has too many slides.", 413, "document_too_large")
            slides = []
            total_chars = 0
            for number, slide in enumerate(deck.slides, 1):
                text = "\n".join(shape_text(slide.shapes)).replace("\x00", "").strip()
                total_chars += len(text)
                if total_chars > settings.max_extracted_chars:
                    raise AppError("Extracted text exceeds the document limit.", 413, "document_too_large")
                title = slide.shapes.title.text.strip() if slide.shapes.title else None
                slides.append(Slide(number=number, title=title, content=text))
        else:
            raise AppError("Unsupported document format.", 415)
    except AppError:
        raise
    except Exception as exc:
        # Parser exceptions may contain lecture text; do not expose or log them.
        raise AppError("The document is malformed or unreadable. Export a new PDF or PPTX and try again.", 422, "malformed_document") from exc
    if not slides:
        raise AppError("The document contains no pages or slides.", 422, "empty_document")
    return slides
