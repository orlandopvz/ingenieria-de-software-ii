import os
from pathlib import Path
import shutil
import numpy as np
from PIL import Image
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

REPO_ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = Path(__file__).resolve().parent / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

# Colores institucionales UNISON (respetando RNF-04: nunca dorado como texto sobre blanco)
NAVY = "#002D62"
NAVY_LIGHT = "#1E4B85"
GOLD = "#F2A900"
GOLD_SOFT = "#FEF3C7"
SOFT_BLUE = "#EDF3F8"
SLATE = "#475569"
DARK = "#0F172A"
GREEN = "#15803D"
GREEN_SOFT = "#DCFCE7"
RED = "#DC2626"
RED_SOFT = "#FEE2E2"
BORDER = "#CBD5E1"


def prepare_logos():
    unison_src = REPO_ROOT / "frontend" / "src" / "assets" / "unison-logo.png"
    unison_dst = ASSETS_DIR / "unison-logo.png"
    if unison_src.exists():
        shutil.copy2(unison_src, unison_dst)

    cholesky_dst = ASSETS_DIR / "logo_cholesky.png"
    rgb_path = Path("/Users/urias/.gemini/antigravity/brain/d30dd153-1ff6-45fd-8595-672dcf1c37a9/scratch/pdf_imgs/img-002.png")
    mask_path = Path("/Users/urias/.gemini/antigravity/brain/d30dd153-1ff6-45fd-8595-672dcf1c37a9/scratch/pdf_imgs/img-003.png")
    if rgb_path.exists() and mask_path.exists():
        rgb = Image.open(rgb_path).convert("RGB")
        alpha = Image.open(mask_path).convert("L")
        if alpha.size != rgb.size:
            alpha = alpha.resize(rgb.size, Image.Resampling.LANCZOS)
        rgba = rgb.copy()
        rgba.putalpha(alpha)
        bbox = rgba.getbbox()
        if bbox:
            rgba = rgba.crop(bbox)
        rgba.save(cholesky_dst)
        print("Saved", cholesky_dst)


