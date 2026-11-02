"""Split the Friend at Court text (pdftotext -layout) into searchable entries.

usage: python3 -I parse_fac.py <fac.txt> <out.json>
"""
import json
import re
import sys
from collections import Counter

src, out_path = sys.argv[1], sys.argv[2]
raw = open(src, encoding='utf-8').read()
SOFT_HYPHEN = chr(0xAD)
raw = raw.replace(SOFT_HYPHEN, '').replace('\t', '    ')
raw = re.sub('[\x00-\x08\x0b\x0e-\x1f]', '', raw)                 # bell chars etc. (keeps \f)
raw = re.sub('[' + chr(0xA0) + chr(0x2000) + '-' + chr(0x200B) + ']', ' ', raw)  # odd spaces
pages = raw.split('\f')

VOCAB = Counter(w.lower() for w in re.findall(r'[A-Za-z][a-z]{2,}', raw))

# ── 1. Lines tagged with their printed page number; running headers/footers removed ──
RUNNING = r'(RULES OF TENNIS|THE CODE|USTA REGULATIONS.*|USTA EMERGENCY CARE GUIDELINES|GLOSSARY|INDEX|UMPIRE.*|PART 5.*?)'
HEADER_RES = [
    re.compile(r'^\s*(\d{1,3})\s+' + RUNNING + r'\s*$'),
    re.compile(r'^\s*' + RUNNING + r'\s+(\d{1,3})\s*$'),
    re.compile(r'^\s*(\d{1,3})\s*$'),
    re.compile(r'^\s*([ivx]{1,4})\s*$'),
]


def page_number(lines):
    for ln in lines[:3] + lines[-4:]:
        for rx in HEADER_RES[:3]:
            m = rx.match(ln)
            if m:
                for g in m.groups():
                    if g and g.isdigit():
                        return int(g)
    return None


tagged = []  # (page, line)
for pg in pages:
    lines = pg.split('\n')
    num = page_number(lines)
    for ln in lines:
        if any(rx.match(ln) for rx in HEADER_RES):
            continue
        tagged.append((num, ln.rstrip()))
text_lines = [l for _, l in tagged]


def find(pattern, start=0):
    rx = re.compile(pattern)
    for i in range(start, len(text_lines)):
        if rx.search(text_lines[i]):
            return i
    raise SystemExit(f'not found: {pattern}')


i_rules = find(r'^\s*FOREWORD\s*$')
i_code = find(r'PART 2—THE CODE')
i_regs = find(r'^I\. PRE-TOURNAMENT REGULATIONS\s*$', i_code)
i_emerg = find(r'PART 4—USTA EMERGENCY CARE GUIDELINES')
i_ump = find(r'^I\. USTA POLICY\s*$', i_emerg)
i_gloss = find(r'PART 6—GLOSSARY')
i_index = find(r'PART 7—INDEX')


# ── helpers ──
def fix_dropcaps(s):
    # "F lagrant" -> "Flagrant", "A ny" -> "Any": a capital split off the rest of its word
    def split(m):
        joined = (m.group(1) + m.group(2)).lower()
        return m.group(1) + m.group(2) if VOCAB[joined] > VOCAB[m.group(2).lower()] else m.group(0)
    s = re.sub(r'\b([A-Z]) ([a-z]{2,})\b', split, s)

    # "eferee determines ... the R ball" -> "Referee determines ... the ball":
    # the drop cap landed later in the paragraph; put it back at the start
    def lost(m):
        w = m.group(2)
        best = max('ABCDEFGHIJKLMNOPQRSTUVWXYZ', key=lambda c: VOCAB[(c + w).lower()])
        if VOCAB[(best + w).lower()] > 3 * VOCAB[w.lower()]:
            return m.group(1) + best + w
        return m.group(0)
    fixed = re.sub(r'(^|\n|\d\.\s+)([a-z]{3,})', lost, s)
    if fixed != s:
        lead = re.match(r'(?:\d\.\s+)?([A-Z])', fixed)
        if lead:  # drop the stray capital left in the first lines
            fixed = re.sub(r'(?<=[a-z,]) ' + lead.group(1) + r' (?=[a-z])', ' ', fixed, count=1)
    return fixed


def tidy(lines):
    """Join wrapped lines into paragraphs; list items, cases and comments start new lines."""
    paras, cur = [], ''
    for ln in lines:
        s = re.sub(r'\s+', ' ', ln).strip()
        if not s:
            if cur:
                paras.append(cur)
                cur = ''
            continue
        new_item = re.match(r'^(•|u |[a-z]\. |[ivx]+\. |\(?\d{1,2}[.)] |Case \d+:|Decision:|Note:|USTA Comment|FAC Comment)', s)
        if cur and new_item:
            paras.append(cur)
            cur = s
        elif cur:
            if cur.endswith('-') and not cur.endswith(' -') and s[:1].islower():
                cur = cur[:-1] + s
            else:
                cur = cur + ' ' + s
        else:
            cur = s
    if cur:
        paras.append(cur)
    return '\n'.join(p for p in paras if p)


