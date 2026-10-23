#!/usr/bin/env python3
"""Report CSS rules whose classes appear nowhere in index.html or js/*.js.
usage: python tools/css_audit.py css/styles.css [--strip out.css]
A class counts as used if its name appears as a word in the markup or any script
(covers templates and classList/className strings). Rules that mention only
unused classes are "dead". Nothing is changed unless --strip is given."""
import re, sys, glob, os

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
path = sys.argv[1]
css = open(os.path.join(root, path) if not os.path.isabs(path) else path, encoding='utf-8').read()

corpus = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
for f in glob.glob(os.path.join(root, 'js', '*.js')):
    corpus += open(f, encoding='utf-8').read()
words = set(re.findall(r'[A-Za-z0-9_-]+', corpus))

def blocks(text):
    """split into top-level chunks: (kind, header, body, start, end)"""
    out, i, n = [], 0, len(text)
    while i < n:
        m = re.compile(r'\s*').match(text, i); i = m.end()
        if i >= n: break
        if text.startswith('/*', i):
            j = text.index('*/', i) + 2; out.append(('comment', text[i:j], '', i, j)); i = j; continue
        j = text.index('{', i); header = text[i:j].strip()
        depth, k = 1, j + 1
        while depth:
            c = text[k]
            if c == '{': depth += 1
            elif c == '}': depth -= 1
            k += 1
        out.append(('rule', header, text[j + 1:k - 1], i, k)); i = k
    return out

def dead_selector(sel):
    classes = re.findall(r'\.([A-Za-z_][\w-]*)', sel)
    return bool(classes) and any(c not in words for c in classes)

def dead_rule(header):
    if header.startswith('@keyframes'):
        name = header.split()[1]
        return name not in words and False  # keep keyframes; checked separately
    sels = [s.strip() for s in header.split(',')]
    return all(dead_selector(s) for s in sels)

dead, keep_parts, dead_n = [], [], 0
for kind, header, body, a, b in blocks(css):
    if kind == 'comment':
        keep_parts.append(css[a:b]); continue
    if header.startswith('@media'):
        inner = blocks(body); keep_inner = []
        for k2, h2, b2, a2, e2 in inner:
            if k2 == 'comment': keep_inner.append(body[a2:e2]); continue
            if dead_rule(h2): dead.append(f'  [@media] {h2[:90]}'); dead_n += 1
            else: keep_inner.append(body[a2:e2])
        if any(x.strip().startswith(('.', '#', '@', '*', ':', 'html', 'body', 'a', 'h', 'p', 'b', 'i', 'u', 'l', 'n', 's', 'f', 'e', 'd', 'm', 'v', 'i', 'r', 't', 'w', 'c')) and not x.startswith('/*') for x in keep_inner):
            keep_parts.append(header + ' {\n' + '\n'.join('  ' + x.replace('\n', '\n  ') for x in keep_inner) + '\n}')
        continue
    if header.startswith('@keyframes'):
        name = header.split()[1]
        used = name in words or any(name in css[a2:b2] for _, h2, _, a2, b2 in blocks(css) if h2 != header and not h2.startswith('@keyframes'))
        (keep_parts if used else dead).append(css[a:b] if used else f'  @keyframes {name}')
        if not used: dead_n += 1
        continue
    if dead_rule(header): dead.append(f'  {header[:100]}'); dead_n += 1
    else: keep_parts.append(css[a:b])

print(f'{dead_n} dead rules of {len(blocks(css))} top-level blocks')
print('\n'.join(dead))
if '--strip' in sys.argv:
    out = sys.argv[sys.argv.index('--strip') + 1]
    open(out, 'w', encoding='utf-8', newline='\n').write('\n\n'.join(keep_parts) + '\n')
    print('wrote', out, len('\n\n'.join(keep_parts).splitlines()), 'lines')