def chart_red_ruta_critica():
    fig, ax = plt.subplots(figsize=(11.8, 5.1), dpi=240)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    ax.set_xlim(0, 12.6)
    ax.set_ylim(-0.35, 5.35)
    ax.axis("off")

    nodes = {
        "T1": (0.90, 2.75, "T1\nArq. y BD\n5 días", True, "Leinad · Denzel"),
        "T2": (2.65, 2.75, "T2\nCuentas\n10 días", True, "Mario · Fernanda"),
        "T3": (4.40, 2.75, "T3\nPerfil\n10 días", True, "Ángel · Orlando"),
        "T4": (6.20, 2.75, "T4\nCatálogo\n10 días", True, "Marco · Paulina"),
        "T8": (6.20, 4.45, "T8\nUbicación\n8 días", False, "Holgura: 2 días"),
        "T7": (4.40, 1.05, "T7\nAdmin.\n10 días", False, "Holgura: 30 días"),
        "T5": (8.00, 2.75, "T5\nBúsqueda\n15 días", True, "Leinad · Denzel"),
        "T6": (9.75, 2.75, "T6\nInteracción\n5 días", True, "Marco · Paulina"),
        "T9": (11.55, 2.75, "T9\nPruebas\n7 días", True, "Todo el equipo"),
    }

    edges = [
        ("T1", "T2", True),
        ("T2", "T3", True),
        ("T2", "T7", False),
        ("T3", "T4", True),
        ("T3", "T8", False),
        ("T4", "T5", True),
        ("T8", "T5", False),
        ("T5", "T6", True),
        ("T6", "T9", True),
        ("T7", "T9", False),
    ]

    box_w, box_h = 1.28, 0.98

    def anchor(src, dst):
        x1, y1 = nodes[src][0], nodes[src][1]
        x2, y2 = nodes[dst][0], nodes[dst][1]
        dx, dy = x2 - x1, y2 - y1
        if abs(dx) >= abs(dy):
            sx = x1 + (box_w / 2 if dx > 0 else -box_w / 2)
            sy = y1 + (box_h / 4 if dy > 0.3 else (-box_h / 4 if dy < -0.3 else 0))
            ex = x2 - (box_w / 2 if dx > 0 else -box_w / 2)
            ey = y2 - (box_h / 4 if dy > 0.3 else (-box_h / 4 if dy < -0.3 else 0))
        else:
            sx, sy = x1, y1 + (box_h / 2 if dy > 0 else -box_h / 2)
            ex, ey = x2, y2 - (box_h / 2 if dy > 0 else -box_h / 2)
        return (sx, sy), (ex, ey)

    for src, dst, critical in edges:
        p1, p2 = anchor(src, dst)
        arr = FancyArrowPatch(
            p1, p2,
            arrowstyle="-|>,head_length=7,head_width=4.5",
            linewidth=2.8 if critical else 1.7,
            color="#D97706" if critical else "#64748B",
            zorder=2,
        )
        ax.add_patch(arr)

    for key, (x, y, label, critical, sub) in nodes.items():
        fill = GOLD if critical else SOFT_BLUE
        edge_col = NAVY
        lw = 2.4 if critical else 1.5
        rect = FancyBboxPatch(
            (x - box_w / 2, y - box_h / 2),
            box_w, box_h,
            boxstyle="round,pad=0.06,rounding_size=0.12",
            facecolor=fill, edgecolor=edge_col, linewidth=lw, zorder=3
        )
        ax.add_patch(rect)
        ax.text(x, y + 0.02, label, ha="center", va="center", fontsize=8.8,
                fontweight="bold", color=NAVY, zorder=4, linespacing=1.22)
        badge_bg = "#FEF9C3" if critical else "#E2E8F0"
        ax.text(x, y - box_h / 2 - 0.23, sub, ha="center", va="center", fontsize=7.5,
                fontweight="bold" if not critical else "normal",
                color=NAVY if not critical else SLATE,
                bbox=dict(boxstyle="round,pad=0.18", facecolor=badge_bg, edgecolor="none"))

    # Leyenda inferior bien separada de T7
    ax.add_patch(FancyBboxPatch((0.25, -0.26), 12.1, 0.44, boxstyle="round,pad=0.04,rounding_size=0.08",
                                facecolor="#F8FAFC", edgecolor=BORDER, linewidth=1))
    ax.text(6.3, -0.04,
            "Ruta Crítica (A): T1→T2→T3→T4→T5→T6→T9 = 62 días (Holgura: 0 d)  |  "
            "Ruta B (por T8): 60 días (Holgura: 2 d)  |  Ruta C (por T7): 32 días (Holgura: 30 d)",
            ha="center", va="center", fontsize=8.3, fontweight="bold", color=NAVY)

    plt.tight_layout(pad=0.2)
    out = ASSETS_DIR / "red_ruta_critica.png"
    plt.savefig(out, dpi=240, facecolor="white")
    plt.close(fig)
    print("Saved", out)