SMALL = {'and', 'or', 'of', 'the', 'in', 'on', 'to', 'a', 'an', 'for', 'by', '&', 'at'}


def title_case(s):
    words = s.lower().split()
    return ' '.join(w if (i and w in SMALL) else w[:1].upper() + w[1:] for i, w in enumerate(words))


def first_sentence(s):
    s = re.sub(r'^(\d{1,2}\.\s*|Case \d+:\s*|USTA Comment[\s\d.]*:\s*|FAC Comment \S+:\s*)', '', s)
    q = re.match(r'^(.{8,160}?\?)', s)  # cases and comments usually open with the question
    if q:
        return q.group(1)
    return re.split(r'(?<=[a-z\)”’])[.?:]\s', s + ' ', maxsplit=1)[0].strip().rstrip('.')


entries = []


class Builder:
    def __init__(self, part):
        self.part = part
        self.cur = None

    def start(self, ref, title, crumb, page, first=''):
        self.flush()
        self.cur = {'part': self.part, 'ref': ref, 'title': title, 'crumb': crumb, 'page': page, 'lines': [first] if first else []}

    def add(self, line):
        if self.cur is not None:
            self.cur['lines'].append(line)

    def flush(self):
        c, self.cur = self.cur, None
        if not c:
            return
        body = fix_dropcaps(tidy(c.pop('lines')))
        if not body:
            return
        title = c['title'] if c['title'] is not None else first_sentence(body)
        if len(title) < 3:
            title = c['crumb'].split(' · ')[-1]
        c['title'] = fix_dropcaps(title)[:140]
        c['text'] = body
        entries.append(c)


ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI',
          'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII']

# ── 2. Part 1: ITF Rules of Tennis ──
b = Builder('rules')
RULE_RE = re.compile(r'^\s{0,12}(\d{1,2})\.\s+([A-Z][A-Z ,&’\'\-]{3,})$')
CASE_RE = re.compile(r'^\s*Case (\d+):')
COMMENT_RE = re.compile(r'^\s*USTA Comment\s*([\d.]*)\s*:')
APPX_RE = re.compile(r'^\s*APPENDIX ([IVX]+)\s*$')
rule_no, rule_title, in_appx, next_rule = None, 'Foreword', False, 1
b.start('ITF Foreword', 'Foreword', 'ITF Rules of Tennis', tagged[i_rules][0])
i = i_rules + 1
while i < i_code:
    pg, ln = tagged[i]
    s = ln.strip()
    m = APPX_RE.match(ln)
    if m:
        j = i + 1
        while j < i_code and not text_lines[j].strip():
            j += 1
        rule_no, rule_title, in_appx = f'Appendix {m.group(1)}', title_case(text_lines[j].strip()), True
        b.start(rule_no, rule_title, 'ITF Rules · Appendices', pg)
        i = j + 1
        continue
    if s in ('RULES OF WHEELCHAIR TENNIS', 'AMENDMENT TO THE RULES OF TENNIS'):
        rule_no = rule_title = title_case(s)
        b.start(rule_no, rule_title, 'ITF Rules of Tennis', pg)
        i += 1
        continue
    m = RULE_RE.match(ln)
    if m and not in_appx and int(m.group(1)) == next_rule:
        next_rule += 1
        rule_no, rule_title = f'Rule {m.group(1)}', title_case(m.group(2))
        b.start(rule_no, rule_title, 'ITF Rules of Tennis', pg)
        i += 1
        continue
    m = CASE_RE.match(ln)
    if m and rule_no:
        b.start(f'{rule_no}, Case {m.group(1)}', None, f'ITF Rules · {rule_no} · {rule_title}', pg, s)
        i += 1
        continue
    m = COMMENT_RE.match(ln)
    if m and rule_no:
        num = m.group(1).rstrip('.')
        ref = f'USTA Comment {num}' if num else f'{rule_no}, USTA Comment'
        b.start(ref, None, f'ITF Rules · {rule_no} · {rule_title}', pg, s)
        i += 1
        continue
    b.add(ln)
    i += 1
b.flush()

# ── 3. Part 2: The Code ──
b = Builder('code')
SECTION_RE = re.compile(r'^\s{10,}([A-Z][A-Z \-]{3,})\s*$')
ITEM_RE = re.compile(r'^\s{0,8}(\d{1,2})\.\s+(\S.*)')
section, next_item = 'Preface', 1
b.start('Code Preface', 'The Code — Preface', 'The Code', tagged[i_code][0])
for i in range(i_code + 1, i_regs):
    pg, ln = tagged[i]
    m = SECTION_RE.match(ln)
    if m and 'PART' not in ln:
        section = title_case(m.group(1))
        continue
    m = ITEM_RE.match(ln)
    if m and int(m.group(1)) == next_item:
        next_item += 1
        b.start(f'Code {m.group(1)}', None, f'The Code · {section}', pg, ln)
        continue
    b.add(ln)
b.flush()


