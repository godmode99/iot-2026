from __future__ import annotations

import re
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt


ROOT = Path(__file__).resolve().parents[1]
AI_DIR = ROOT / "doc" / "ai"
HUMAN_DIR = ROOT / "doc" / "human"
SKIP_FILES = {"README.md"}


def set_run_font(run, font_name: str, size_pt: int | None = None, bold: bool | None = None):
    run.font.name = font_name
    if size_pt is not None:
        run.font.size = Pt(size_pt)
    if bold is not None:
        run.bold = bold
    r_pr = run._element.get_or_add_rPr()
    r_fonts = r_pr.rFonts
    if r_fonts is None:
        r_fonts = OxmlElement("w:rFonts")
        r_pr.append(r_fonts)
    r_fonts.set(qn("w:ascii"), font_name)
    r_fonts.set(qn("w:hAnsi"), font_name)
    r_fonts.set(qn("w:eastAsia"), font_name)
    r_fonts.set(qn("w:cs"), font_name)


def configure_document(doc: Document):
    section = doc.sections[0]
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

    normal = doc.styles["Normal"]
    normal.font.name = "TH Sarabun New"
    normal.font.size = Pt(16)

    for style_name, size in [("Title", 24), ("Heading 1", 20), ("Heading 2", 18), ("Heading 3", 16)]:
        style = doc.styles[style_name]
        style.font.name = "TH Sarabun New"
        style.font.size = Pt(size)

    if "Code Block" not in doc.styles:
        code_style = doc.styles.add_style("Code Block", WD_STYLE_TYPE.PARAGRAPH)
        code_style.font.name = "Consolas"
        code_style.font.size = Pt(9)


def clean_text(text: str) -> str:
    text = text.replace("\u2014", "-")
    text = text.replace("\u2013", "-")
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1 (\2)", text)
    text = text.replace("`", "")
    return text.strip()


def is_table_line(line: str) -> bool:
    return line.strip().startswith("|") and line.strip().endswith("|")


def is_separator_row(cells: list[str]) -> bool:
    return all(re.fullmatch(r":?-{3,}:?", cell.strip()) for cell in cells)


def split_table_row(line: str) -> list[str]:
    return [clean_text(cell) for cell in line.strip().strip("|").split("|")]


def normalize_table_rows(rows: list[list[str]]) -> list[list[str]]:
    if not rows:
        return rows

    max_cols = max(len(row) for row in rows)
    normalized: list[list[str]] = []
    for row in rows:
        if len(row) < max_cols:
            normalized.append(row + [""] * (max_cols - len(row)))
        else:
            normalized.append(row[:max_cols])
    return normalized


def add_table(doc: Document, rows: list[list[str]]):
    if not rows:
        return

    rows = normalize_table_rows(rows)
    header = rows[0]
    body = rows[1:]
    table = doc.add_table(rows=1, cols=len(header))
    table.style = "Table Grid"

    hdr_cells = table.rows[0].cells
    for idx, value in enumerate(header):
        para = hdr_cells[idx].paragraphs[0]
        run = para.add_run(value)
        set_run_font(run, "TH Sarabun New", 16, bold=True)

    for row in body:
        tr = table.add_row().cells
        for idx, value in enumerate(row):
            para = tr[idx].paragraphs[0]
            run = para.add_run(value)
            set_run_font(run, "TH Sarabun New", 16)

    doc.add_paragraph("")


def add_paragraph_with_style(doc: Document, text: str, style: str | None = None):
    para = doc.add_paragraph(style=style)
    run = para.add_run(clean_text(text))
    if style == "Code Block":
        set_run_font(run, "Consolas", 9)
    else:
        set_run_font(run, "TH Sarabun New", 16)
    return para


def render_markdown(md_path: Path, output_path: Path):
    doc = Document()
    configure_document(doc)

    lines = md_path.read_text(encoding="utf-8").splitlines()
    in_code_block = False
    code_buffer: list[str] = []
    table_buffer: list[str] = []

    def flush_code():
        nonlocal code_buffer
        if not code_buffer:
            return
        add_paragraph_with_style(doc, "\n".join(code_buffer), "Code Block")
        code_buffer = []

    def flush_table():
        nonlocal table_buffer
        if not table_buffer:
            return
        rows = [split_table_row(line) for line in table_buffer]
        if len(rows) > 1 and is_separator_row(rows[1]):
            rows.pop(1)
        add_table(doc, rows)
        table_buffer = []

    for raw_line in lines:
        line = raw_line.rstrip()

        if line.startswith("```"):
            if in_code_block:
                flush_code()
            flush_table()
            in_code_block = not in_code_block
            continue

        if in_code_block:
            code_buffer.append(line)
            continue

        if is_table_line(line):
            table_buffer.append(line)
            continue
        else:
            flush_table()

        stripped = line.strip()
        if not stripped:
            doc.add_paragraph("")
            continue

        if stripped.startswith("# "):
            title = clean_text(stripped[2:])
            para = doc.add_paragraph(style="Title")
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = para.add_run(title)
            set_run_font(run, "TH Sarabun New", 24, bold=True)
            continue

        if stripped.startswith("## "):
            para = doc.add_paragraph(style="Heading 1")
            run = para.add_run(clean_text(stripped[3:]))
            set_run_font(run, "TH Sarabun New", 20, bold=True)
            continue

        if stripped.startswith("### "):
            para = doc.add_paragraph(style="Heading 2")
            run = para.add_run(clean_text(stripped[4:]))
            set_run_font(run, "TH Sarabun New", 18, bold=True)
            continue

        if stripped.startswith("#### "):
            para = doc.add_paragraph(style="Heading 3")
            run = para.add_run(clean_text(stripped[5:]))
            set_run_font(run, "TH Sarabun New", 16, bold=True)
            continue

        if stripped.startswith("> "):
            para = doc.add_paragraph()
            para.paragraph_format.left_indent = Inches(0.25)
            run = para.add_run(clean_text(stripped[2:]))
            set_run_font(run, "TH Sarabun New", 16)
            continue

        if re.match(r"^[-*]\s+", stripped):
            para = doc.add_paragraph(style="List Bullet")
            run = para.add_run(clean_text(re.sub(r"^[-*]\s+", "", stripped)))
            set_run_font(run, "TH Sarabun New", 16)
            continue

        if re.match(r"^\d+\.\s+", stripped):
            para = doc.add_paragraph(style="List Number")
            run = para.add_run(clean_text(re.sub(r"^\d+\.\s+", "", stripped)))
            set_run_font(run, "TH Sarabun New", 16)
            continue

        add_paragraph_with_style(doc, stripped)

    flush_table()
    flush_code()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output_path)


def main():
    HUMAN_DIR.mkdir(parents=True, exist_ok=True)
    for md_path in sorted(AI_DIR.glob("*.md")):
        if md_path.name in SKIP_FILES:
            continue
        output_path = HUMAN_DIR / f"{md_path.stem}.docx"
        render_markdown(md_path, output_path)
        print(f"generated {output_path}")


if __name__ == "__main__":
    main()