def chart_gantt_comparativo():
    # Calendario de 9 semanas hábiles (28 sep = día 0 al 27 nov = día 45)
    # Conteo de días hábiles lunes a viernes desde 28/09/2026:
    # S1 (28 sep-2 oct): 0..5 | S2 (5-9 oct): 5..10 | S3 (12-16 oct): 10..15 | S4 (19-23 oct): 15..20
    # S5 (26-30 oct): 20..25 | S6 (2-6 nov): 25..30 | S7 (9-13 nov): 30..35 | S8 (16-20 nov): 35..40 | S9 (23-27 nov): 40..45
    tasks = [
        ("T1: Arq. y BD",            0,  5,  6, 16, "Cierre real 19 oct (+11 d)"),
        ("T2: Cuentas y Acceso*",    5, 11, 15, 37, "Cuentas S4 + HU-03 S8"),
        ("T3: Perfil Emprendimiento",11, 19, 16, 35, "Vista previa en S7"),
        ("T4: Catálogo y Productos", 19, 25, 19, 25, "Cumplida en S5"),
        ("T5: Exploración y Filtros",25, 36, 23, 40, "Cierre cercanía en S8"),
        ("T6: Interacción Consum.",  36, 40, 25, 29, "Adelantada en S6"),
        ("T7: Administración",       11, 19, 17, 35, "Reportes/Mant. en S7"),
        ("T8: Ubicación Campus",     19, 25, 18, 40, "Privacidad S5 + Zonas S8"),
        ("T9: Pruebas y Entrega",    40, 45, 30, 45, "Entrega puntual 27 nov"),
    ]

    fig, ax = plt.subplots(figsize=(11.5, 4.7), dpi=240)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("#FAFCFF")

    y_pos = np.arange(len(tasks))[::-1]
    for idx, (name, o_start, o_end, r_start, r_end, note) in enumerate(tasks):
        y = y_pos[idx]
        # Plan Original (barra superior delgada)
        ax.barh(y + 0.17, o_end - o_start, left=o_start, height=0.28,
                color="#CBD5E1", edgecolor="#64748B", linewidth=0.9,
                label="Plan Original (Línea Base)" if idx == 0 else "")
        # Ejecución Real / Recuperación (barra inferior)
        bar_col = GOLD if idx == 0 else (GREEN if idx == 8 else NAVY)
        edge_col = NAVY if idx == 0 else bar_col
        ax.barh(y - 0.17, r_end - r_start, left=r_start, height=0.30,
                color=bar_col, edgecolor=edge_col, linewidth=1.0,
                label="Ejecución Real / Recuperación" if idx == 1 else "")
        # Etiqueta breve a la derecha si cabe, o dentro
        txt_x = max(o_end, r_end) + 0.45
        if txt_x > 39:
            ax.text(r_start - 0.45, y - 0.17, note, va="center", ha="right",
                    fontsize=7.6, color=NAVY, fontweight="bold")
        else:
            ax.text(txt_x, y - 0.17, note, va="center", ha="left",
                    fontsize=7.6, color=NAVY, fontweight="bold")

    ax.set_yticks(y_pos)
    ax.set_yticklabels([t[0] for t in tasks], fontsize=9.2, fontweight="bold", color=DARK)
    week_ticks = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45]
    week_labels = ["28 sep", "5 oct", "12 oct", "19 oct", "26 oct", "2 nov", "9 nov", "16 nov", "23 nov", "27 nov"]
    ax.set_xticks(week_ticks)
    ax.set_xticklabels(week_labels, fontsize=8.4, color=DARK, fontweight="bold")
    ax.set_xlim(0, 46.5)
    ax.grid(axis="x", linestyle="--", alpha=0.45, color="#94A3B8")
    ax.axvline(16, color="#D97706", linestyle=":", linewidth=1.6)
    ax.text(16.2, len(tasks) - 0.35, "Cierre real T1 (19 oct)", fontsize=7.8, fontweight="bold", color="#B45309")
    ax.axvline(45, color=GREEN, linestyle="-", linewidth=1.8)

    p1 = mpatches.Patch(facecolor="#CBD5E1", edgecolor="#64748B", label="Cronograma Original (Línea Base)")
    p2 = mpatches.Patch(facecolor=NAVY, label="Ejecución Real / Paralelización de Recuperación")
    p3 = mpatches.Patch(facecolor=GOLD, edgecolor=NAVY, label="Desviación T1 (+11 días hábiles)")
    p4 = mpatches.Patch(facecolor=GREEN, label="Entrega Final Puntual (27 nov)")
    ax.legend(handles=[p1, p2, p3, p4], loc="upper right", bbox_to_anchor=(1.0, 1.13),
              ncol=4, frameon=False, fontsize=8.0)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    plt.tight_layout(pad=0.3)
    out = ASSETS_DIR / "gantt_comparativo.png"
    plt.savefig(out, dpi=240, facecolor="white")
    plt.close(fig)
    print("Saved", out)


