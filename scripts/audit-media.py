"""Decode every shipped audio file and inventory local data references."""
import concurrent.futures
import json
import hashlib
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/audit-fonctionnel-2026-11-15'
OUT.mkdir(parents=True, exist_ok=True)
PAGES = ['index.html', 'courses/francais_cp/index.html', 'courses/english_starship_1/index.html']
references = []
counts = {}
def walk(value, origin, key=''):
    if isinstance(value, dict):
        for k, v in value.items(): walk(v, origin, str(k))
    elif isinstance(value, list):
        for v in value: walk(v, origin, key)
    elif isinstance(value, str) and key not in {'name','source'} and re.search(r'\.(mp3|wav|ogg|webp|png|jpe?g|svg|ttf|woff2?|pdf)$', value, re.I) and not value.startswith(('data:', 'http:', 'https:')):
        # The runtime resolver maps shared assets to the project root.
        normalized = re.sub(r'^(\.\./)*assets/', 'assets/', value)
        p = ROOT / normalized if normalized.startswith('assets/') else (ROOT / origin).parent / value
        references.append({'page': origin, 'key': key, 'value': value, 'exists': p.is_file()})
for page in PAGES:
    text = (ROOT / page).read_text(encoding='utf-8')
    for attrs, content in re.findall(r'<script\b([^>]*)>([\s\S]*?)</script>', text, re.I):
        if 'application/json' in attrs:
            data = json.loads(content)
            walk(data, page)
            if 'english' in data:
                en = data['english']
                counts[page] = {'frenchLessons': len(data.get('course', [])), 'englishLessons': len(en.get('lessons', [])), 'englishQuestions': len(en.get('questions', [])), 'englishRecordings': len(en.get('audio', {}))}
files = sorted({p for base in [ROOT/'assets', ROOT/'courses'] for p in base.rglob('*') if p.suffix.lower() in {'.mp3', '.wav', '.ogg', '.m4a'}})
def decode(p):
    try:
        result = subprocess.run(['ffmpeg', '-hide_banner', '-v', 'error', '-i', str(p), '-f', 'null', '-'], capture_output=True, text=True, timeout=45)
        return {'file': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size, 'ok': result.returncode == 0 and p.stat().st_size > 0, 'error': result.stderr[:600]}
    except Exception as e:
        return {'file': p.relative_to(ROOT).as_posix(), 'ok': False, 'error': str(e)}
if '--references-only' in sys.argv and (OUT/'media.json').exists():
    audio = json.loads((OUT/'media.json').read_text(encoding='utf-8'))['audio']
else:
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        audio = list(pool.map(decode, files))
hashes = {hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
report = {'pages': counts, 'references': len(references), 'missingReferences': [r for r in references if not r['exists']], 'audioFiles': len(audio), 'uniqueAudioContents': len(hashes), 'audioFailures': [a for a in audio if not a['ok']], 'audio': audio}
(OUT/'media.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k != 'audio'}, ensure_ascii=True))
sys.exit(bool(report['audioFailures']))
