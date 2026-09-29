#!/usr/bin/env python3
"""Fragt auf echten Minecraft-Servern ab, welche Attribute jeder Mob hat (und mit welchem Standardwert).

Aufruf: python3 tools/probe_attributes.py <server-ordner>... > tools/mob_attributes.json
Jeder <server-ordner> enthält eine server.jar; die Version wird aus dem Ordnernamen gelesen (z. B. srv-26.3).
Für 26.x wird Java 25 gebraucht (Pfad über JAVA25=…), sonst Java 21 (JAVA21=…).

Ergebnis: { mob-id: { attribut (ohne „generic.“): Standardwert } } – Vereinigung über alle geprüften Versionen.
"""
import json, os, queue, re, shutil, subprocess, sys, tempfile, threading, time, glob

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(tempfile.gettempdir(), 'mc-tools-cache')


def load_js(name):
    txt = open(os.path.join(HERE, '..', 'js', name), encoding='utf-8').read()
    return json.loads(txt[txt.index('= ') + 2:].rstrip().rstrip(';'))


MC = load_js('mcdata.js')
MOBS = load_js('mobdata.js')['mobs']
VERSIONS = [v['id'] for v in MC['versions']]
short = lambda a: re.sub(r'^(generic|player|zombie|horse)\.', '', a)


def attributes_of(version):
    p = glob.glob(os.path.join(CACHE, f'{version}-registries', '*', 'attribute', 'data.min.json'))
    return json.load(open(p[0]))


def probe(folder):
    version = os.path.basename(folder.rstrip('/')).replace('srv-', '')
    vi = VERSIONS.index(version)
    java = os.environ.get('JAVA25' if version.startswith('26') else 'JAVA21', 'java')
    for x in ('world', 'logs'):
        shutil.rmtree(os.path.join(folder, x), ignore_errors=True)
    open(os.path.join(folder, 'eula.txt'), 'w').write('eula=true\n')
    open(os.path.join(folder, 'server.properties'), 'w').write(
        'online-mode=false\nlevel-type=minecraft\\:flat\ngenerate-structures=false\nview-distance=3\nsimulation-distance=3\nserver-port=25598\n')
    p = subprocess.Popen([java, '-Xmx3G', '-jar', 'server.jar', 'nogui'], cwd=folder, stdin=subprocess.PIPE,
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    q = queue.Queue()
    threading.Thread(target=lambda: [q.put(l.rstrip('\n')) for l in p.stdout], daemon=True).start()
    while 'Done (' not in q.get(timeout=300):
        pass

    def send(lines, wait):
        while not q.empty():
            q.get_nowait()
        p.stdin.write(''.join(l + '\n' for l in lines))
        p.stdin.flush()
        out, end = [], time.time() + wait
        while time.time() < end:
            try:
                out.append(q.get(timeout=max(0.01, end - time.time())))
            except queue.Empty:
                pass
        return [l for l in out if '/INFO]' in l or '/WARN]' in l]

    send(['forceload add -16 -16 64 64', 'gamerule doMobSpawning false', 'gamerule mob_spawning false'], 2)
    attrs = attributes_of(version)
    result = {}
    for i, m in enumerate(MOBS):
        if not (m['avail'][0] <= vi <= m['avail'][1]):
            continue
        tag = f'p{i}'
        send([f'summon {m["id"]} {4 + (i % 12) * 4} 101 {4 + (i // 12) * 4} {{NoAI:1b,NoGravity:1b,Invulnerable:1b,Tags:["{tag}"]}}'], 0.3)
        out = send([f'attribute @e[tag={tag},limit=1] minecraft:{a} base get' for a in attrs], 1.2)
        answers = [l for l in out if 'attribute' in l.lower() or 'no attribute' in l.lower() or 'Base value' in l]
        if len(answers) != len(attrs):
            print(f'  {version} {m["id"]}: {len(answers)}/{len(attrs)} Antworten', file=sys.stderr)
            continue
        res = {}
        for a, line in zip(attrs, answers):
            v = re.search(r' is (-?[\d.]+(?:E-?\d+)?)\s*$', line)
            if v:
                res[short(a)] = float(v.group(1))
        result[m['id']] = res
        send([f'kill @e[tag={tag}]'], 0.1)
    p.stdin.write('stop\n')
    p.stdin.flush()
    p.wait(timeout=60)
    return result


if __name__ == '__main__':
    merged = {}
    for folder in sys.argv[1:]:
        print('prüfe', folder, file=sys.stderr)
        for mob, attrs in probe(folder).items():
            merged.setdefault(mob, {}).update(attrs)
    print(json.dumps(merged, indent=1, sort_keys=True))
