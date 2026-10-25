#!/usr/bin/env python3
"""DeerFlow agent-pet video→sheet extractor (spec §8 / §8.1).

Encodes the §8.1 pipeline contract in code so the four hard rules cannot be
violated by hand: uniform keying params and one locked global crop box (both
live in a single shared config file), integer-stride decimation with fps
dividing SOURCE_FPS, drop-duplicate-last-frame for loop clips, and a
divisibility guard that keeps every loop step (including the wrap) uniform so
no per-loop seam tick can slip in.

Requires ffmpeg/ffprobe on PATH. Stdlib only.

    python scripts/pet_extract.py base --ref parrot.png --out base_A.png
    python scripts/pet_extract.py measure --video clip.mp4
    python scripts/pet_extract.py sheet --video clip.mp4 --config pet.json \
        --state done --mode oneshot --window 24 72 --stride 2 --out done.webp
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

SOURCE_FPS = 24
MAX_FRAMES = 32  # spec §8 rule 5: decode-memory / byte budget at 512 px/frame
MEASURED_DECODE_WIDTH_OK = 20480  # spec §8 rule 5, measured 2026-09-10
WARN_DECODE_WIDTH = 16384  # WebGL MAX_TEXTURE_SIZE; CSS images decoded fine above it
# libwebp refuses to *encode* anything wider than this ("Picture size is too
# large. Max is 16383x16383."), and the failure surfaces only at the final
# hstack. 16383 / 512 = 31.99 -> 31 frames per single-row sheet, not 32.
WEBP_MAX_EDGE = 16383


def fail(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def load_config(path: Path) -> dict:
    cfg = json.loads(path.read_text(encoding="utf-8"))
    key = cfg.setdefault("key", {"color": "0xFF00FF", "similarity": 0.30, "blend": 0.08})
    cfg.setdefault("frame", 512)
    if "crop" in cfg:
        x, y, w, h = cfg["crop"]
        key["_crop"] = f"crop={w}:{h}:{x}:{y}"
    return cfg


def nb_frames(video: Path) -> int:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=nb_frames", "-of", "default=nw=1:nk=1", str(video)],
        capture_output=True, text=True, check=True).stdout.strip()
    if out.isdigit():
        return int(out)
    dur = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=duration", "-of", "default=nw=1:nk=1", str(video)],
        capture_output=True, text=True, check=True).stdout.strip()
    return round(float(dur) * SOURCE_FPS)


def key_filter(cfg: dict) -> str:
    k = cfg["key"]
    return f"colorkey={k['color']}:{k['similarity']}:{k['blend']}"


def mask_filter(cfg: dict, cli_mask: list[list[int]] | None) -> str:
    """Paint one or more rectangles in the key colour before keying.

    For a generator that burns marks into the frame: they are not the key
    colour, so colorkey cannot remove them, and they would both pollute the
    measured union box and ride into the sheet. Filling their rectangles with
    the key colour makes the existing key remove them, and keeps every rule
    below unchanged. Rectangles are x0,y0,x1,y1 in source pixels; CLI wins over
    config. Either side may carry one rectangle or a list of them, so a clip
    that picks up a second mark (a corner badge, say) is handled without
    touching the shared config every other clip shares.
    """
    raw = cli_mask if cli_mask else cfg.get("mask")
    if not raw:
        return ""
    rects = [raw] if isinstance(raw[0], int) else raw
    boxes = []
    for rect in rects:
        x0, y0, x1, y1 = rect
        if x1 <= x0 or y1 <= y0:
            fail(f"mask must be x0,y0,x1,y1 with x1>x0 and y1>y0, got {rect}")
        boxes.append(f"drawbox=x={x0}:y={y0}:w={x1 - x0}:h={y1 - y0}:color={cfg['key']['color']}@1.0:t=fill")
    return ",".join(boxes)


def measure(args: argparse.Namespace) -> None:
    cfg = load_config(Path(args.config)) if args.config else {
        "key": {"color": "0xFF00FF", "similarity": 0.30, "blend": 0.08}, "frame": 512}
    div = args.scale_div
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "json", str(args.video)],
        capture_output=True, text=True, check=True)
    stream = json.loads(probe.stdout)["streams"][0]
    w, h = stream["width"], stream["height"]
    sw, sh = w // div, h // div
    mask = mask_filter(cfg, args.mask)
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(args.video),
         "-vf", ",".join(p for p in (mask, key_filter(cfg), f"scale={sw}:{sh}:flags=area") if p),
         "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
        capture_output=True, check=True).stdout
    frame_bytes = sw * sh * 4
    npix = sw * sh
    xs, ys = [], []
    for f in range(len(raw) // frame_bytes):
        base = f * frame_bytes
        for q in range(npix):
            if raw[base + q * 4 + 3] > 100:
                xs.append(q % sw)
                ys.append(q // sw)
    if not xs:
        fail("no non-key pixels found; check key color/similarity")
    box = [min(xs) * div, min(ys) * div, (max(xs) - min(xs) + 1) * div, (max(ys) - min(ys) + 1) * div]
    n = nb_frames(args.video)
    print(json.dumps({
        "union_bbox": box,
        "margins": {"left": box[0], "right": w - box[0] - box[2], "top": box[1], "bottom": h - box[1] - box[3]},
        "frames": n,
        "mask": (args.mask or cfg.get("mask")),
        "loop_strides_dividing_n_minus_1": [s for s in range(1, 9) if (n - 1) % s == 0 and (n - 1) // s <= MAX_FRAMES and SOURCE_FPS % s == 0],
    }, indent=2))
    if not [s for s in range(1, 9) if (n - 1) % s == 0 and (n - 1) // s <= MAX_FRAMES and SOURCE_FPS % s == 0]:
        print(f"warning: no legal loop stride for {n} frames; a loop needs a frame count whose (n-1) is divisible "
              f"by the stride (e.g. 94 frames -> stride 3 -> 31 frames @8fps). Trim the clip or pass --frames N.")
    print("note: the crop box is DECLARED once in canvas coordinates and reused for every clip and every re-export "
          "(spec §8.1 rule 3) — this measurement only checks the bird stays inside it. Put it in the shared config as "
          "\"crop\": [x, y, w, h]. "
          "If the source carries a burned-in watermark, pass --mask x0,y0,x1,y1 so it never inflates this box.")


def plan_frames(args: argparse.Namespace, cfg: dict) -> tuple[list[int], int, int]:
    """Pick the frame indices for one clip and enforce every selection guard.

    Shared by `sheet` and `frames` so the two entry points cannot drift on
    stride divisibility, the loop seam rule, the frame budget, or the WebP
    width ceiling. Returns (indices, considered frame count, fps).
    """
    if SOURCE_FPS % args.stride != 0:
        fail(f"stride {args.stride} does not divide {SOURCE_FPS}; fps would be non-integer and steps would jitter (spec §8 rule 6 ladder {sorted({SOURCE_FPS // s for s in range(1, 9)})})")
    start = args.start
    if start and args.mode != "loop":
        fail("--start only applies to loop mode; a oneshot clip selects its range with --window")
    n = nb_frames(args.video)
    if args.frames is not None:
        if args.mode != "loop":
            fail("--frames only applies to loop mode; a oneshot clip selects its range with --window")
        if args.frames > n:
            fail(f"--frames {args.frames} exceeds the clip's {n} frames")
        n = args.frames
    if args.mode == "loop":
        if n - 1 - start <= 0:
            fail(f"--start {start} leaves no frames before the dropped duplicate at {n - 1}")
        # The clip opens and closes on the same pose (spec §8.1 rule 1), so the
        # frame at n-1 duplicates frame `start`: drop it, then require the rest
        # to divide evenly so the wrap step equals every other step (otherwise
        # one seam tick per loop, forever). --start > 0 exists because a
        # generated clip often opens with a stationary hold; starting the loop
        # inside that hold makes every cycle begin with a dead beat.
        if (n - 1 - start) % args.stride != 0:
            fail(f"loop covers frames [{start}, {n - 1}); span {n - 1 - start} not divisible by "
                 f"stride {args.stride} -> the wrap step would differ from the others (seam tick). "
                 f"Divisible strides: {[s for s in range(1, 9) if (n - 1 - start) % s == 0]}")
        indices = list(range(start, n - 1, args.stride))
    else:
        if not args.window:
            fail("oneshot mode requires --window START END (frame indices)")
        indices = list(range(args.window[0], args.window[1], args.stride))
    if len(indices) > MAX_FRAMES:
        fail(f"{len(indices)} frames exceeds the {MAX_FRAMES}/state budget (spec §8 rule 5)")
    fps = SOURCE_FPS // args.stride
    width = len(indices) * cfg["frame"]
    if width > MEASURED_DECODE_WIDTH_OK:
        fail(f"sheet width {width}px exceeds the measured decode ceiling {MEASURED_DECODE_WIDTH_OK}px")
    if width > WEBP_MAX_EDGE:
        max_frames = WEBP_MAX_EDGE // cfg["frame"]
        fail(f"sheet width {width}px exceeds the WebP encode ceiling {WEBP_MAX_EDGE}px "
             f"({len(indices)} frames x {cfg['frame']}px); libwebp cannot encode it at all. "
             f"Use at most {max_frames} frames per single-row sheet "
             f"(e.g. --frames {1 + max_frames * args.stride} with --stride {args.stride}).")
    if width > WARN_DECODE_WIDTH:
        print(f"warn: sheet width {width}px is above WebGL MAX_TEXTURE_SIZE {WARN_DECODE_WIDTH}px; "
              "CSS backgrounds decoded fine at 20480 in the 2026-09-10 measurement, but re-verify on target browsers")
    return indices, n, fps


def select_filter(indices: list[int]) -> str:
    return "select='" + "+".join(f"eq(n\\,{i})" for i in indices) + "'"


def sheet(args: argparse.Namespace) -> None:
    cfg = load_config(Path(args.config))
    if "crop" not in cfg:
        fail("config has no \"crop\"; set it once and keep it for every clip (spec §8.1 rule 3)")
    indices, n, fps = plan_frames(args, cfg)
    width = len(indices) * cfg["frame"]
    select = select_filter(indices)
    mask = mask_filter(cfg, args.mask)
    vf = ",".join(p for p in (select, mask, key_filter(cfg), cfg["key"]["_crop"],
                              f"scale={cfg['frame']}:{cfg['frame']}:flags=area") if p)
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(args.video),
                        "-vf", vf, "-fps_mode", "passthrough", f"{td}/f%04d.png"], check=True)
        produced = sorted(Path(td).glob("f*.png"))
        if len(produced) != len(indices):
            fail(f"expected {len(indices)} frames, ffmpeg produced {len(produced)}")
        inputs: list[str] = []
        for p in produced:
            inputs += ["-i", str(p)]
        stack = f"hstack=inputs={len(produced)}"
        subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs,
                        "-filter_complex", stack,
                        "-c:v", "libwebp", "-quality", "85", str(args.out)], check=True)
    manifest = {args.state: {"frames": len(indices), "fps": fps, "loop": args.mode == "loop",
                             "sheetWidth": width, "sheetHeight": cfg["frame"]}}
    print(json.dumps(manifest))
    print(f"wrote {args.out} ({width}x{cfg['frame']}, {len(indices)} frames @ {fps}fps, "
          f"playback {len(indices) / fps:.2f}s; considered {n} of the clip's frames"
          f"{', masked ' + str(args.mask or cfg.get('mask')) if mask else ''})")


def frames(args: argparse.Namespace) -> None:
    """Dump the selected frames with geometry applied but the key colour intact.

    The artist's half of the pipeline: this hands over exactly the frames that
    would go into the sheet, already masked, cropped and scaled, so the keying
    can be done elsewhere and the result packed back with `pack`. Sizes are
    baked in, so an externally keyed frame must come back at frame x frame.
    """
    cfg = load_config(Path(args.config))
    if "crop" not in cfg:
        fail("config has no \"crop\"; set it once and keep it for every clip (spec §8.1 rule 3)")
    indices, n, fps = plan_frames(args, cfg)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("f*.png"):
        stale.unlink()
    # --no-scale keeps source resolution so the key can be pulled at full res and
    # only then downsampled (pack does that), which is the same order the
    # one-pass `sheet` uses: key -> crop -> scale.
    scale = "" if args.no_scale else f"scale={cfg['frame']}:{cfg['frame']}:flags=area"
    vf = ",".join(p for p in (select_filter(indices), mask_filter(cfg, args.mask),
                              cfg["key"]["_crop"], scale) if p)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(args.video),
                    "-vf", vf, "-fps_mode", "passthrough", str(out_dir / "f%04d.png")], check=True)
    produced = sorted(out_dir.glob("f*.png"))
    if len(produced) != len(indices):
        fail(f"expected {len(indices)} frames, ffmpeg produced {len(produced)}")
    crop_w, crop_h = cfg["key"]["_crop"].removeprefix("crop=").split(":")[:2]
    size = f"{crop_w}x{crop_h} (source resolution, crop applied)" if args.no_scale else f"{cfg['frame']}x{cfg['frame']}"
    print(f"wrote {len(produced)} frames to {out_dir} ({size}, key colour NOT removed; "
          f"considered {n} of the clip's frames)")
    print(f"retouch, then either key them yourself or let pack do it (--config <same config>); then: "
          f"python scripts/pet_extract.py pack --dir \"{out_dir}\" "
          f"--state {args.state} --fps {fps} --frame {cfg['frame']}{'' if args.mode == 'loop' else ' --oneshot'} --out <sheet.webp>")


def pack(args: argparse.Namespace) -> None:
    """Assemble externally edited frames into one horizontal sheet.

    Inverse of `frames`. By default the frames are assumed already keyed; pass
    `--config` to key them here instead, with the same `colorkey` the one-pass
    `sheet` uses — that is the path for an artist who retouched a watermark but
    should not also be hand-keying, because per-frame matting makes the alpha
    edge boil (spec §8.1 rule 2).

    Either way it verifies the set is uniform and within the format's limits, so
    a mismatched export fails here instead of producing a sheet that is silently
    one frame out of step.
    """
    cfg = load_config(Path(args.config)) if args.config else None
    key = key_filter(cfg) + "," if cfg else ""
    files = sorted(Path(args.dir).glob("*.png"))
    if not files:
        fail(f"no PNG frames found in {args.dir}")
    shapes = set()
    alphas = set()
    for f in files:
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height,pix_fmt", "-of", "json", str(f)],
            capture_output=True, text=True, check=True)
        stream = json.loads(probe.stdout)["streams"][0]
        shapes.add((stream["width"], stream["height"]))
        alphas.add(stream["pix_fmt"])
    if len(shapes) != 1:
        fail(f"frames differ in size: {sorted(shapes)}; every frame must be the same square box")
    w, h = shapes.pop()
    if w != h:
        fail(f"frames are {w}x{h}; the sheet's frame is square, so a crop must be square too")
    width = args.frame * len(files)
    if width > WEBP_MAX_EDGE:
        fail(f"sheet width {width}px exceeds the WebP encode ceiling {WEBP_MAX_EDGE}px "
             f"({len(files)} frames x {args.frame}px); drop frames or split the state")
    if not cfg and not any("a" in fmt or fmt.startswith("pal8") for fmt in alphas):
        print(f"warn: frames carry no alpha channel ({sorted(alphas)}); the key colour will be visible — "
              "did you forget to key them? (or pass --config to key them here)")
    if w != args.frame:
        print(f"note: frames are {w}x{h} and will be scaled to {args.frame}x{args.frame} while stacking "
              "(keying at source resolution then downscaling matches the one-pass `sheet` order)")

    inputs: list[str] = []
    for f in files:
        inputs += ["-i", str(f)]
    graph = "".join(f"[{i}:v]{key}scale={args.frame}:{args.frame}:flags=area[s{i}];" for i in range(len(files)))
    graph += "".join(f"[s{i}]" for i in range(len(files))) + f"hstack=inputs={len(files)}"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", *inputs,
         "-filter_complex", graph,
         "-c:v", "libwebp", "-quality", str(args.quality), str(args.out)], check=True)
    manifest = {args.state: {"frames": len(files), "fps": args.fps, "loop": not args.oneshot,
                             "sheetWidth": width, "sheetHeight": args.frame}}
    print(json.dumps(manifest))
    print(f"wrote {args.out} ({width}x{args.frame}, {len(files)} frames @ {args.fps}fps"
          f"{f', scaled from {w}px' if w != args.frame else ''})")


def base(args: argparse.Namespace) -> None:
    # spec §8.1 rule 5: layout authority lives in this deterministic composite,
    # not in any image model (they do not honor ratio/position text commands).
    bottom = args.canvas_size - args.y - args.bird_height
    if args.bird_height > args.canvas_size * 0.65:
        fail(f"bird height {args.bird_height} exceeds 65% of canvas {args.canvas_size}; "
             "wing/flap motion headroom collapses (spec §8.1 rule 3)")
    if bottom < 80:
        fail(f"bottom margin {bottom}px < 80px; sigh-sink/crouch (≈40-80px) would clip the feet (spec §8.1 rule 3)")
    fc = (f"[1:v]scale=-2:{args.bird_height}:flags=lanczos,format=rgba[k];"
          f"[0:v][k]overlay=(W-w)/2:{args.y}")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y",
         "-f", "lavfi", "-i", f"color=c=0x{args.canvas}:s={args.canvas_size}x{args.canvas_size}",
         "-i", str(args.ref),
         "-filter_complex", fc, "-frames:v", "1", str(args.out)], check=True)
    print(f"wrote {args.out} ({args.canvas_size}x{args.canvas_size}, "
          f"bird {args.bird_height}px at y={args.y}, margins top={args.y} bottom={bottom} "
          f"sides=({args.canvas_size}-bird_width)/2)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    m = sub.add_parser("measure", help="check one clip: print its keyed union bbox and margins (spec §8.1 rule 3 — the crop is declared once, so this is a health check, not a box to lock)")
    m.add_argument("--video", type=Path, required=True)
    m.add_argument("--config", type=Path, help="optional config supplying key params")
    m.add_argument("--scale-div", type=int, default=10, help="bbox precision divisor (default 10 => ±10px)")
    m.add_argument("--mask", type=int, nargs=4, action="append", metavar=("X0", "Y0", "X1", "Y1"),
                   help="paint this rectangle in the key colour before keying (burned-in mark); repeat it to mask more than one rectangle. Overrides config \"mask\"")
    m.set_defaults(fn=measure)
    s = sub.add_parser("sheet", help="extract, key, crop, scale and stack one state sheet")
    s.add_argument("--video", type=Path, required=True)
    s.add_argument("--config", type=Path, required=True, help="shared config: key params + locked global crop + frame size")
    s.add_argument("--state", required=True)
    s.add_argument("--mode", choices=["loop", "oneshot"], required=True)
    s.add_argument("--stride", type=int, required=True)
    s.add_argument("--window", type=int, nargs=2, metavar=("START", "END"), help="oneshot frame-index window")
    s.add_argument("--frames", type=int,
                   help="loop only: consider frames [start, N). Use it when the generator overshoots the nominal duration "
                        "and no stride divides the real span — e.g. 107 frames -> --frames 94 --stride 3 -> 31 frames")
    s.add_argument("--start", type=int, default=0,
                   help="loop only: first frame of the loop (default 0). Use it when the clip opens with a stationary "
                        "hold — starting the loop inside that hold gives every cycle a dead beat")
    s.add_argument("--mask", type=int, nargs=4, action="append", metavar=("X0", "Y0", "X1", "Y1"),
                   help="paint this rectangle in the key colour before keying (burned-in watermark); overrides config \"mask\"")
    s.add_argument("--out", type=Path, required=True)
    s.set_defaults(fn=sheet)
    fr = sub.add_parser("frames", help="dump the selected frames with geometry applied but the key colour intact (then key elsewhere and use pack)")
    fr.add_argument("--video", type=Path, required=True)
    fr.add_argument("--config", type=Path, required=True, help="shared config: key colour + crop + frame size")
    fr.add_argument("--state", required=True, help="state name, echoed into the pack hint")
    fr.add_argument("--mode", choices=["loop", "oneshot"], required=True)
    fr.add_argument("--stride", type=int, required=True)
    fr.add_argument("--window", type=int, nargs=2, metavar=("START", "END"), help="oneshot frame-index window")
    fr.add_argument("--frames", type=int, help="loop only: consider frames [start, N)")
    fr.add_argument("--start", type=int, default=0, help="loop only: first frame of the loop (default 0)")
    fr.add_argument("--mask", type=int, nargs=4, action="append", metavar=("X0", "Y0", "X1", "Y1"),
                    help="paint this rectangle in the key colour before anything else; overrides config \"mask\"")
    fr.add_argument("--no-scale", action="store_true",
                    help="keep source resolution (crop applied, not resized) so the key is pulled at full res and only "
                         "then downscaled by pack — the same order the one-pass `sheet` uses")
    fr.add_argument("--out-dir", type=Path, required=True, help="directory to write f0001.png ... into (cleared of f*.png first)")
    fr.set_defaults(fn=frames)
    p = sub.add_parser("pack", help="assemble externally keyed frames into one horizontal sheet (inverse of frames)")
    p.add_argument("--dir", type=Path, required=True, help="directory of equally sized square PNG frames, sorted by name")
    p.add_argument("--config", type=Path,
                   help="optional: key the frames here with this config's colorkey before stacking, instead of "
                        "expecting them already keyed (same params the one-pass `sheet` uses)")
    p.add_argument("--state", required=True)
    p.add_argument("--fps", type=int, required=True)
    p.add_argument("--oneshot", action="store_true", help="mark the state as a one-shot instead of a loop")
    p.add_argument("--frame", type=int, default=512, help="expected square edge, used only in error messages")
    p.add_argument("--quality", type=int, default=85, help="libwebp quality (default 85)")
    p.add_argument("--out", type=Path, required=True)
    p.set_defaults(fn=pack)
    b = sub.add_parser("base", help="composite the deterministic base frame (spec §8.1 rule 5): transparent ref onto solid canvas at locked scale/position")
    b.add_argument("--ref", type=Path, required=True, help="transparent-background character reference")
    b.add_argument("--out", type=Path, required=True)
    b.add_argument("--canvas", default="FF00FF", help="canvas hex without # (default magenta FF00FF; green forbidden, green wings)")
    b.add_argument("--canvas-size", type=int, default=1920, help="square canvas edge = video generation resolution")
    b.add_argument("--bird-height", type=int, default=1152, help="bird height in px (default 1152 = 60 percent of a 1920 canvas)")
    b.add_argument("--y", type=int, default=668, help="bird box top edge (default leaves 100px bottom margin)")
    b.set_defaults(fn=base)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
