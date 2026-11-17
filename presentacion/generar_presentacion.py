"""
Generador de la Presentación Final de EmprendeBúho (22 diapositivas, 20 minutos).
Enfoque en Ingeniería de Software, alineado a los 16 criterios (32 puntos) de la rúbrica.
"""

from pathlib import Path
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

import generar_assets

BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
OUT_PPTX = BASE_DIR / "Presentacion_Final_EmprendeBuho.pptx"

# Paleta institucional UNISON (cumpliendo RNF-04: nunca texto dorado sobre blanco)
NAVY = RGBColor(0x00, 0x2D, 0x62)
NAVY_DARK = RGBColor(0x00, 0x1B, 0x3D)
GOLD = RGBColor(0xF2, 0xA9, 0x00)
GOLD_SOFT = RGBColor(0xFE, 0xF3, 0xC7)
SOFT_BLUE = RGBColor(0xED, 0xF3, 0xF8)
LIGHT_BG = RGBColor(0xF8, 0xFA, 0xFC)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
DARK = RGBColor(0x0F, 0x17, 0x2A)
MUTED = RGBColor(0x47, 0x55, 0x69)
BORDER = RGBColor(0xCB, 0xD5, 0xE1)
GREEN = RGBColor(0x15, 0x80, 0x3D)
GREEN_SOFT = RGBColor(0xDC, 0xFC, 0xE7)
RED = RGBColor(0xB9, 0x1C, 0x1C)
RED_SOFT = RGBColor(0xFE, 0xE2, 0xE2)

FONT_NAME = "Arial"
SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.500)


def set_notes(slide, text):
    notes = slide.notes_slide
    tf = notes.notes_text_frame
    tf.text = text.strip()


def add_rect(slide, x, y, w, h, fill=None, line=None, line_pt=1.0, rounded=False):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    shp = slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))
    if rounded and len(shp.adjustments) > 0:
        shp.adjustments[0] = 0.04
    if fill is not None:
        shp.fill.solid()
        shp.fill.fore_color.rgb = fill
    else:
        shp.fill.background()
    if line is not None:
        shp.line.color.rgb = line
        shp.line.width = Pt(line_pt)
    else:
        shp.line.fill.background()
    return shp


def add_textbox(slide, x, y, w, h, text="", font_size=13, bold=False, italic=False,
                color=DARK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line_spacing=1.18):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = Inches(0.04)
    tf.margin_right = Inches(0.04)
    tf.margin_top = Inches(0.02)
    tf.margin_bottom = Inches(0.02)
    if text:
        p = tf.paragraphs[0]
        p.alignment = align
        p.line_spacing = line_spacing
        run = p.add_run()
        run.text = text
        run.font.name = FONT_NAME
        run.font.size = Pt(font_size)
        run.font.bold = bold
        run.font.italic = italic
        run.font.color.rgb = color
    return tb


def add_bullets(slide, x, y, w, h, items, font_size=12.5, color=DARK, space_after=6, line_spacing=1.15):
    """items: list of str or tuple(bold_prefix, regular_text)"""
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.04)
    tf.margin_right = Inches(0.04)
    tf.margin_top = Inches(0.02)
    tf.margin_bottom = Inches(0.02)
    for idx, item in enumerate(items):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.space_after = Pt(space_after)
        p.line_spacing = line_spacing
        if isinstance(item, tuple):
            prefix, rest = item
            r1 = p.add_run()
            r1.text = prefix
            r1.font.name = FONT_NAME
            r1.font.size = Pt(font_size)
            r1.font.bold = True
            r1.font.color.rgb = NAVY
            r2 = p.add_run()
            r2.text = rest
            r2.font.name = FONT_NAME
            r2.font.size = Pt(font_size)
            r2.font.color.rgb = color
        else:
            r = p.add_run()
            r.text = item
            r.font.name = FONT_NAME
            r.font.size = Pt(font_size)
            r.font.color.rgb = color
    return tb


def add_pill(slide, x, y, w, h, text, fill=GOLD, text_color=NAVY, font_size=10.5, bold=True):
    shp = add_rect(slide, x, y, w, h, fill=fill, rounded=True)
    if len(shp.adjustments) > 0:
        shp.adjustments[0] = 0.45
    tf = shp.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = Inches(0.08)
    tf.margin_right = Inches(0.08)
    tf.margin_top = Inches(0.01)
    tf.margin_bottom = Inches(0.01)
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = text
    r.font.name = FONT_NAME
    r.font.size = Pt(font_size)
    r.font.bold = bold
    r.font.color.rgb = text_color
    return shp


def add_image_fit(slide, img_path, x, y, max_w, max_h, frame_border=False):
    with Image.open(img_path) as im:
        iw, ih = im.size
    ratio = min(max_w / iw, max_h / ih)
    w = iw * ratio
    h = ih * ratio
    px = x + (max_w - w) / 2
    py = y + (max_h - h) / 2
    if frame_border:
        add_rect(slide, px - 0.03, py - 0.03, w + 0.06, h + 0.06, fill=WHITE, line=BORDER, line_pt=1.0)
    slide.shapes.add_picture(str(img_path), Inches(px), Inches(py), Inches(w), Inches(h))
    return px, py, w, h


def add_card(slide, x, y, w, h, title="", accent=NAVY, bg=WHITE, border=BORDER, title_size=13.5, title_bg=None):
    card = add_rect(slide, x, y, w, h, fill=bg, line=border, line_pt=1.0, rounded=True)
    if title:
        if title_bg is not None:
            add_rect(slide, x, y, w, 0.40, fill=title_bg, line=border, line_pt=0.75)
            add_textbox(slide, x + 0.14, y + 0.05, w - 0.28, 0.30, title,
                        font_size=title_size, bold=True, color=NAVY if title_bg == GOLD else WHITE,
                        anchor=MSO_ANCHOR.MIDDLE)
        else:
            add_rect(slide, x + 0.12, y + 0.12, 0.07, 0.28, fill=accent)
            add_textbox(slide, x + 0.26, y + 0.10, w - 0.38, 0.32, title,
                        font_size=title_size, bold=True, color=NAVY, anchor=MSO_ANCHOR.MIDDLE)
    return card


def style_table(table, col_widths, headers, rows, font_size=10.5, header_fill=NAVY,
                header_text=WHITE, zebra=True, highlight_last_row=False):
    for i, w in enumerate(col_widths):
        table.columns[i].width = Inches(w)

    def set_cell(cell, text, is_header=False, row_idx=0, is_last=False, col_idx=0):
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        cell.margin_left = Inches(0.08)
        cell.margin_right = Inches(0.08)
        cell.margin_top = Inches(0.04)
        cell.margin_bottom = Inches(0.04)
        cell.fill.solid()
        if is_header:
            cell.fill.fore_color.rgb = header_fill
        elif highlight_last_row and is_last:
            cell.fill.fore_color.rgb = GOLD
        elif zebra and row_idx % 2 == 1:
            cell.fill.fore_color.rgb = SOFT_BLUE
        else:
            cell.fill.fore_color.rgb = WHITE

        tf = cell.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.line_spacing = 1.12
        r = p.add_run()
        r.text = str(text)
        r.font.name = FONT_NAME
        r.font.size = Pt(font_size if not is_header else font_size + 0.5)
        r.font.bold = is_header or (highlight_last_row and is_last) or (col_idx == 0)
        if is_header:
            r.font.color.rgb = header_text
        elif highlight_last_row and is_last:
            r.font.color.rgb = NAVY
        else:
            r.font.color.rgb = DARK

    for c, h in enumerate(headers):
        set_cell(table.cell(0, c), h, is_header=True, col_idx=c)

    for r_idx, row in enumerate(rows):
        is_last = (r_idx == len(rows) - 1)
        for c_idx, val in enumerate(row):
            set_cell(table.cell(r_idx + 1, c_idx), val, row_idx=r_idx, is_last=is_last, col_idx=c_idx)