# ── 4. Part 3 + Part 5: hierarchical regulations (strictly sequential numbering) ──
def parse_regs(start, end, part, prefix, crumb_root):
    b = Builder(part)
    ROMAN_RE = re.compile(r'^([IVX]+)\.\s+([A-Z][A-Z ,&’\'\-—]+)$')
    LETTER_RE = re.compile(r'^\s{0,3}([A-Z])\.\s+(\S.*)$')
    NUM_RE = re.compile(r'^\s{0,8}(\d{1,2})\.\s*(.*)$')
    FAC_RE = re.compile(r'^\s*FAC Comment ([IVX]+\.[A-Z]+-\d+):')
    TABLE_RE = re.compile(r'^\s*(?:USTA\s+)?TABLE (\d+)\.?\s*(.*)$')
    roman = roman_t = letter = letter_t = None
    next_roman, next_letter, next_num = 0, 'A', 1
    in_table = False
    i = start
    while i < end:
        pg, ln = tagged[i]
        m = ROMAN_RE.match(ln)
        if m and next_roman < len(ROMANS) and m.group(1) == ROMANS[next_roman]:
            title = m.group(2).strip()
            j = i + 1  # heading may wrap onto a second all-caps line
            if j < end and re.match(r'^\s+[A-Z][A-Z ,&’\'\-—]+$', text_lines[j]):
                title += ' ' + text_lines[j].strip()
                i = j
            next_roman += 1
            roman, roman_t, letter, letter_t = m.group(1), title_case(title), None, None
            next_letter, next_num, in_table = 'A', 1, False
            b.start(f'{prefix}{roman}.', roman_t, crumb_root, pg)
            i += 1
            continue
        m = LETTER_RE.match(ln)
        if m and roman and m.group(1) == next_letter:
            letter, letter_t = m.group(1), m.group(2).strip()
            next_letter, next_num, in_table = chr(ord(letter) + 1), 1, False
            b.start(f'{prefix}{roman}.{letter}.', letter_t, f'{crumb_root} · {roman}. {roman_t}', pg)
            i += 1
            continue
        m = FAC_RE.match(ln)
        if m:
            in_table = False
            where = f'{roman}.{letter}. {letter_t}' if letter else f'{roman}. {roman_t}'
            b.start(f'FAC Comment {m.group(1)}', None, f'{crumb_root} · {where}', pg, ln)
            i += 1
            continue
        m = TABLE_RE.match(ln)
        if m:
            t = m.group(2).strip()
            if not t:
                j = i + 1
                while j < end and not text_lines[j].strip():
                    j += 1
                t = text_lines[j].strip()
            in_table = True
            b.start(f'Table {m.group(1)}', title_case(t) if t.isupper() else t, f'{crumb_root} · Tables', pg)
            i += 1
            continue
        m = NUM_RE.match(ln)
        if m and letter and int(m.group(1)) in (next_num, next_num + 1):
            rest, j = m.group(2).strip(), i
            if not rest:  # title on the following line
                j = i + 1
                while j < end and not text_lines[j].strip():
                    j += 1
                rest = text_lines[j].strip()
            next_num, in_table = int(m.group(1)) + 1, False
            b.start(f'{prefix}{roman}.{letter}.{m.group(1)}.', None, f'{crumb_root} · {roman}.{letter}. {letter_t}', pg, rest)
            i = j + 1
            continue
        b.add(ln)
        i += 1
    b.flush()


parse_regs(i_regs, i_emerg, 'regs', 'Reg. ', 'USTA Regulations')

# ── 5. Part 4: Emergency care (all-caps headings) ──
b = Builder('other')
b.start('Part 4', 'USTA Emergency Care Guidelines', 'Part 4 · Emergency Care', tagged[i_emerg][0])
for i in range(i_emerg + 1, i_ump):
    pg, ln = tagged[i]
    s = ln.strip()
    if re.match(r'^[A-Z][A-Z /&,\-’\']{5,}$', s) and len(s) < 60:
        b.start('Part 4', title_case(s), 'Part 4 · Emergency Care', pg)
        continue
    b.add(ln)
b.flush()

parse_regs(i_ump, i_gloss, 'other', 'Part 5 ', 'Part 5 · Umpires')

# ── 6. Part 6: Glossary ──
b = Builder('glossary')
TERM_RE = re.compile(r'^\s{3,8}([0-9A-Z][^.:]{1,60}?)[.:]\s+(.*)$')
for i in range(i_gloss + 1, i_index):
    pg, ln = tagged[i]
    m = TERM_RE.match(ln)
    if m and 'PART' not in ln:
        b.start('Glossary', m.group(1).strip(), 'Glossary', pg, ln)
        continue
    b.add(ln)
b.flush()

# ── 7. Output ──
out = [{'id': n, **{k: e[k] for k in ('part', 'ref', 'title', 'crumb', 'page', 'text')}} for n, e in enumerate(entries)]
json.dump(out, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'entries', dict(Counter(e['part'] for e in out)))
