#!/usr/bin/env bash
# ==============================================================================
# extract-frames.sh
# Inspects Vdental.mp4 with ffprobe, then extracts every frame as WebP.
#
# Usage:
#   chmod +x extract-frames.sh
#   ./extract-frames.sh
#
# Requires: ffmpeg, ffprobe, python3
# Place Vdental.mp4 in the same directory as this script.
# ==============================================================================

set -e

VIDEO="Vdental.mp4"
OUT="frames"
QUALITY=85        # WebP lossy quality: 0–100 (85 = excellent quality/size balance)
EFFORT=4          # Encoder effort: 0–6 (4 = good balance of speed vs compression)

# ── Colours ───────────────────────────────────────────────────────────────────
B="\033[1m"; D="\033[2m"; C="\033[36m"; G="\033[32m"; R="\033[31m"; X="\033[0m"
hr() { printf "${D}%s${X}\n" "──────────────────────────────────────────────────────"; }

# ── Dependency check ──────────────────────────────────────────────────────────
for dep in ffprobe ffmpeg python3; do
  if ! command -v "$dep" &>/dev/null; then
    echo -e "${R}Error: '$dep' not found.${X}"
    [[ "$dep" == "ffmpeg" || "$dep" == "ffprobe" ]] && \
      echo "  macOS:  brew install ffmpeg" && \
      echo "  Ubuntu: sudo apt install ffmpeg"
    exit 1
  fi
done

# ── Video file check ──────────────────────────────────────────────────────────
if [[ ! -f "$VIDEO" ]]; then
  echo -e "${R}Error: '$VIDEO' not found.${X}"
  echo "Place your video here: $(pwd)/$VIDEO"
  exit 1
fi

mkdir -p "$OUT"

# ── Inspect video with ffprobe ────────────────────────────────────────────────
echo ""
hr
echo -e "${B}  Video Inspection${X}"
hr
echo ""

PROBE=$(ffprobe -v quiet -print_format json -show_streams -show_format "$VIDEO")

echo "$PROBE" | python3 - << 'PYEOF'
import json, sys, math

data = json.load(sys.stdin)
fmt  = data.get("format", {})
vs   = next((s for s in data["streams"] if s.get("codec_type") == "video"), {})

dur      = float(fmt.get("duration", 0))
fps_raw  = vs.get("r_frame_rate", "30/1")
num, den = map(int, fps_raw.split("/"))
fps      = num / den
est      = math.ceil(dur * fps)

print(f"  Duration   : {dur:.3f} s")
print(f"  Resolution : {vs.get('width','?')} × {vs.get('height','?')} px")
print(f"  Frame rate : {fps_raw}  ({fps:.4f} fps)")
print(f"  Codec      : {vs.get('codec_name','?')}")
print(f"  Est. frames: ~{est}")
PYEOF

echo ""

# ── ffprobe command (for reference) ──────────────────────────────────────────
echo -e "${D}  ffprobe command used:${X}"
echo -e "${D}  ffprobe -v quiet -print_format json -show_streams -show_format $VIDEO${X}"
echo ""

# ── Extract all frames ────────────────────────────────────────────────────────
hr
echo -e "${B}  Frame Extraction${X}"
hr
echo ""
echo "  Source  : $VIDEO"
echo "  Output  : $OUT/frame_NNNN.webp"
echo "  Format  : WebP lossy  (quality=$QUALITY, effort=$EFFORT)"
echo "  Naming  : frame_0001.webp, frame_0002.webp, ..."
echo ""
echo "  Extracting — this may take a minute or two..."
echo ""

# ── ffmpeg command ─────────────────────────────────────────────────────────────
#
#   -i "$VIDEO"               → input file
#   -quality $QUALITY         → WebP lossy quality (0–100)
#   -compression_level $EFFORT→ encoder effort (0–6); only affects speed/size
#   -lossless 0               → lossy mode (much smaller than lossless)
#   -y                        → overwrite existing frames without asking
#   -hide_banner              → suppress ffmpeg build info
#   -stats                    → show progress
#
ffmpeg \
  -i "$VIDEO" \
  -quality "$QUALITY" \
  -compression_level "$EFFORT" \
  -lossless 0 \
  "${OUT}/frame_%04d.webp" \
  -y -hide_banner -stats

# ── Count extracted frames ────────────────────────────────────────────────────
FRAME_COUNT=$(ls "${OUT}"/frame_*.webp 2>/dev/null | wc -l | tr -d ' \t')

echo ""

# ── Write config.json for JavaScript consumption ──────────────────────────────
echo "$PROBE" | python3 - "$FRAME_COUNT" "$QUALITY" << 'PYEOF'
import json, sys

data      = json.load(sys.stdin)
n_frames  = int(sys.argv[1])
quality   = int(sys.argv[2])
fmt       = data.get("format", {})
vs        = next((s for s in data["streams"] if s.get("codec_type") == "video"), {})

cfg = {
    "totalFrames": n_frames,
    "frameRate":   vs.get("r_frame_rate", "30/1"),
    "duration":    float(fmt.get("duration", 0)),
    "width":       vs.get("width", 0),
    "height":      vs.get("height", 0),
    "quality":     quality
}
with open("frames/config.json", "w") as f:
    json.dump(cfg, f, indent=2)
print("  Config saved: frames/config.json")
PYEOF

# ── Summary ───────────────────────────────────────────────────────────────────
hr
echo -e "${B}  Done${X}"
hr
echo ""
echo -e "  Frames extracted : ${G}${FRAME_COUNT}${X}"

TOTAL_MB=$(python3 -c "
import os, glob
files = glob.glob('${OUT}/frame_*.webp')
total = sum(os.path.getsize(f) for f in files)
print(f'{total / 1048576:.1f}')
" 2>/dev/null || echo "?")
echo "  Total size       : ~${TOTAL_MB} MB"
echo ""
echo "  Next steps:"
echo "    1. cd into the project directory"
echo "    2. python3 -m http.server 8000"
echo "    3. Open http://localhost:8000"
echo ""