def chart_esfuerzo_hu():
    fig, ax1 = plt.subplots(figsize=(6.2, 4.1), dpi=240)
    fig.patch.set_facecolor("white")
    ax1.set_facecolor("#FAFCFF")

    cats = ["Complejidad Baja\n(15 HU · Peso 1)", "Complejidad Media\n(19 HU · Peso 2)", "Complejidad Alta\n(6 HU · Peso 3)"]
    hp_hu = [20.3, 40.6, 60.8]
    cost_hu = [3746.20, 7492.39, 11238.59]
    x = np.arange(len(cats))
    width = 0.36

    b1 = ax1.bar(x - width/2, hp_hu, width, color=NAVY, label="Horas-Persona / HU")
    ax1.set_ylabel("Horas-Persona (HP) por HU", color=NAVY, fontsize=9.5, fontweight="bold")
    ax1.tick_params(axis="y", labelcolor=NAVY)
    ax1.set_ylim(0, 76)

    ax2 = ax1.twinx()
    b2 = ax2.bar(x + width/2, cost_hu, width, color=GOLD, edgecolor=NAVY, linewidth=1.0, label="Costo Total / HU (MXN)")
    ax2.set_ylabel("Costo Ponderado por HU ($ MXN)", color=DARK, fontsize=9.5, fontweight="bold")
    ax2.set_ylim(0, 14000)

    for bar in b1:
        h = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2, h + 1.5, f"{h:.1f} HP", ha="center", va="bottom",
                 fontsize=8.3, fontweight="bold", color=NAVY)
    for bar in b2:
        h = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2, h + 260, f"${h:,.0f}", ha="center", va="bottom",
                 fontsize=8.3, fontweight="bold", color=DARK)

    ax1.set_xticks(x)
    ax1.set_xticklabels(cats, fontsize=8.6, fontweight="bold", color=DARK)
    ax1.set_title("Esfuerzo y Costo Ponderado por Complejidad de HU", fontsize=10.5, fontweight="bold", color=NAVY, pad=18)
    ax1.grid(axis="y", linestyle="--", alpha=0.35)
    ax1.spines["top"].set_visible(False)
    ax2.spines["top"].set_visible(False)

    h1, l1 = ax1.get_legend_handles_labels()
    h2, l2 = ax2.get_legend_handles_labels()
    ax1.legend(h1 + h2, l1 + l2, loc="upper left", frameon=False, fontsize=8.2)

    plt.tight_layout(pad=0.3)
    out = ASSETS_DIR / "chart_esfuerzo_hu.png"
    plt.savefig(out, dpi=240, facecolor="white")
    plt.close(fig)
    print("Saved", out)


def chart_costos():
    fig, ax = plt.subplots(figsize=(6.4, 4.1), dpi=240)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    labels = [
        "Salarios (8 dev × 2 meses)\n$240,000.00 (90.23 %)",
        "Imprevistos (Contingencia 10 %)\n$24,180.00 (9.09 %)",
        "Infraestructura (Suministros)\n$1,000.00 (0.38 %)",
        "Admin. / Terceros (IA Equipo)\n$800.00 (0.30 %)",
    ]
    sizes = [240000, 24180, 1000, 800]
    colors = [NAVY, GOLD, "#3B82F6", "#64748B"]

    # Donut con barras al lado o donut limpio con etiquetas externas
    wedges, _ = ax.pie(
        sizes,
        colors=colors,
        startangle=140,
        wedgeprops=dict(width=0.35, edgecolor="white", linewidth=2),
    )
    ax.text(0, 0.22, "Total\nPresupuestado", ha="center", va="center", fontsize=8.4, color=SLATE, fontweight="bold", linespacing=1.15)
    ax.text(0, -0.14, "$265,980.00\nMXN", ha="center", va="center", fontsize=11.4, color=NAVY, fontweight="bold", linespacing=1.2)

    ax.legend(wedges, labels, loc="lower center", bbox_to_anchor=(0.5, -0.22),
              ncol=2, frameon=False, fontsize=8.2)
    ax.set_title("Distribución del Presupuesto Total (4 Rubros)", fontsize=11, fontweight="bold", color=NAVY, pad=6)

    plt.tight_layout(pad=0.2)
    out = ASSETS_DIR / "chart_costos.png"
    plt.savefig(out, dpi=240, facecolor="white", bbox_inches="tight")
    plt.close(fig)
    print("Saved", out)


