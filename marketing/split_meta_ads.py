"""Split GiftCard4Sale Meta ad design sheet into recommended upload sizes."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = Path(
    r"C:\Users\User\.cursor\projects\c-Users-User-Desktop-GiftCard4Sale\assets"
    r"\c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"15cc6c7e89257a6c1516c2e684d0cb65_images_ChatGPT_Image_Jul_9__2026__"
    r"12_11_57_PM-7dcf27ff-4ad4-4256-b7a6-f9901d054eb4.png"
)
OUT = Path(r"C:\Users\User\Desktop\GiftCard4Sale\marketing\meta-ads-july-2026")


def find_bright_gaps(col_mean: np.ndarray, threshold: float) -> list[tuple[int, int]]:
    gaps: list[tuple[int, int]] = []
    in_gap = False
    start = 0
    for x, val in enumerate(col_mean):
        bright = val > threshold
        if bright and not in_gap:
            in_gap = True
            start = x
        elif not bright and in_gap:
            in_gap = False
            gaps.append((start, x - 1))
    if in_gap:
        gaps.append((start, len(col_mean) - 1))
    return gaps


def upscale_cover(crop: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Upscale with LANCZOS, then center-crop/pad to exact target aspect."""
    tw, th = size
    target_ratio = tw / th
    cw, ch = crop.size
    crop_ratio = cw / ch

    if crop_ratio > target_ratio:
        # too wide — crop sides
        new_w = int(ch * target_ratio)
        left = (cw - new_w) // 2
        crop = crop.crop((left, 0, left + new_w, ch))
    elif crop_ratio < target_ratio:
        # too tall — crop top/bottom slightly
        new_h = int(cw / target_ratio)
        top = (ch - new_h) // 2
        crop = crop.crop((0, top, cw, top + new_h))

    out = crop.resize(size, Image.Resampling.LANCZOS)
    # mild sharpen after upscale
    return out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=2))


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"  saved {path.name} ({img.size[0]}x{img.size[1]})")


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    arr = np.array(im)
    W, H = im.size
    print(f"Source: {W}x{H}")

    for d in [
        "01-static-feed",
        "02-stories-reels",
        "03-carousel",
        "04-video-thumbnails",
        "_debug",
    ]:
        (OUT / d).mkdir(parents=True, exist_ok=True)

    # --- Static ads (top row) ---
    # Content band ~ y46–328; panels separated near x=269, 519, 757
    static_y0, static_y1 = 46, 328
    static_xs = [8, 269, 519, 757, 1008]  # left edges + end of last panel
    static_names = [
        "01-sell-get-paid-in-minutes",
        "02-turn-gift-cards-into-cash",
        "03-why-choose-giftcard4sale",
        "04-dont-let-cards-go-to-waste",
    ]
    # Meta feed landscape recommended: 1200x628
    print("\nStatic feed (1200x628):")
    for i, name in enumerate(static_names):
        x0 = static_xs[i] + (2 if i else 0)
        x1 = static_xs[i + 1] - 2
        crop = im.crop((x0, static_y0, x1, static_y1))
        save(crop, OUT / "_debug" / f"static-raw-{i+1:02d}.png")
        save(
            upscale_cover(crop, (1200, 628)),
            OUT / "01-static-feed" / f"{name}-1200x628.png",
        )
        # Also export square 1080x1080 for feed flexibility
        save(
            upscale_cover(crop, (1080, 1080)),
            OUT / "01-static-feed" / f"{name}-1080x1080.png",
        )

    # --- Mid section: Stories (left) + Carousel (right) ---
    mid_y0, mid_y1 = 348, 508
    band = arr[mid_y0:mid_y1]
    col_mean = band.mean(axis=(0, 2))
    gaps = find_bright_gaps(col_mean, 230)
    print("\nMid gaps:", gaps)

    # Expected ~5 story panels then gap then 5 carousel panels
    # From earlier: gaps around 0-8, 24?, 120, 214, 310, 406, 500-508, 604, 700, 804, 908, 1016
    # Use panel centers between major gaps
    major = [g for g in gaps if (g[1] - g[0]) >= 1]
    # Build panel ranges from consecutive gap midpoints
    edges = [0]
    for a, b in major:
        mid = (a + b) // 2
        if mid - edges[-1] > 40:  # skip tiny edge noise
            edges.append(mid)
    if edges[-1] < W - 5:
        edges.append(W)
    print("Mid edges:", edges)

    # Manually lock to measured separators for reliability
    # Stories start after the vertical "STORIES / REELS" label (~x28)
    story_edges = [28, 122, 214, 312, 408, 498]
    carousel_edges = [510, 606, 702, 806, 910, 1014]

    story_names = [
        "01-sell-get-paid-fast",
        "02-easy-3-simple-steps",
        "03-paid-in-minutes",
        "04-trusted-by-thousands",
        "05-we-buy-all-major-cards",
    ]
    carousel_names = [
        "01-sell-for-cash-in-minutes",
        "02-choose-from-100-plus",
        "03-best-rates-always",
        "04-fast-secure-reliable",
        "05-paid-usdt-naira-cedi",
    ]

    print("\nStories/Reels (1080x1920):")
    for i, name in enumerate(story_names):
        x0 = story_edges[i] + 2
        x1 = story_edges[i + 1] - 2
        crop = im.crop((x0, mid_y0, x1, mid_y1))
        save(crop, OUT / "_debug" / f"story-raw-{i+1:02d}.png")
        save(
            upscale_cover(crop, (1080, 1920)),
            OUT / "02-stories-reels" / f"{name}-1080x1920.png",
        )

    print("\nCarousel (1080x1080):")
    for i, name in enumerate(carousel_names):
        x0 = carousel_edges[i] + 2
        x1 = carousel_edges[i + 1] - 2
        crop = im.crop((x0, mid_y0, x1, mid_y1))
        save(crop, OUT / "_debug" / f"carousel-raw-{i+1:02d}.png")
        save(
            upscale_cover(crop, (1080, 1080)),
            OUT / "03-carousel" / f"{name}-1080x1080.png",
        )

    # --- Video thumbnails (under carousel column) ---
    # Sheet shows 2 labeled thumbs; a third benefits panel sits to the right.
    vid_y0, vid_y1 = 542, 636
    thumb_names = [
        "01-sell-get-paid-in-5-minutes",
        "02-how-to-sell-on-giftcard4sale",
        "03-best-rates-fast-secure",
    ]
    thumb_ranges = [(512, 670), (676, 830), (840, 1012)]
    print(f"\nVideo thumbs y={vid_y0}-{vid_y1} ranges={thumb_ranges}")

    print("\nVideo thumbnails (1280x720):")
    for i, name in enumerate(thumb_names):
        x0, x1 = thumb_ranges[i]
        crop = im.crop((x0 + 2, vid_y0 + 2, x1 - 2, vid_y1 - 2))
        save(crop, OUT / "_debug" / f"thumb-raw-{i+1:02d}.png")
        save(
            upscale_cover(crop, (1280, 720)),
            OUT / "04-video-thumbnails" / f"{name}-1280x720.png",
        )

    # Debug overlay showing crop boxes
    debug = im.copy()
    draw = ImageDraw.Draw(debug)
    colors = {
        "static": (0, 255, 128),
        "story": (0, 180, 255),
        "carousel": (255, 200, 0),
        "thumb": (255, 80, 80),
    }
    for i in range(4):
        draw.rectangle(
            [static_xs[i] + 2, static_y0, static_xs[i + 1] - 2, static_y1],
            outline=colors["static"],
            width=2,
        )
    for i in range(5):
        draw.rectangle(
            [story_edges[i] + 2, mid_y0, story_edges[i + 1] - 2, mid_y1],
            outline=colors["story"],
            width=2,
        )
        draw.rectangle(
            [carousel_edges[i] + 2, mid_y0, carousel_edges[i + 1] - 2, mid_y1],
            outline=colors["carousel"],
            width=2,
        )
    for x0, x1 in thumb_ranges:
        draw.rectangle(
            [x0 + 2, vid_y0 + 2, x1 - 2, vid_y1 - 2],
            outline=colors["thumb"],
            width=2,
        )
    save(debug, OUT / "_debug" / "crop-overlay.png")
    print(f"\nDone. Output: {OUT}")


if __name__ == "__main__":
    main()