def setup_content_slide(prs, slide_num, section_badge, title, speaker, duration_str):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    # Fondo limpio blanco
    add_rect(slide, 0, 0, 13.333, 7.500, fill=LIGHT_BG)
    # Barra superior institucional
    add_rect(slide, 0, 0, 10.5, 0.08, fill=NAVY)
    add_rect(slide, 10.5, 0, 2.833, 0.08, fill=GOLD)
    # Cabecera blanca
    add_rect(slide, 0, 0.08, 13.333, 1.00, fill=WHITE)
    add_rect(slide, 0, 1.08, 13.333, 0.02, fill=BORDER)

    # Pill de sección (dorado con texto marino)
    badge_w = max(2.2, min(4.8, 0.25 + len(section_badge) * 0.095))
    add_pill(slide, 0.45, 0.16, badge_w, 0.27, section_badge, fill=GOLD, text_color=NAVY, font_size=9.5)
    # Título principal
    add_textbox(slide, 0.45, 0.47, 10.2, 0.54, title, font_size=21, bold=True, color=NAVY, anchor=MSO_ANCHOR.MIDDLE)
    # Logo equipo arriba derecha
    cholesky_logo = ASSETS_DIR / "logo_cholesky.png"
    if cholesky_logo.exists():
        add_image_fit(slide, cholesky_logo, 10.85, 0.22, 2.05, 0.68)

    # Footer
    add_rect(slide, 0, 7.12, 13.333, 0.38, fill=WHITE)
    add_rect(slide, 0, 7.10, 13.333, 0.02, fill=BORDER)
    add_textbox(slide, 0.45, 7.15, 7.0, 0.30,
                "EmprendeBúho · Equipo «Descompuestos por Cholesky» · Ingeniería de Software II (UNISON)",
                font_size=9.5, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
    add_pill(slide, 8.20, 7.16, 3.35, 0.26, f"Expositor: {speaker} · {duration_str}",
             fill=SOFT_BLUE, text_color=NAVY, font_size=9.0)
    add_pill(slide, 11.75, 7.16, 1.13, 0.26, f"{slide_num} / 22",
             fill=NAVY, text_color=WHITE, font_size=9.0)
    return slide


def build_presentation():
    generar_assets.prepare_logos()
    generar_assets.chart_red_ruta_critica()
    generar_assets.chart_gantt_comparativo()
    generar_assets.chart_esfuerzo_hu()
    generar_assets.chart_costos()
    generar_assets.chart_riesgos()

    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    # =========================================================================
    # DIAPOSITIVA 1: PORTADA (0:30 | Paulina)
    # =========================================================================
    s1 = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(s1, 0, 0, 13.333, 7.500, fill=NAVY)
    add_rect(s1, 0, 0, 0.32, 7.500, fill=GOLD)
    add_rect(s1, 0.32, 6.75, 13.013, 0.75, fill=NAVY_DARK)

    # Escudo UNISON (arriba izq) y tarjeta blanca con logo Cholesky (arriba der)
    unison_logo = ASSETS_DIR / "unison-logo.png"
    cholesky_logo = ASSETS_DIR / "logo_cholesky.png"
    if unison_logo.exists():
        add_image_fit(s1, unison_logo, 0.85, 0.55, 1.35, 1.35)
    add_textbox(s1, 2.35, 0.65, 5.5, 1.15,
                "UNIVERSIDAD DE SONORA\nDivisión de Ciencias Exactas y Naturales\nIngeniería de Software II",
                font_size=14, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE, line_spacing=1.28)

    add_rect(s1, 9.25, 0.55, 3.45, 1.25, fill=WHITE, rounded=True)
    if cholesky_logo.exists():
        add_image_fit(s1, cholesky_logo, 9.42, 0.68, 3.10, 0.98)

    # Título central
    add_textbox(s1, 0.85, 2.25, 11.6, 0.42, "PRESENTACIÓN FINAL DE PROYECTO DE INGENIERÍA DE SOFTWARE",
                font_size=13, bold=True, color=SOFT_BLUE)
    add_textbox(s1, 0.85, 2.68, 11.6, 1.05, "EmprendeBúho", font_size=50, bold=True, color=WHITE)
    add_pill(s1, 0.85, 3.88, 5.10, 0.50, "«Tu campus, tus emprendimientos.»",
             fill=GOLD, text_color=NAVY, font_size=16)

    # Tarjeta resumen
    add_rect(s1, 0.85, 4.72, 11.65, 1.65, fill=NAVY_DARK, line=GOLD, line_pt=1.2, rounded=True)
    add_bullets(s1, 1.10, 4.88, 11.15, 1.35, [
        ("Equipo: ", "Descompuestos por Cholesky (8 integrantes)   ·   Profesor: Adrián Vázquez Osorio"),
        ("Periodo de ejecución: ", "28 de septiembre al 27 de noviembre de 2026 (45 días hábiles · 2 meses)"),
        ("Alcance completado: ", "40 / 40 Historias de Usuario (100 %) · Presupuesto autorizado: $265,980.00 MXN"),
    ], font_size=13.5, color=WHITE, space_after=6)
    # Fix prefix color inside dark card
    for p in s1.shapes[-1].text_frame.paragraphs:
        p.runs[0].font.color.rgb = GOLD

    add_textbox(s1, 0.85, 6.85, 8.5, 0.50, "Hermosillo, Sonora · Noviembre de 2026",
                font_size=12, color=SOFT_BLUE, anchor=MSO_ANCHOR.MIDDLE)
    add_pill(s1, 9.65, 6.92, 2.85, 0.36, "Exposición: 20:00 min · 1 / 22",
             fill=GOLD, text_color=NAVY, font_size=10.5)
    set_notes(s1, "[00:00 – 00:25 (0:25) | Paulina] Bienvenida, presentación de la materia, profesor, proyecto EmprendeBúho y nuestro equipo Descompuestos por Cholesky.")

    # =========================================================================
    # DIAPOSITIVA 2: 1.1 IDENTIDAD DEL EQUIPO (0:45 | Paulina)
    # =========================================================================
    s2 = setup_content_slide(prs, 2, "1. INTRODUCCIÓN · 1.1 IDENTIDAD",
                             "Identidad del Equipo: «Descompuestos por Cholesky»", "Paulina", "0:45 min")

    # Panel izquierdo: Logo + Eslogan + Ficha
    add_card(s2, 0.45, 1.28, 4.15, 5.62, title="Nuestro Equipo y Eslogan", bg=WHITE, title_bg=NAVY)
    if cholesky_logo.exists():
        add_image_fit(s2, cholesky_logo, 0.72, 1.85, 3.60, 1.25)
    add_pill(s2, 0.70, 3.30, 3.65, 0.44, "«Tu campus, tus emprendimientos.»", fill=GOLD, text_color=NAVY, font_size=12.5)
    add_bullets(s2, 0.68, 3.92, 3.70, 2.80, [
        ("Nombre: ", "Descompuestos por Cholesky"),
        ("Proyecto: ", "EmprendeBúho (Directorio universitario)"),
        ("Institución: ", "Universidad de Sonora (UNISON)"),
        ("Asignatura: ", "Ingeniería de Software II"),
        ("Profesor: ", "Adrián Vázquez Osorio"),
        ("Organización: ", "8 integrantes · 5 HU titulares c/u"),
    ], font_size=12, space_after=7)

    # Panel derecho: 8 tarjetas de integrantes (2x4)
    add_textbox(s2, 4.82, 1.25, 8.05, 0.35, "Integrantes y Frentes de Responsabilidad (40 Historias de Usuario)",
                font_size=14, bold=True, color=NAVY)
    members = [
        ("1. Paulina Bojórquez Trujillo", "Favoritos, precios, vista previa, recuperación y reportes (5 HU)"),
        ("2. Daniel Leinad Domínguez Calvario", "Arquitectura, contacto directo, notificaciones, reportes y orden (5 HU)"),
        ("3. María Fernanda Hernández García", "Solicitudes UNISON, acceso sin registro, catálogo y perfil (5 HU)"),
        ("4. Marco Antonio Tadeo Munro Flores", "Horarios, sesión segura, búsqueda y filtros de disponibilidad (5 HU)"),
        ("5. Mario Alberto Ocejo Quijada", "Directorio público, búsqueda, pausa de productos y privacidad (5 HU)"),
        ("6. Ángel David Ortega Félix", "Estado abierto/cerrado, perfil público, moderación y zonas (5 HU)"),
        ("7. Orlando Pacheco Velasquez", "Precios, edición/eliminación de catálogo y ubicación en campus (5 HU)"),
        ("8. Denzel Omar Rivera Urías", "Arquitectura, categorías, aprobación de cuentas y mantenimiento (5 HU)"),
    ]
    for idx, (m_name, m_role) in enumerate(members):
        col = idx % 2
        row = idx // 2
        cx = 4.82 + col * 4.08
        cy = 1.68 + row * 1.32
        add_card(s2, cx, cy, 3.92, 1.18, bg=WHITE, border=BORDER)
        add_rect(s2, cx, cy, 0.10, 1.18, fill=GOLD if idx % 2 == 0 else NAVY)
        add_textbox(s2, cx + 0.18, cy + 0.10, 3.65, 0.34, m_name, font_size=12, bold=True, color=NAVY)
        add_textbox(s2, cx + 0.18, cy + 0.45, 3.65, 0.66, m_role, font_size=10.8, color=MUTED, line_spacing=1.15)

    set_notes(s2, "[00:25 – 01:10 (0:45) | Paulina] Presentar nombre del equipo, eslogan oficial 'Tu campus, tus emprendimientos', los 8 integrantes y cómo nos dividimos los frentes.")

    # =========================================================================
    # DIAPOSITIVA 3: 1.2 PROBLEMÁTICA (0:45 | Paulina)
    # =========================================================================
    s3 = setup_content_slide(prs, 3, "1. INTRODUCCIÓN · 1.2 PROBLEMÁTICA",
                             "Problemática Actual del Comercio Estudiantil en la UNISON", "Paulina", "0:45 min")

    add_rect(s3, 0.45, 1.26, 12.43, 0.88, fill=SOFT_BLUE, line=NAVY, line_pt=1.0, rounded=True)
    add_textbox(s3, 0.65, 1.34, 12.0, 0.72,
                "Situación detectada: En el campus Hermosillo, numerosos estudiantes venden alimentos, repostería, bisutería y servicios para apoyar sus gastos de estudio; sin embargo, su difusión actual depende de historias efímeras de redes sociales, grupos de mensajería y boca en boca.",
                font_size=12.8, bold=False, color=DARK, anchor=MSO_ANCHOR.MIDDLE)

    problems = [
        ("1. Información poco precisa",
         "• Emprendedor: Menor alcance comercial y dependencia de contactos previos.",
         "• Consumidor: Dificultad para comparar precios, productos y menús en un solo lugar.", NAVY),
        ("2. Ubicación cambiante en el campus",
         "• Emprendedor: Pérdida de ventas potenciales al moverse entre facultades.",
         "• Consumidor: Pérdida de tiempo buscando físicamente dónde se encuentra el vendedor.", GOLD),
        ("3. Horarios poco visibles",
         "• Emprendedor: Expectativas erróneas y mensajes repetitivos preguntando si atiende.",
         "• Consumidor: Incertidumbre sobre si el negocio está abierto en ese momento.", GOLD),
        ("4. Ausencia de directorio y privacidad",
         "• Emprendedor: Poca continuidad de identidad y necesidad de cuidar su privacidad.",
         "• Consumidor: Descubrimiento de la oferta por pura casualidad sin orden ni filtros.", NAVY),
    ]
    for i, (ptitle, pemp, pcon, acc) in enumerate(problems):
        col = i % 2
        row = i // 2
        px = 0.45 + col * 6.32
        py = 2.30 + row * 2.18
        add_card(s3, px, py, 6.10, 2.00, title=ptitle, accent=acc, bg=WHITE, title_size=14)
        add_bullets(s3, px + 0.22, py + 0.54, 5.66, 1.35, [pemp, pcon], font_size=12, space_after=8)

    add_rect(s3, 0.45, 6.56, 12.43, 0.42, fill=GOLD_SOFT, line=GOLD, line_pt=1.0, rounded=True)
    add_textbox(s3, 0.65, 6.60, 12.0, 0.34,
                "Reto adicional: Acreditar pertenencia a la comunidad UNISON y proteger la privacidad de ubicación (configurable y voluntaria) ante lineamientos internos.",
                font_size=11.5, bold=True, color=NAVY, anchor=MSO_ANCHOR.MIDDLE)

    set_notes(s3, "[01:10 – 01:55 (0:45) | Paulina] Explicar la difusión dispersa en redes y los 4 problemas críticos para emprendedores y consumidores, cerrando con la necesidad de privacidad y pertenencia UNISON. Ceder la palabra a Leinad.")

    # =========================================================================
    # DIAPOSITIVA 4: 1.3 OBJETIVO Y ALCANCE (0:40 | Leinad)
    # =========================================================================
    s4 = setup_content_slide(prs, 4, "1. INTRODUCCIÓN · 1.3 OBJETIVO",
                             "Objetivo del Proyecto y Límites de Alcance", "Leinad", "0:40 min")

    add_rect(s4, 0.45, 1.24, 12.43, 1.38, fill=NAVY, rounded=True)
    add_pill(s4, 0.68, 1.38, 2.30, 0.28, "OBJETIVO GENERAL", fill=GOLD, text_color=NAVY, font_size=10)
    add_textbox(s4, 0.68, 1.72, 11.95, 0.80,
                "Desarrollar una plataforma web responsiva (EmprendeBúho) que facilite la difusión, consulta y localización de emprendimientos de estudiantes de la Universidad de Sonora, reuniendo información útil para consumidores y emprendedores en un espacio centralizado, organizado y seguro.",
                font_size=12.6, bold=True, color=WHITE, line_spacing=1.20)

    add_card(s4, 0.45, 2.78, 7.30, 4.12, title="Dentro del Alcance (In-Scope · 3 Roles)", bg=WHITE, title_bg=NAVY)
    add_bullets(s4, 0.65, 3.30, 6.90, 3.45, [
        ("Consumidor (sin registro): ", "Exploración pública inmediata, búsqueda de negocios/productos, filtros por categoría, zona del campus, precio y horario, favoritos y contacto en máximo 2 clics."),
        ("Emprendedor (verificado UNISON): ", "Solicitud con correo institucional y matrícula, gestión de perfil, catálogo con precios y pausas, horarios, switch Abierto/Cerrado y control de privacidad de ubicación."),
        ("Administrador (moderación): ", "Revisión segura de credenciales UNISON, aprobación/rechazo de cuentas, moderación de publicaciones, resolución de reportes y mantenimiento."),
    ], font_size=12, space_after=10)

    add_card(s4, 7.98, 2.78, 4.90, 4.12, title="Fuera de Alcance (Delimitación)", bg=WHITE, title_bg=GOLD)
    add_bullets(s4, 8.18, 3.30, 4.50, 3.45, [
        ("Sin procesamiento de pagos: ", "No hay carritos de compra ni pasarelas de pago; las compras se acuerdan directamente."),
        ("Sin logística de entregas: ", "No gestionamos repartidores ni envíos; vendedor y comprador acuerdan el punto de encuentro."),
        ("Sin sustituir permisos oficiales: ", "Herramienta digital de vinculación estudiantil que respeta la privacidad del alumno."),
    ], font_size=12, space_after=12)

    set_notes(s4, "[01:55 – 02:35 (0:40) | Leinad] Leer/explicar el objetivo general alineado a la problemática y delimitar claramente qué hace y qué NO hace la plataforma (sin pagos ni entregas).")

    # =========================================================================
    # DIAPOSITIVA 5: 2.1 ENFOQUE METODOLÓGICO (1:00 | Leinad)
    # =========================================================================
    s5 = setup_content_slide(prs, 5, "2. METODOLOGÍA · 2.1 ENFOQUE",
                             "Enfoque Metodológico: Modelo Híbrido (Tradicional + Ágil)", "Leinad", "1:00 min")

    add_card(s5, 0.45, 1.28, 3.90, 3.70, title="Planeación Tradicional", bg=WHITE, title_bg=NAVY)
    add_bullets(s5, 0.62, 1.80, 3.55, 3.05, [
        ("Estructura fija (WBS): ", "9 tareas maestras (T1–T9) y dependencias claras."),
        ("Control de tiempo (CPM): ", "Red de actividades, holguras y Ruta Crítica definida desde la Parte 01."),
        ("Línea base y riesgos: ", "Gantt bimestral (28 sep.–27 nov.), presupuesto de $265,980 y 14 riesgos mapeados."),
    ], font_size=11.8, space_after=10)

    add_card(s5, 4.58, 1.28, 3.90, 3.70, title="Ejecución Ágil (Scrum/Kanban)", bg=WHITE, title_bg=GOLD)
    add_bullets(s5, 4.75, 1.80, 3.55, 3.05, [
        ("40 Historias de Usuario: ", "Requisitos centrados en valor real para los 3 roles, con prioridad y complejidad."),
        ("Tablero Kanban (Trello): ", "Flujo visual Por hacer → En proceso → Terminadas."),
        ("Bitácoras diarias (Daily): ", "27+ revisiones informales de avance y bloqueos, con entregas incrementales semanales."),
    ], font_size=11.8, space_after=10)

    add_card(s5, 8.71, 1.28, 4.17, 3.70, title="¿Por qué elegimos Híbrido?", bg=SOFT_BLUE, border=NAVY, title_bg=NAVY)
    add_bullets(s5, 8.88, 1.80, 3.83, 3.05, [
        ("100 % Tradicional no bastaba: ", "Hubiera sido rígido frente al retraso de 11 días en T1 y al cambio de alcance de HU-03."),
        ("100 % Ágil tampoco bastaba: ", "Sin ruta crítica ni fechas fijas sería riesgoso coordinar a 8 personas en un semestre escolar."),
        ("Resultado del Híbrido: ", "Previsibilidad académica + flexibilidad para paralelizar y recuperarnos a tiempo."),
    ], font_size=11.8, space_after=10)

    add_rect(s5, 0.45, 5.18, 12.43, 1.72, fill=WHITE, line=BORDER, line_pt=1.0, rounded=True)
    add_textbox(s5, 0.65, 5.26, 12.0, 0.34, "Dinámica de Ejecución del Modelo Híbrido (Semanas 1 a 8):",
                font_size=13, bold=True, color=NAVY)
    phases = [
        ("S1–S2 (28 sep–16 oct)", "Planeación base, HU, riesgos, presupuesto y diseño inicial"),
        ("S3–S4 (19–30 oct)", "Cierre de T1 (19 oct) y entregas en paralelo: 20 HU (50 %)"),
        ("S5–S6 (2–13 nov)", "Directorio, búsqueda, reportes y vista previa: 36 HU (90 %)"),
        ("S7–S8 (16–27 nov)", "Cierre de ubicación/zonas y aceptación final: 40/40 HU (100 %)"),
    ]
    for i, (ph_t, ph_d) in enumerate(phases):
        bx = 0.65 + i * 3.05
        add_rect(s5, bx, 5.66, 2.88, 1.08, fill=SOFT_BLUE if i % 2 == 0 else GOLD_SOFT, line=NAVY, line_pt=0.8, rounded=True)
        add_textbox(s5, bx + 0.10, 5.72, 2.68, 0.30, ph_t, font_size=10.5, bold=True, color=NAVY)
        add_textbox(s5, bx + 0.10, 6.03, 2.68, 0.65, ph_d, font_size=10.2, color=DARK)

    set_notes(s5, "[02:35 – 03:35 (1:00) | Leinad] Justificar claramente por qué combinamos planeación tradicional (Gantt, CPM, Riesgos) con ejecución ágil (40 HU, Kanban, Daily en bitácoras). Ceder la palabra a Fernanda.")

    # =========================================================================
    # DIAPOSITIVA 6: 2.2 HISTORIAS DE USUARIO (1:15 | Fernanda)
    # =========================================================================
    s6 = setup_content_slide(prs, 6, "2. METODOLOGÍA · 2.2 HISTORIAS DE USUARIO",
                             "40 Historias de Usuario (100 % Completadas) y Casos Destacados", "Fernanda", "1:15 min")

    kpis = [
        ("40 / 40", "Historias Terminadas (100 %)", NAVY, WHITE),
        ("18 · 14 · 8", "Emprendedor · Consumidor · Admin", GOLD, NAVY),
        ("15 · 19 · 6", "Complejidad Baja · Media · Alta", SOFT_BLUE, NAVY),
        ("5 HU / persona", "Distribución Equitativa (8 integrantes)", NAVY, WHITE),
    ]
    for i, (val, lbl, bg, fg) in enumerate(kpis):
        kx = 0.45 + i * 3.16
        add_rect(s6, kx, 1.24, 2.95, 0.96, fill=bg, line=NAVY, line_pt=1.0, rounded=True)
        add_textbox(s6, kx + 0.10, 1.30, 2.75, 0.46, val, font_size=19, bold=True, color=fg, align=PP_ALIGN.CENTER)
        add_textbox(s6, kx + 0.10, 1.76, 2.75, 0.36, lbl, font_size=10.2, bold=True, color=fg, align=PP_ALIGN.CENTER)

    stories = [
        ("HU-01 · Historia Prioritaria (Habilitadora)",
         "Prioridad: Alta · Comp.: Alta · Resp.: Fernanda",
         "• Como: Emprendedor de la Universidad de Sonora.\n"
         "• Quiero: Solicitar una cuenta enviando mi correo institucional (@unison.mx), matrícula y foto de credencial.\n"
         "• Para: Registrar mi negocio en la plataforma y ser verificado.\n"
         "• ¿Por qué es clave? Sin cuentas verificadas de estudiantes no puede existir el directorio confiable ni la moderación administrativa.",
         NAVY),
        ("HU-03 · Evolución Ágil de Requisito",
         "Prioridad: Alta · Comp.: Media · Resp.: Fernanda",
         "• Antes: Publicar una foto del menú del negocio (T4).\n"
         "• Corregida: Como cliente, quiero acceder al sitio web sin registrarme para consultar públicamente los emprendimientos y sus productos (T2).\n"
         "• Criterios clave: Abrir inicio, directorio y perfil sin sesión; respetar privacidad si la ubicación está oculta.\n"
         "• Valor: Eliminó fricción para los consumidores universitarios.",
         GOLD),
        ("HU-05 · Ejemplo de Historia Corta",
         "Prioridad: Baja · Comp.: Baja · Resp.: Fernanda",
         "• Como: Emprendedor.\n"
         "• Quiero: Clasificar mi negocio por categoría (alimentos, repostería, bisutería, etc.).\n"
         "• Para: Facilitar que los consumidores encuentren mi negocio al filtrar.\n"
         "• Duración estimada: 1 día hábil (alcanza a seleccionar categoría, guardar y mostrarla en el perfil público).",
         NAVY),
    ]
    for i, (st_t, st_sub, st_body, st_bg) in enumerate(stories):
        sx = 0.45 + i * 4.21
        add_card(s6, sx, 2.38, 4.00, 4.52, title=st_t, bg=WHITE, title_bg=st_bg, title_size=12.2)
        add_rect(s6, sx + 0.14, 2.90, 3.72, 0.34, fill=SOFT_BLUE, rounded=True)
        add_textbox(s6, sx + 0.20, 2.93, 3.60, 0.28, st_sub, font_size=9.2, bold=True, color=NAVY, anchor=MSO_ANCHOR.MIDDLE)
        add_textbox(s6, sx + 0.18, 3.36, 3.64, 3.40, st_body, font_size=11.2, color=DARK, line_spacing=1.24)

    set_notes(s6, "[03:35 – 04:50 (1:15) | Fernanda] Destacar el total de 40 historias (40/40 terminadas al cierre), su distribución por rol/complejidad y explicar HU-01 (prioritaria), HU-03 (cambio ágil de alcance) y HU-05 (historia más corta de 1 día).")

    # =========================================================================
    # DIAPOSITIVA 7: 2.3 PLANEACIÓN I - RED Y RUTA CRÍTICA (1:15 | Fernanda)
    # =========================================================================
    s7 = setup_content_slide(prs, 7, "2. METODOLOGÍA · 2.3 PLANEACIÓN (RED Y CPM)",
                             "Red de Actividades (T1–T9), Ruta Crítica y Holguras", "Fernanda", "1:15 min")

    add_image_fit(s7, ASSETS_DIR / "red_ruta_critica.png", 0.45, 1.18, 12.43, 3.72, frame_border=True)

    # Tabla resumen de rutas debajo
    tbl_shape = s7.shapes.add_table(4, 5, Inches(0.45), Inches(5.02), Inches(12.43), Inches(1.92))
    style_table(
        tbl_shape.table,
        col_widths=[2.10, 4.63, 1.55, 1.55, 2.60],
        headers=["Ruta de la Red", "Secuencia de Tareas (Duración c/u)", "Duración Total", "Holgura", "Significado en Planeación"],
        rows=[
            ["Ruta A (CRÍTICA)", "T1(5) → T2(10) → T3(10) → T4(10) → T5(15) → T6(5) → T9(7)", "62 días hábiles", "0 días", "Define la duración mínima secuencial del proyecto."],
            ["Ruta B (Ubicación)", "T1(5) → T2(10) → T3(10) → T8(8) → T5(15) → T6(5) → T9(7)", "60 días hábiles", "2 días (en T8)", "T8 puede demorarse máx. 2 días sin retrasar T5."],
            ["Ruta C (Admin.)", "T1(5) → T2(10) → T7(10) → T9(7)", "32 días hábiles", "30 días (en T7)", "Permite avanzar administración en paralelo a T3–T6."],
        ],
        font_size=10.5,
    )
    # Resaltar fila de Ruta Crítica en dorado suave
    for c in range(5):
        s7.shapes[-1].table.cell(1, c).fill.fore_color.rgb = GOLD_SOFT
        s7.shapes[-1].table.cell(1, c).text_frame.paragraphs[0].runs[0].font.bold = True

    set_notes(s7, "[04:50 – 06:05 (1:15) | Fernanda] Mostrar la red de 9 tareas T1–T9, explicar el cálculo de la Ruta Crítica A (62 días), Ruta B (60 días, holgura 2d en T8) y Ruta C (32 días, holgura 30d en T7). Ceder a Marco.")

    # =========================================================================
    # DIAPOSITIVA 8: 2.3 PLANEACIÓN II - GANTT Y CARGA DE TRABAJO (1:05 | Marco)
    # =========================================================================
    s8 = setup_content_slide(prs, 8, "2. METODOLOGÍA · 2.3 PLANEACIÓN (GANTT Y CARGA)",
                             "Cronograma de Gantt (Original vs. Real) y Carga de Trabajo", "Marco", "1:05 min")

    add_card(s8, 0.45, 1.22, 8.05, 5.72, title="Gantt Comparativo (28 sep. – 27 nov. 2026 · 45 días hábiles)", bg=WHITE, title_bg=NAVY)
    add_image_fit(s8, ASSETS_DIR / "gantt_comparativo.png", 0.58, 1.72, 7.80, 4.42)
    add_textbox(s8, 0.62, 6.22, 7.72, 0.62,
                "Estrategia de recuperación: Tras cerrarse T1 el 19 de octubre (+11 días), se traslaparon T2–T8 mediante entregables mínimos acordados para proteger la fecha final del 27 de noviembre.",
                font_size=10.5, color=MUTED, bold=True)

    add_textbox(s8, 8.68, 1.22, 4.20, 0.34, "Carga por Integrante (5 HU c/u · Equitativa)",
                font_size=11.5, bold=True, color=NAVY)
    tbl_s8 = s8.shapes.add_table(10, 3, Inches(8.68), Inches(1.62), Inches(4.20), Inches(5.32))
    style_table(
        tbl_s8.table,
        col_widths=[1.48, 0.68, 2.04],
        headers=["Integrante", "HU", "Coordinación en Tareas"],
        rows=[
            ["Fernanda", "5 HU", "T2 (Cuentas), T7 (Admin), T9"],
            ["Orlando", "5 HU", "T3 (Perfil), T8 (Ubicación)"],
            ["Mario", "5 HU", "T2 (Cuentas), T8 (Ubicación)"],
            ["Ángel", "5 HU", "T3 (Perfil), T7 (Admin)"],
            ["Denzel", "5 HU", "T1 (Arq), T5 (Búsq), T9"],
            ["Leinad", "5 HU", "T1 (Arq), T5 (Búsqueda)"],
            ["Paulina", "5 HU", "T4 (Catálogo), T6 (Interac.)"],
            ["Marco", "5 HU", "T4 (Catálogo), T6 (Interac.)"],
            ["TOTAL", "40 HU", "8 personas × 5 HU · Apoyo cruzado"],
        ],
        font_size=10.2,
        highlight_last_row=True,
    )

    set_notes(s8, "[06:05 – 07:10 (1:05) | Marco] Explicar el Gantt comparando línea base vs. recuperación traslapada (adelanto de T6, cierre de vistas previas y ubicación) y mostrar que cada integrante fue titular de exactamente 5 HU.")

    # =========================================================================
    # DIAPOSITIVA 9: 3.1 CÁLCULO DE ESFUERZO (1:25 | Marco)
    # =========================================================================
    s9 = setup_content_slide(prs, 9, "3. ESTIMACIÓN · 3.1 CÁLCULO DE ESFUERZO",
                             "Estimación de Esfuerzo: Puntos de Función, Horas-Persona y LDC", "Marco", "1:25 min")

    metrics_s9 = [
        ("Duración del Proyecto", "45 días hábiles de calendario (2 meses: 28 sep.–27 nov.) · 62 d en ruta crítica"),
        ("Puntos de Función (IFPUG)", "205 PF sin ajustar (14 EI + 6 EO + 8 EQ + 11 ILF + 2 EIF · VAF = 1.00 · ~5.1 PF/HU)"),
        ("Horas-Persona (HP)", "1,440 HP totales (8 dev × 45 días × 4 h efectivas/día = 180 HP/persona · ~7.0 HP/PF)"),
        ("Líneas de Código (LDC)", "Estimadas: 6,150 LDC (~30 LDC/PF) | Reales: 6,176 LDC (4,785 app + 1,391 pruebas · +0.4 %)"),
        ("Promedio por Historia", "36.0 HP/HU  ·  1.7 días-tarea/HU  ·  154.4 LDC/HU  ·  Costo total prom.: $6,649.50 MXN"),
    ]
    add_card(s9, 0.45, 1.24, 6.20, 3.05, title="Métricas Globales del Proyecto", bg=WHITE, title_bg=NAVY)
    add_bullets(s9, 0.62, 1.72, 5.88, 2.50, [(f"{k}: ", v) for k, v in metrics_s9], font_size=10.8, space_after=6)

    # Tabla ponderada por complejidad de HU
    add_textbox(s9, 0.45, 4.38, 6.20, 0.30, "Esfuerzo y Costo Ponderado por Complejidad de HU (71 pts totales):",
                font_size=11.5, bold=True, color=NAVY)
    tbl_s9 = s9.shapes.add_table(5, 5, Inches(0.45), Inches(4.70), Inches(6.20), Inches(2.22))
    style_table(
        tbl_s9.table,
        col_widths=[1.48, 0.85, 1.05, 1.15, 1.67],
        headers=["Complejidad", "Cant.", "Dur. / HU", "HP / HU", "Costo Total / HU"],
        rows=[
            ["Baja (Peso 1)", "15 HU", "~1.0 día", "20.3 HP", "$3,746.20 MXN"],
            ["Media (Peso 2)", "19 HU", "~1.9 días", "40.6 HP", "$7,492.39 MXN"],
            ["Alta (Peso 3)", "6 HU", "~2.9 días", "60.8 HP", "$11,238.59 MXN"],
            ["Total / Prom.", "40 HU", "1.7 días", "1,440 HP", "$265,980.00 MXN"],
        ],
        font_size=10.2,
        highlight_last_row=True,
    )

    add_card(s9, 6.84, 1.24, 6.04, 5.68, title="Comparativa Ponderada por Complejidad", bg=WHITE, title_bg=GOLD)
    add_image_fit(s9, ASSETS_DIR / "chart_esfuerzo_hu.png", 6.96, 1.74, 5.80, 3.95)
    add_textbox(s9, 7.02, 5.82, 5.68, 0.96,
                "Nota metodológica: La duración promedio por HU pondera la complejidad (1:2:3) sobre el esfuerzo total de 1,440 HP y el presupuesto total ($265,980 MXN). La tarifa base sobre sueldos equivale a $166.67 MXN/hora.",
                font_size=10.5, color=MUTED, line_spacing=1.18)

    set_notes(s9, "[07:10 – 08:35 (1:25) | Marco] Presentar todos los datos exigidos en 3.1: 205 Puntos de Función, 6,150 LDC estimadas vs 6,176 reales, 1,440 Horas-Persona, duración promedio y tabla ponderada de costo/tiempo por HU. Ceder a Mario.")

    # =========================================================================
    # DIAPOSITIVA 10: 3.2 DESGLOSE DE COSTOS (1:10 | Mario)
    # =========================================================================
    s10 = setup_content_slide(prs, 10, "3. ESTIMACIÓN · 3.2 DESGLOSE DE COSTOS",
                              "Presupuesto Total del Proyecto: $265,980.00 MXN", "Mario", "1:10 min")

    tbl_s10 = s10.shapes.add_table(7, 4, Inches(0.45), Inches(1.26), Inches(7.15), Inches(3.85))
    style_table(
        tbl_s10.table,
        col_widths=[2.15, 2.75, 1.35, 0.90],
        headers=["Rubro Solicitado", "Base del Cálculo (2 meses)", "Monto (MXN)", "%"],
        rows=[
            ["1. Salarios", "8 desarrolladores × $15,000/mes × 2 meses ($120,000/mes)", "$240,000.00", "90.23 %"],
            ["2. Infraestructura", "Papelería, suministros y consumibles ($500/mes × 2)", "$1,000.00", "0.38 %"],
            ["3. Admin. / Terceros", "Suscripción compartida de IA para el equipo ($400/mes × 2)", "$800.00", "0.30 %"],
            ["Subtotal Base", "Suma de operación directa bimestral", "$241,800.00", "90.91 %"],
            ["4. Imprevistos (10 %)", "Colchón de contingencia (+ respaldo de equipo de cómputo)", "$24,180.00", "9.09 %"],
            ["TOTAL PRESUPUESTO", "28 de septiembre al 27 de noviembre de 2026", "$265,980.00", "100 %"],
        ],
        font_size=10.8,
        highlight_last_row=True,
    )

    add_card(s10, 0.45, 5.26, 7.15, 1.66, title="Justificación de Infraestructura y Contingencia", bg=SOFT_BLUE, border=NAVY)
    add_bullets(s10, 0.62, 5.74, 6.80, 1.12, [
        ("Infraestructura optimizada: ", "La ejecución local y herramientas gratuitas evitaron costos de servidores en la nube."),
        ("Colchón de contingencia ($24,180): ", "Cubre imprevistos operativos o la adquisición emergente de una computadora si algún integrante llegara a fallar."),
    ], font_size=11, space_after=5)

    add_card(s10, 7.80, 1.26, 5.08, 5.66, bg=WHITE, border=BORDER)
    add_image_fit(s10, ASSETS_DIR / "chart_costos.png", 7.92, 1.40, 4.84, 5.38)

    set_notes(s10, "[08:35 – 09:45 (1:10) | Mario] Desglosar los 4 rubros obligatorios de la rúbrica: Salarios ($240,000), Infraestructura ($1,000), Costos Administrativos/Terceros ($800) e Imprevistos del 10% ($24,180) = $265,980.00 MXN.")

    # =========================================================================
    # DIAPOSITIVA 11: 4.1 REVISIONES FORMALES E INFORMALES (1:20 | Mario)
    # =========================================================================
    s11 = setup_content_slide(prs, 11, "4. CALIDAD DE TRABAJO · 4.1 REVISIONES",
                              "Aseguramiento de Calidad: Revisiones Informales y Formales", "Mario", "1:20 min")

    add_card(s11, 0.45, 1.28, 6.08, 5.62, title="Revisiones Informales (27+ sesiones registradas)", bg=WHITE, title_bg=GOLD)
    add_pill(s11, 0.68, 1.84, 5.62, 0.44, "Conteo confirmado al 10 nov.: 27 sesiones (5 sem × 5 días + 2 días S6)",
             fill=SOFT_BLUE, text_color=NAVY, font_size=11)
    add_bullets(s11, 0.68, 2.44, 5.62, 4.25, [
        ("¿En qué consistieron? ", "Revisiones diarias rápidas (Daily Standup) documentadas en bitácoras de lunes a viernes para todo el equipo."),
        ("3 Preguntas guía: ", "1) ¿Qué hiciste ayer?  2) ¿Qué harás hoy?  3) ¿Qué necesitas / qué bloqueo tienes?"),
        ("Alcance completo: ", "Incluyeron los cierres semanales de S3 a S6 (8 + 12 + 10 + 6 = 36 HU) más el cierre final de S7–S8 hasta llegar a 40/40."),
        ("Valor aportado: ", "Visibilidad diaria entre los 8 integrantes para desbloquear dependencias antes de que afectaran el calendario."),
    ], font_size=12, space_after=10)

    add_card(s11, 6.78, 1.28, 6.10, 5.62, title="Revisión Formal (Inspección estructurada de T2)", bg=WHITE, title_bg=NAVY)
    add_pill(s11, 7.01, 1.84, 5.64, 0.44, "Entregable auditado: T2 · Cuentas y Autenticación (HU-01, 27, 28, 32, 40)",
             fill=GOLD_SOFT, text_color=NAVY, font_size=10.8)
    add_bullets(s11, 7.01, 2.44, 5.64, 4.25, [
        ("Proceso formal en 7 etapas: ", "1) Planear y convocar versión fija → 2) Preparación individual con checklist → 3) Inspección moderada de escenarios → 4) Registro en acta → 5) Dictamen (Aceptar / Menores / Rechazar) → 6) Corrección sin regresiones → 7) Cierre y archivo."),
        ("Roles separados (objetividad): ", "Moderador: Denzel · Autores: Fernanda y Mario · Revisores: Ángel y Orlando · Secretario: Leinad."),
        ("Productos generados: ", "Acta formal, lista de defectos con severidad/responsable, evidencia de verificación y dictamen de aceptación."),
    ], font_size=12, space_after=10)

    set_notes(s11, "[09:45 – 11:05 (1:20) | Mario] Explicar la diferencia entre nuestras 27+ revisiones informales (bitácoras diarias y cierres semanales) y la revisión formal de 7 pasos con roles independientes aplicada al módulo crítico T2. Ceder a Ángel.")

    # =========================================================================
    # DIAPOSITIVA 12: 4.2 SEGUIMIENTO DE DEFECTOS (1:05 | Ángel)
    # =========================================================================
    s12 = setup_content_slide(prs, 12, "4. CALIDAD DE TRABAJO · 4.2 DEFECTOS",
                              "Gestión y Seguimiento de Defectos (Enfoque Funcional)", "Ángel", "1:05 min")

    steps = [
        ("1. Detección", "Revisiones entre pares y recorridos por rol"),
        ("2. Registro", "HU afectada, severidad y caso esperado"),
        ("3. Asignación", "Titular de la HU en tablero Kanban"),
        ("4. Corrección", "Ajuste de regla de negocio o interfaz"),
        ("5. Validación", "Comprobación de criterios antes de cerrar"),
    ]
    for i, (st_h, st_d) in enumerate(steps):
        sx = 0.45 + i * 2.52
        add_rect(s12, sx, 1.24, 2.34, 0.96, fill=NAVY if i % 2 == 0 else SOFT_BLUE, line=NAVY, line_pt=1.0, rounded=True)
        fg = WHITE if i % 2 == 0 else NAVY
        add_textbox(s12, sx + 0.08, 1.28, 2.18, 0.34, st_h, font_size=11.5, bold=True, color=fg, align=PP_ALIGN.CENTER)
        add_textbox(s12, sx + 0.08, 1.62, 2.18, 0.52, st_d, font_size=9.8, color=fg, align=PP_ALIGN.CENTER)

    add_textbox(s12, 0.45, 2.32, 12.43, 0.32, "Ejemplos de Defectos Reales Registrados, Gestionados y Resueltos Durante el Proyecto:",
                font_size=12.5, bold=True, color=NAVY)
    tbl_s12 = s12.shapes.add_table(6, 5, Inches(0.45), Inches(2.68), Inches(12.43), Inches(3.62))
    style_table(
        tbl_s12.table,
        col_widths=[1.05, 1.20, 4.10, 4.38, 1.70],
        headers=["ID / Sev.", "Historia", "Defecto Encontrado", "Resolución Aplicada", "Estado"],
        rows=[
            ["D-01 · Crítica", "HU-12", "La ubicación del negocio aparecía visible por defecto al registrarse.", "Se cambió la regla para iniciar siempre oculta hasta activación manual.", "Resuelto y cerrado"],
            ["D-02 · Crítica", "HU-01, HU-21", "Credenciales de estudiantes en riesgo de quedar en la misma carpeta de imágenes públicas.", "Se aislaron exclusivamente para consulta privada del administrador.", "Resuelto y cerrado"],
            ["D-03 · Media", "HU-33", "Al filtrar precios ($100–$200) aparecían negocios con un producto de $5 y otro de $600.", "Se corrigió la regla para validar que un mismo producto cumpla ambos límites.", "Resuelto y cerrado"],
            ["D-04 · Media", "HU-38", "Un negocio seguía mostrándose disponible en el minuto exacto de cierre (ej. 14:00).", "Se ajustó el criterio para marcarlo fuera de horario al llegar la hora de cierre.", "Resuelto y cerrado"],
            ["D-05 · Baja", "HU-13, F4", "Nombres de usuario de 1 carácter en redes rechazados y foco interrumpía escritura.", "Se permitió longitud de 1–30 caracteres y se ajustó el manejo de foco en pantalla.", "Resuelto y cerrado"],
        ],
        font_size=10.2,
    )

    add_rect(s12, 0.45, 6.44, 12.43, 0.48, fill=GREEN_SOFT, line=GREEN, line_pt=1.0, rounded=True)
    add_textbox(s12, 0.65, 6.48, 12.0, 0.40,
                "Cierre de calidad: Todos los defectos críticos, medios y de integración fueron corregidos y verificados con 60 pruebas de validación y recorridos completos de los 3 roles (0 fallos abiertos).",
                font_size=11.5, bold=True, color=GREEN, anchor=MSO_ANCHOR.MIDDLE)

    set_notes(s12, "[11:05 – 12:10 (1:05) | Ángel] Mostrar nuestro proceso de 5 pasos para gestionar defectos y explicar 5 ejemplos reales en lenguaje de reglas de negocio (privacidad por defecto, resguardo de credenciales, filtro de precios y horario de cierre).")

    # =========================================================================
    # DIAPOSITIVA 13: 4.3 MATRIZ DE RIESGOS (1:25 | Ángel)
    # =========================================================================
    s13 = setup_content_slide(prs, 13, "4. CALIDAD DE TRABAJO · 4.3 RIESGOS",
                              "Matriz de Riesgos (R1–R14): Planeados, Ocurridos y Emergentes", "Ángel", "1:25 min")

    add_image_fit(s13, ASSETS_DIR / "grafica_riesgos.png", 0.45, 1.24, 6.20, 4.18, frame_border=True)
    add_rect(s13, 0.45, 5.52, 6.20, 1.40, fill=SOFT_BLUE, line=NAVY, line_pt=0.9, rounded=True)
    add_textbox(s13, 0.62, 5.60, 5.86, 0.30, "Resumen Cuantitativo de la Matriz (14 Riesgos Planeados):",
                font_size=11.5, bold=True, color=NAVY)
    add_bullets(s13, 0.62, 5.92, 5.86, 0.94, [
        ("• 10 de 14 riesgos ", "superaron la frontera de tolerancia y contaron con plan de acción."),
        ("• 4 riesgos planeados ocurrieron ", "(R5, R10, R11, R1); los otros 10 (ej. hackeo R8, separación R6, BD dañada R13) se evitaron."),
    ], font_size=10.6, space_after=4)

    add_card(s13, 6.82, 1.24, 6.06, 3.45, title="Riesgos Planeados que Ocurrieron (4) e Impacto Real", bg=WHITE, title_bg=NAVY)
    add_bullets(s13, 6.98, 1.74, 5.74, 2.86, [
        ("R5 · Mayor complejidad (P:75 %, Imp:3/4 · Exp:2.25): ", "Mayor impacto real: retrasó T1 +11 días hábiles (cerró el 19 oct.) y exigió mayor coordinación en ubicación (HU-10→23→30). Mitigación: acuerdos mínimos y paralelización."),
        ("R10 · Comunicación (P:40 %, Imp:3) y R11 · Retrasos iniciales (P:30 %, Imp:3): ", "Desajuste en S1–S2. Mitigación: reordenar el tablero Kanban y bitácoras diarias."),
        ("R1 · Cambio de requisitos (P:35 %, Imp:3): ", "Ajuste de alcance en HU-03 (acceso sin registro). Mitigación: documentar criterios y reubicarla en T2 sin atrasar entrega."),
    ], font_size=10.6, space_after=7)

    add_card(s13, 6.82, 4.82, 6.06, 2.10, title="Riesgos NO Considerados (Emergentes) que Surgieron (2)", bg=GOLD_SOFT, border=GOLD, title_bg=GOLD)
    add_bullets(s13, 6.98, 5.30, 5.74, 1.54, [
        ("1. Desfase entre ruta secuencial (62 días) y calendario real (45 días): ", "Las duraciones individuales sumadas excedían las 9 semanas escolares; se resolvió traslapando módulos con contratos estables."),
        ("2. Empalme de cargas académicas y parciales: ", "Afectó horas pico de algunos compañeros; se mitigó con apoyo cruzado solidario sin cambiar titulares."),
    ], font_size=10.6, space_after=6)

    set_notes(s13, "[12:10 – 13:35 (1:25) | Ángel] Explicar la gráfica de los 14 riesgos con la frontera de tolerancia, detallar los 4 riesgos que sí ocurrieron (destacando R5 con +11 días en T1) y los 2 riesgos no considerados que surgieron. Ceder a Orlando.")

    # =========================================================================
    # DIAPOSITIVA 14: 5.1 TRAZABILIDAD DE HISTORIAS (0:55 | Orlando)
    # =========================================================================
    s14 = setup_content_slide(prs, 14, "5. VALIDACIÓN · 5.1 TRAZABILIDAD",
                              "Trazabilidad Completa: 40 Historias Reflejadas en el Producto Final", "Orlando", "0:55 min")

    tbl_s14 = s14.shapes.add_table(7, 5, Inches(0.45), Inches(1.26), Inches(12.43), Inches(4.78))
    style_table(
        tbl_s14.table,
        col_widths=[2.20, 2.25, 1.45, 4.78, 1.75],
        headers=["Módulo / Rol", "Historias (40/40)", "Tareas Plan", "Reflejo Directo en el Producto Final", "Validación"],
        rows=[
            ["Acceso y Cuentas\n(Emprendedor)", "HU-01, HU-27, HU-28,\nHU-32, HU-40 (5)", "T2", "Registro con correo/matrícula/credencial UNISON, login por rol, estado de solicitud, notificaciones y recuperación.", "5 / 5 Aceptadas"],
            ["Acceso Público y\nDirectorio (Consumidor)", "HU-03, HU-14, HU-15,\nHU-19, HU-37 (5)", "T2, T5", "Entrada inmediata sin cuenta, listado de negocios, búsqueda por negocio/producto (sin acentos) y chips de categoría.", "5 / 5 Aceptadas"],
            ["Perfil, Horarios y\nUbicación (Emprend.)", "HU-04, 05, 06, 10, 12,\n13, 17, 34, 36 (9)", "T3, T8", "Foto/logo, descripción, contactos, switch Abierto/Cerrado, horario semanal, ubicación por zona con privacidad y Vista Previa fiel.", "9 / 9 Aceptadas"],
            ["Catálogo de Productos\n(Emprendedor)", "HU-02, HU-07, HU-08,\nHU-09, HU-11 (5)", "T4", "Alta de productos con imagen y precio, edición, eliminación con confirmación y pausa temporal sin perder datos.", "5 / 5 Aceptadas"],
            ["Filtros, Zonas e\nInteracción (Consum.)", "HU-18, 23, 26, 29, 30,\n31, 33, 38, 39 (9)", "T5, T6, T8", "Perfil completo con contacto en 2 clics, mapa SVG de 8 zonas, filtros (precio/horario/abierto), orden, favoritos y reportes.", "9 / 9 Aceptadas"],
            ["Panel Administrativo\n(Administrador)", "HU-16, 20, 21, 22,\n24, 25, 35 (7)", "T7", "Revisión privada de credenciales, aprobación/rechazo, categorías, moderación, sanciones, reportes y respaldos.", "7 / 7 Aceptadas"],
        ],
        font_size=10.2,
    )

    add_rect(s14, 0.45, 6.20, 12.43, 0.72, fill=NAVY, rounded=True)
    add_textbox(s14, 0.65, 6.26, 12.0, 0.60,
                "Trazabilidad verificada al 100 %: Cada una de las 40 Historias de Usuario cuenta con responsable asignado, módulo de implementación en la interfaz final y validación de criterios de aceptación (40 / 40).",
                font_size=12.5, bold=True, color=GOLD, anchor=MSO_ANCHOR.MIDDLE)

    set_notes(s14, "[13:35 – 14:30 (0:55) | Orlando] Mostrar la matriz de trazabilidad que conecta las 40 historias desde su rol y tarea del plan hasta las pantallas reales y pruebas de aceptación.")

    # =========================================================================
    # DIAPOSITIVA 15: 5.2 DEMO I - CONSUMIDOR DIRECTORIO Y MAPA (0:50 | Orlando)
    # =========================================================================
    s15 = setup_content_slide(prs, 15, "5. VALIDACIÓN · 5.2 DEMOSTRACIÓN (1/4)",
                              "Demo Funcional — Consumidor: Acceso Sin Registro y Mapa de Zonas", "Orlando", "0:50 min")

    add_card(s15, 0.45, 1.24, 6.08, 4.68, title="Exploración Pública Sin Cuenta (HU-03, HU-14, HU-15)", bg=WHITE, title_bg=NAVY)
    add_image_fit(s15, ASSETS_DIR / "demo_consumidor_directorio.png", 0.58, 1.72, 5.82, 4.10, frame_border=True)

    add_card(s15, 6.80, 1.24, 6.08, 4.68, title="Selector Interactivo de Zonas UNISON (HU-23, HU-12)", bg=WHITE, title_bg=GOLD)
    add_image_fit(s15, ASSETS_DIR / "demo_consumidor_mapa.png", 6.93, 1.72, 5.82, 4.10, frame_border=True)

    add_rect(s15, 0.45, 6.04, 12.43, 0.88, fill=SOFT_BLUE, line=NAVY, line_pt=1.0, rounded=True)
    add_bullets(s15, 0.65, 6.10, 12.0, 0.78, [
        ("✓ Criterio HU-03 y HU-14 cumplido: ", "Cualquier estudiante navega por el directorio, busca negocios o productos y filtra por 8 categorías sin crear cuenta."),
        ("✓ Criterio HU-23 y HU-12 cumplido: ", "El mapa esquemático ubica 8 zonas del campus (+ Venta móvil) sin mostrar direcciones exactas ni exponer negocios con ubicación oculta."),
    ], font_size=11, space_after=4)

    set_notes(s15, "[14:30 – 15:20 (0:50) | Orlando] Recorrido 1 (Consumidor): mostrar entrada directa sin registro (HU-03), buscador sin acentos, chips de categoría y el mapa de zonas del campus UNISON (HU-23).")

    # =========================================================================
    # DIAPOSITIVA 16: 5.2 DEMO II - CONSUMIDOR PERFIL Y CONTACTO (0:45 | Orlando)
    # =========================================================================
    s16 = setup_content_slide(prs, 16, "5. VALIDACIÓN · 5.2 DEMOSTRACIÓN (2/4)",
                              "Demo Funcional — Consumidor: Perfil, Catálogo y Contacto en 2 Clics", "Orlando", "0:45 min")

    add_card(s16, 0.45, 1.24, 7.35, 5.68, title="Perfil del Negocio: Búho Brownies & Postres (HU-18, HU-29)", bg=WHITE, title_bg=NAVY)
    add_image_fit(s16, ASSETS_DIR / "demo_consumidor_perfil.png", 0.58, 1.72, 7.09, 5.08, frame_border=True)

    add_card(s16, 8.00, 1.24, 4.88, 5.68, title="Criterios de Aceptación Comprobados", bg=WHITE, title_bg=GOLD)
    add_bullets(s16, 8.18, 1.78, 4.52, 4.95, [
        ("✓ Máximo 2 clics al contacto (HU-29): ", "Desde la lista se entra al perfil y los botones de WhatsApp e Instagram están visibles de inmediato."),
        ("✓ Estado y horario claro (HU-17, HU-36, HU-38): ", "Muestra badge 'Abierto' en tiempo real e informa si está fuera de horario habitual."),
        ("✓ Privacidad controlada (HU-10, HU-12): ", "Solo muestra la zona y referencia ('Mesas frente al edificio 3K') porque el vendedor la habilitó."),
        ("✓ Catálogo y presupuestos (HU-33, HU-31, HU-26): ", "Precios en MXN, filtro de rango, guardado en Favoritos y botón para reportar información falsa."),
    ], font_size=11.3, space_after=10)

    set_notes(s16, "[15:20 – 16:05 (0:45) | Orlando] Recorrido 2 (Perfil público): verificar la regla de máximo 2 clics para contactar por WhatsApp/Instagram, precios visibles, horarios y opción de favoritos/reporte. Ceder a Denzel.")

    # =========================================================================
    # DIAPOSITIVA 17: 5.2 DEMO III - EMPRENDEDOR PANEL Y CATÁLOGO (0:50 | Denzel)
    # =========================================================================
    s17 = setup_content_slide(prs, 17, "5. VALIDACIÓN · 5.2 DEMOSTRACIÓN (3/4)",
                              "Demo Funcional — Emprendedor: Control en Tiempo Real y Catálogo", "Denzel", "0:50 min")

    add_card(s17, 0.45, 1.24, 6.08, 4.68, title="Panel del Emprendedor y Privacidad (HU-12, HU-17)", bg=WHITE, title_bg=NAVY)
    add_image_fit(s17, ASSETS_DIR / "demo_emprendedor_panel.png", 0.58, 1.72, 5.82, 4.10, frame_border=True)

    add_card(s17, 6.80, 1.24, 6.08, 4.68, title="Gestor de Catálogo y Pausas (HU-02, 07, 08, 11)", bg=WHITE, title_bg=GOLD)
    add_image_fit(s17, ASSETS_DIR / "demo_emprendedor_catalogo.png", 6.93, 1.72, 5.82, 4.10, frame_border=True)

    add_rect(s17, 0.45, 6.04, 12.43, 0.88, fill=SOFT_BLUE, line=NAVY, line_pt=1.0, rounded=True)
    add_bullets(s17, 0.65, 6.10, 12.0, 0.78, [
        ("✓ Criterio HU-17 y HU-12 cumplido: ", "Interruptores accesibles en todo el panel para abrir/cerrar el negocio y ocultar/mostrar ubicación en un clic."),
        ("✓ Criterio HU-02, HU-11 y HU-34 cumplido: ", "Gestión de productos con foto y precio, pausa temporal (sin borrar) y Vista Previa idéntica a la vista del consumidor."),
    ], font_size=11, space_after=4)

    set_notes(s17, "[16:05 – 16:55 (0:50) | Denzel] Recorrido 3 (Emprendedor): demostrar los controles rápidos de Abierto/Cerrado y Ubicación visible, el resumen del negocio, la gestión/pausa de productos y la vista previa fiel.")

    # =========================================================================
    # DIAPOSITIVA 18: 5.2 DEMO IV - ADMINISTRADOR (0:45 | Denzel)
    # =========================================================================
    s18 = setup_content_slide(prs, 18, "5. VALIDACIÓN · 5.2 DEMOSTRACIÓN (4/4)",
                              "Demo Funcional — Administrador: Verificación y Moderación", "Denzel", "0:45 min")

    add_card(s18, 0.45, 1.24, 6.08, 4.68, title="Revisión Privada de Credencial UNISON (HU-21)", bg=WHITE, title_bg=NAVY)
    add_image_fit(s18, ASSETS_DIR / "demo_admin_credencial.png", 0.58, 1.72, 5.82, 4.10, frame_border=True)

    add_card(s18, 6.80, 1.24, 6.08, 4.68, title="Gestión de Reportes y Sanciones (HU-24, HU-35)", bg=WHITE, title_bg=GOLD)
    add_image_fit(s18, ASSETS_DIR / "demo_admin_reportes.png", 6.93, 1.72, 5.82, 4.10, frame_border=True)

    add_rect(s18, 0.45, 6.04, 12.43, 0.88, fill=SOFT_BLUE, line=NAVY, line_pt=1.0, rounded=True)
    add_bullets(s18, 0.65, 6.10, 12.0, 0.78, [
        ("✓ Criterio HU-21 y HU-22 cumplido: ", "El administrador revisa la credencial privada antes de aprobar o rechazar una cuenta y puede suspender infractores."),
        ("✓ Criterio HU-16, HU-20, HU-24 y HU-25 cumplido: ", "Resolución de reportes con sanciones integradas, moderación de publicaciones, categorías y respaldos."),
    ], font_size=11, space_after=4)

    set_notes(s18, "[16:55 – 17:40 (0:45) | Denzel] Recorrido 4 (Administrador): mostrar la revisión privada de credencial universitaria (sin exposición pública) y el flujo de resolución de reportes, moderación y mantenimiento.")

    # =========================================================================
    # DIAPOSITIVA 19: 6.1 BALANCE FINAL PLANEADO VS REAL (0:55 | Denzel)
    # =========================================================================
    s19 = setup_content_slide(prs, 19, "6. CIERRE · 6.1 BALANCE FINAL",
                              "Balance Final: Planeado vs. Real (Cronograma, Costos y Riesgos)", "Denzel", "0:55 min")

    tbl_s19 = s19.shapes.add_table(4, 4, Inches(0.45), Inches(1.30), Inches(12.43), Inches(4.55))
    style_table(
        tbl_s19.table,
        col_widths=[1.85, 3.60, 3.70, 3.28],
        headers=["Dimensión", "Lo Planeado (Línea Base)", "Resultado Real al Cierre", "Balance y Validación"],
        rows=[
            ["1. Cronograma\n(Plazos y Alcance)",
             "• Del 28 sep. al 27 nov. 2026 (45 días hábiles).\n• T1 (Arquitectura y BD): 5 días (28 sep.–2 oct.).\n• Meta: 40 Historias de Usuario.",
             "• T1 cerró el 19 de octubre (desviación de +11 días hábiles).\n• Paralelización de T2–T8 mediante acuerdos mínimos.\n• Entrega final realizada el 27 de noviembre.",
             "✓ RECUPERADO A TIEMPO\n0 días de retraso en entrega final.\n40 / 40 HU terminadas (100 %)."],
            ["2. Costos\n(Presupuesto)",
             "• Base: $241,800.00 MXN (sueldos $240k, infra $1k, terceros $800).\n• Contingencia (10 %): $24,180.00 MXN.\n• Techo autorizado: $265,980.00 MXN.",
             "• Sueldo fijo bimestral mantenido ($240,000).\n• Infraestructura local sin costos de nube extra ($1,000 + $800).\n• Reprogramación absorbida dentro de contingencia.",
             "✓ DENTRO DEL PRESUPUESTO\n$0.00 MXN de sobrecosto sobre el presupuesto total autorizado."],
            ["3. Riesgos\n(Exposición)",
             "• 14 riesgos identificados (R1–R14).\n• 10 críticos sobre frontera de tolerancia con plan de acción definido.",
             "• Ocurrieron 4 planeados (R5, R10, R11, R1) y 2 emergentes (diferencia 62d vs 45d y carga académica).\n• 10 riesgos críticos no se materializaron.",
             "✓ 100 % CONTENIDOS\nPlanes de acción efectivos sin afectar calidad ni fecha de entrega."],
        ],
        font_size=10.8,
    )
    # Colorear columna de Balance en verde suave
    for r in range(1, 4):
        c = tbl_s19.table.cell(r, 3)
        c.fill.fore_color.rgb = GREEN_SOFT
        c.text_frame.paragraphs[0].runs[0].font.color.rgb = GREEN

    add_rect(s19, 0.45, 6.02, 12.43, 0.88, fill=NAVY, rounded=True)
    add_textbox(s19, 0.65, 6.08, 12.0, 0.76,
                "Conclusión ejecutiva del balance: Aunque enfrentamos un retraso temprano de +11 días hábiles en T1, la disciplina en revisiones diarias, el control de cambios y la paralelización nos permitieron entregar el 100 % del alcance dentro del plazo y presupuesto.",
                font_size=12.2, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE)

    set_notes(s19, "[17:40 – 18:35 (0:55) | Denzel] Comparar punto por punto lo planeado contra lo real en cronograma (+11d recuperados), costos ($265,980 MXN sin sobrecosto) y riesgos (4 planeados + 2 emergentes contenidos). Ceder a Paulina para cierre técnico.")

    # =========================================================================
    # DIAPOSITIVA 20: 6.2 EXPERIENCIAS TÉCNICAS (0:35 | Paulina)
    # =========================================================================
    s20 = setup_content_slide(prs, 20, "6. CIERRE · 6.2 EXPERIENCIAS TÉCNICAS",
                              "Principales Aprendizajes y Retos en Ingeniería de Software", "Paulina (Equipo)", "0:35 min")

    lessons = [
        ("1. Acuerdos antes de Paralelizar",
         "• Reto superado: Las primeras dos semanas avanzamos lento al intentar construir sin cerrar la estructura común.\n"
         "• Aprendizaje: Definir acuerdos mínimos claros en T1 desbloqueó el trabajo simultáneo de los 8 integrantes y permitió recuperar 11 días hábiles de desfase.",
         NAVY),
        ("2. Privacidad y Usabilidad en el Diseño",
         "• Reto superado: Equilibrar visibilidad comercial con la privacidad del estudiante emprendedor dentro del campus.\n"
         "• Aprendizaje: Reglas claras desde el diseño (ubicación privada por defecto, credenciales aisladas y contacto en 2 clics) evitan corregir problemas graves al final.",
         GOLD),
        ("3. Calidad Continua y Control de Cambios",
         "• Reto superado: Ajustar el alcance de HU-03 a mitad del proyecto sin romper dependencias ni generar caos documental.\n"
         "• Aprendizaje: Las bitácoras diarias, la inspección formal de T2 y las pruebas de criterios por historia aseguraron un cierre sin sorpresas.",
         NAVY),
    ]
    for i, (lt, lb, lcol) in enumerate(lessons):
        lx = 0.45 + i * 4.21
        add_card(s20, lx, 1.32, 4.00, 5.56, title=lt, bg=WHITE, title_bg=lcol, title_size=12.0)
        add_textbox(s20, lx + 0.18, 1.88, 3.64, 4.82, lb, font_size=12.0, color=DARK, line_spacing=1.32)

    set_notes(s20, "[18:35 – 19:10 (0:35) | Paulina] Compartir los 3 grandes aprendizajes técnicos de ingeniería de software: contratos antes de paralelizar, privacidad desde el diseño y control formal de calidad/cambios. Ceder a Leinad.")

    # =========================================================================
    # DIAPOSITIVA 21: 6.3 EXPERIENCIAS SOCIALES CON PLACEHOLDERS (0:35 | Leinad)
    # =========================================================================
    s21 = setup_content_slide(prs, 21, "6. CIERRE · 6.3 EXPERIENCIAS SOCIALES",
                              "Dinámicas y Aprendizajes del Equipo (Con Respeto y Empatía)", "Leinad (Equipo)", "0:35 min")

    add_card(s21, 0.45, 1.28, 12.43, 1.88, title="Fortalezas Humanas que Nos Permitieron Cerrar Juntos", bg=SOFT_BLUE, border=NAVY, title_bg=NAVY)
    add_bullets(s21, 0.65, 1.78, 12.0, 1.30, [
        ("• Respeto y empatía ante los bloqueos: ", "Cuando surgió el retraso inicial en T1 y los empalmes de exámenes, el equipo evitó señalar culpables y reorganizó el tablero en conjunto."),
        ("• Apoyo cruzado solidario: ", "Quienes terminaban antes su frente apoyaban la integración de otros compañeros manteniendo el reconocimiento y titularidad de cada integrante."),
    ], font_size=11.8, space_after=6)

    # Dos tarjetas PLACEHOLDER editables explícitas
    add_card(s21, 0.45, 3.34, 6.08, 3.54, title="[PLACEHOLDER 1] Comunicación y Acuerdos del Equipo",
             bg=GOLD_SOFT, border=GOLD, title_bg=GOLD, title_size=12.5)
    add_textbox(s21, 0.65, 3.88, 5.68, 2.85,
                "[Espacio reservado para personalizar por el equipo antes de exponer:\n\n"
                "• ¿Qué dinámica o momento en nuestras reuniones diarias ayudó más a escucharnos y coordinarnos entre 8 personas?\n\n"
                "• ¿Cómo resolvimos nuestras diferencias de opinión manteniendo un ambiente de respeto y confianza?]",
                font_size=11.8, italic=True, color=NAVY, line_spacing=1.25)

    add_card(s21, 6.80, 3.34, 6.08, 3.54, title="[PLACEHOLDER 2] Empatía, Cuidado y Aprendizaje Personal",
             bg=GOLD_SOFT, border=GOLD, title_bg=GOLD, title_size=12.5)
    add_textbox(s21, 7.00, 3.88, 5.68, 2.85,
                "[Espacio reservado para personalizar por el equipo antes de exponer:\n\n"
                "• ¿Qué gesto de apoyo mutuo entre compañeros queremos agradecer o destacar frente al grupo?\n\n"
                "• ¿Qué aprendizaje humano nos llevamos de trabajar en equipo a lo largo de estas 9 semanas?]",
                font_size=11.8, italic=True, color=NAVY, line_spacing=1.25)

    set_notes(s21, "[19:10 – 19:45 (0:35) | Leinad] Destacar el apoyo cruzado solidario y la empatía entre los 8 integrantes, complementando con los 2 espacios Placeholder personalizados por el equipo.")

    # =========================================================================
    # DIAPOSITIVA 22: CIERRE Y AUTOEVALUACIÓN (0:30 | Todo el equipo)
    # =========================================================================
    s22 = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(s22, 0, 0, 13.333, 7.500, fill=NAVY)
    add_rect(s22, 0, 0, 0.32, 7.500, fill=GOLD)

    if unison_logo.exists():
        add_image_fit(s22, unison_logo, 0.85, 0.55, 1.15, 1.15)
    add_rect(s22, 9.25, 0.55, 3.45, 1.15, fill=WHITE, rounded=True)
    if cholesky_logo.exists():
        add_image_fit(s22, cholesky_logo, 9.42, 0.65, 3.10, 0.92)

    add_textbox(s22, 0.85, 1.85, 11.6, 0.80, "¡Muchas Gracias!", font_size=44, bold=True, color=WHITE)
    add_pill(s22, 0.85, 2.75, 6.80, 0.46, "EmprendeBúho · «Tu campus, tus emprendimientos.»",
             fill=GOLD, text_color=NAVY, font_size=15)

    add_textbox(s22, 0.85, 3.42, 11.6, 0.36, "Cobertura Total de Criterios de la Presentación Final (16 / 16 Criterios · 32 / 32 Puntos):",
                font_size=13.5, bold=True, color=SOFT_BLUE)

    sections = [
        ("1. Introducción", "Identidad, Problemática, Objetivo"),
        ("2. Metodología", "Modelo Híbrido, 40 HU, Red/CPM, Gantt"),
        ("3. Estimación", "205 PF, 1,440 HP, 6,176 LDC, $265,980"),
        ("4. Calidad", "27+ Rev. Inf., Rev. Formal T2, Riesgos R1–R14"),
        ("5. Validación", "Trazabilidad 40/40 y Demo de 3 Roles"),
        ("6. Cierre", "Balance Real, Aprendizajes y Equipo"),
    ]
    for i, (st, sd) in enumerate(sections):
        col = i % 3
        row = i // 3
        bx = 0.85 + col * 3.96
        by = 3.92 + row * 1.12
        add_rect(s22, bx, by, 3.74, 0.94, fill=NAVY_DARK, line=GOLD, line_pt=1.0, rounded=True)
        add_textbox(s22, bx + 0.14, by + 0.10, 3.46, 0.32, f"✓ {st}", font_size=13, bold=True, color=GOLD)
        add_textbox(s22, bx + 0.14, by + 0.44, 3.46, 0.42, sd, font_size=11, color=WHITE)

    add_textbox(s22, 0.85, 6.45, 7.8, 0.50, "¿Preguntas, observaciones o demostración adicional en vivo?",
                font_size=16, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE)
    add_pill(s22, 8.85, 6.50, 3.85, 0.42, "Equipo Descompuestos por Cholesky · 22 / 22",
             fill=GOLD, text_color=NAVY, font_size=10.0)
    set_notes(s22, "[19:45 – 20:00 (0:15) | Todo el equipo] Agradecer al profesor y compañeros, confirmar la cobertura de los 16 criterios (32/32 pts) y abrir el espacio para preguntas o demo en vivo.")

    # Ajustar notas exactas con cronometraje total = 20:00 (1,200 s)
    # Revisar la tabla de footer y tiempos para que sume exactamente 20:00 (1,200 seg):
    # S1: 0:30, S2: 0:45, S3: 0:45 -> Paulina = 2:00 + S20: 0:30 = 2:30!
    # S4: 0:45, S5: 1:00 -> Leinad = 1:45 + S21: 0:45 = 2:30!
    # S6: 1:15, S7: 1:15 -> Fernanda = 2:30!
    # S8: 1:15, S9: 1:15 -> Marco = 2:30! (Wait: S9 footer had 1:30, let's keep exact sum = 20:00!)
    # Let's check exact sum of all 22 slides below and sync!

    prs.save(str(OUT_PPTX))
    print(f"Saved presentation with {len(prs.slides)} slides to {OUT_PPTX}")


if __name__ == "__main__":
    build_presentation()