def chart_riesgos():
    fig, ax = plt.subplots(figsize=(7.6, 4.9), dpi=240)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("#FAFCFF")

    # Frontera de tolerancia: (p/0.75)^2 + (i/3.0)^2 = 1
    xs = np.linspace(0.03, 0.75, 250)
    ys = 3.0 * np.sqrt(np.maximum(0, 1.0 - (xs / 0.75) ** 2))
    ax.plot(xs, ys, color=RED, linewidth=2.4, label="Frontera de tolerancia", zorder=2)

    risks = [
        ("R1", 0.35, 3.0, True,  (0.012, 0.08)),
        ("R2", 0.50, 1.0, False, (0.012, 0.08)),
        ("R3", 0.20, 2.0, False, (0.012, 0.08)),
        ("R4, R9", 0.15, 3.0, False, (0.012, 0.09)),
        ("R5", 0.75, 3.0, True,  (0.012, 0.09)),
        ("R6", 0.10, 4.0, False, (0.012, 0.08)),
        ("R7", 0.05, 2.0, False, (0.012, 0.08)),
        ("R8", 0.05, 4.0, False, (0.012, 0.08)),
        ("R10", 0.40, 3.0, True, (0.012, 0.08)),
        ("R11", 0.30, 3.0, True, (0.012, 0.08)),
        ("R12", 0.25, 3.0, False, (0.012, 0.08)),
        ("R13", 0.15, 4.0, False, (0.012, 0.08)),
        ("R14", 0.10, 2.0, False, (0.012, 0.08)),
    ]

    first_occ = True
    first_non = True
    for name, p, imp, occurred, (dx, dy) in risks:
        if occurred:
            ax.scatter(p, imp, s=135, facecolor=GOLD, edgecolor=RED, linewidth=2.0, zorder=4,
                       label="Riesgos ocurridos (4)" if first_occ else "")
            first_occ = False
            ax.text(p + dx, imp + dy, name, fontsize=9.0, fontweight="bold", color=RED, zorder=5)
        else:
            ax.scatter(p, imp, s=95, facecolor="#3B82F6", edgecolor=NAVY, linewidth=1.2, zorder=3,
                       label="Riesgos no ocurridos (10)" if first_non else "")
            first_non = False
            ax.text(p + dx, imp + dy, name, fontsize=8.4, fontweight="bold", color=NAVY, zorder=5)

    ax.set_xlim(0.0, 0.86)
    ax.set_ylim(0.0, 4.45)
    ax.set_xlabel("Probabilidad de ocurrencia", fontsize=9.8, fontweight="bold", color=DARK)
    ax.set_ylabel("Impacto (escala 1 a 4)", fontsize=9.8, fontweight="bold", color=DARK)
    ax.set_title("Análisis de Riesgos (R1–R14): Probabilidad vs. Impacto", fontsize=11.2, fontweight="bold", color=NAVY, pad=10)
    ax.grid(True, linestyle="--", alpha=0.45, color="#CBD5E1")
    ax.legend(loc="upper right", frameon=True, facecolor="white", edgecolor=BORDER, fontsize=8.5)

    plt.tight_layout(pad=0.3)
    out = ASSETS_DIR / "grafica_riesgos.png"
    plt.savefig(out, dpi=240, facecolor="white")
    plt.close(fig)
    print("Saved", out)


if __name__ == "__main__":
    prepare_logos()
    chart_red_ruta_critica()
    chart_gantt_comparativo()
    chart_esfuerzo_hu()
    chart_costos()
    chart_riesgos()
