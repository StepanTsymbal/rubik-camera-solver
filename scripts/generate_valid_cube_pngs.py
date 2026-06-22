from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


FACELETS = "DDBUUDRRBUBULRBRRBDULBFFLLUUDFUDFBRRLBFULLDFFRFFRBLDDL"
SCRAMBLE = "R U F2 D L2 B U2"

FACE_ORDER = ["U", "R", "F", "D", "L", "B"]
SCAN_ORDER = ["U", "F", "R", "B", "L", "D"]
FACE_NAMES = {
    "U": "TOP",
    "F": "FRONT",
    "R": "RIGHT",
    "B": "BACK",
    "L": "LEFT",
    "D": "BOTTOM",
}
COLORS = {
    "U": (248, 250, 252),
    "R": (239, 68, 68),
    "F": (34, 197, 94),
    "D": (250, 204, 21),
    "L": (249, 115, 22),
    "B": (37, 99, 235),
}


def font(size: int) -> ImageFont.ImageFont:
    for name in ("arial.ttf", "Arial.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def split_faces() -> dict[str, str]:
    return {
        face: FACELETS[index * 9 : index * 9 + 9]
        for index, face in enumerate(FACE_ORDER)
    }


def draw_face(draw: ImageDraw.ImageDraw, x: int, y: int, stickers: str, cell: int) -> None:
    pad = max(5, cell // 12)
    draw.rectangle((x - pad, y - pad, x + cell * 3 + pad, y + cell * 3 + pad), fill=(14, 14, 14))
    gap = max(4, cell // 18)
    radius = max(8, cell // 8)
    for row in range(3):
        for col in range(3):
            color = COLORS[stickers[row * 3 + col]]
            left = x + col * cell + gap
            top = y + row * cell + gap
            right = x + (col + 1) * cell - gap
            bottom = y + (row + 1) * cell - gap
            draw.rounded_rectangle((left, top, right, bottom), radius=radius, fill=color, outline=(30, 41, 59), width=2)


def draw_centered_text(draw: ImageDraw.ImageDraw, text: str, cx: int, y: int, text_font: ImageFont.ImageFont) -> None:
    box = draw.textbbox((0, 0), text, font=text_font)
    draw.text((cx - (box[2] - box[0]) // 2, y), text, fill=(12, 18, 28), font=text_font)


def create_single_face(face: str, stickers: str, path: Path) -> None:
    image = Image.new("RGB", (900, 1040), "white")
    draw = ImageDraw.Draw(image)
    title_font = font(56)
    small_font = font(28)
    draw_centered_text(draw, f"{FACE_NAMES[face]} ({face})", 450, 48, title_font)
    draw_centered_text(draw, f"Scramble: {SCRAMBLE}", 450, 120, small_font)
    draw_face(draw, 210, 230, stickers, 160)
    image.save(path)


def create_scan_sheet(faces: dict[str, str], path: Path) -> None:
    image = Image.new("RGB", (1800, 1320), "white")
    draw = ImageDraw.Draw(image)
    title_font = font(46)
    label_font = font(36)
    small_font = font(24)
    draw_centered_text(draw, "Valid Rubik Cube Test Scan Sheet", 900, 28, title_font)
    draw_centered_text(draw, f"Scan order: TOP, FRONT, RIGHT, BACK, LEFT, BOTTOM  |  Scramble: {SCRAMBLE}", 900, 88, small_font)

    cell = 115
    positions = {
        "U": (742, 170),
        "L": (248, 580),
        "F": (618, 580),
        "R": (988, 580),
        "B": (1358, 580),
        "D": (742, 990),
    }

    for face, (x, y) in positions.items():
        draw_centered_text(draw, f"{FACE_NAMES[face]} ({face})", x + cell * 3 // 2, y - 58, label_font)
        draw_face(draw, x, y, faces[face], cell)

    image.save(path)


def main() -> None:
    out_dir = Path("generated")
    out_dir.mkdir(exist_ok=True)
    faces = split_faces()
    create_scan_sheet(faces, out_dir / "valid-rubik-scan-sheet.png")
    for index, face in enumerate(SCAN_ORDER, start=1):
        create_single_face(face, faces[face], out_dir / f"valid-rubik-{index}-{FACE_NAMES[face].lower()}.png")


if __name__ == "__main__":
    main()
