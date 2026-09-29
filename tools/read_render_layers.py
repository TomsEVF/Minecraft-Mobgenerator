"""Liest aus dem Minecraft-Client (ab 26.1 unverschleiert), welcher Mob welche Ausrüstung sichtbar zeichnet.

Aufruf: python3 tools/read_render_layers.py <client.jar> tools/render_layers.json
Braucht ein JDK (javap). Ergebnis: Mob-ID → Liste der Render-Ebenen (Rüstung, Hände, Kopf, Körper …).
"""
import json, re, subprocess, sys, functools

JAR = sys.argv[1]
PKG = 'net/minecraft/client/renderer/entity/'


def javap(cls, *flags):
    return subprocess.run(['javap', *flags, '-p', '-cp', JAR, cls.replace('/', '.')], capture_output=True, text=True).stdout


reg = javap(PKG + 'EntityRenderers', '-c', '-v', '-constants')
# Bootstrap-Methoden: Index -> Ziel (Konstruktor oder Lambda)
boot = {}
bs = reg.split('BootstrapMethods:')[1] if 'BootstrapMethods:' in reg else ''
for m in re.finditer(r'\n\s*(\d+): #\d+ REF_invokeStatic java/lang/invoke/LambdaMetafactory\.metafactory.*?\n\s*Method arguments:\n(.*?)(?=\n\s*\d+: #|\Z)', bs, re.S):
    idx = int(m.group(1))
    args = m.group(2)
    t = re.search(r'REF_newInvokeSpecial ([\w/$]+)\."<init>"', args)
    l = re.search(r'REF_invokeStatic [\w/$]+\.(lambda\$[\w$]+)', args)
    boot[idx] = ('new', t.group(1)) if t else ('lambda', l.group(1)) if l else None

# Lambdas: erste erzeugte Renderer-Klasse
lambda_target = {}
for m in re.finditer(r'private static [^\n]*?(lambda\$[\w$]+)\([^\n]*\n\s*descriptor.*?\n\s*flags.*?\n\s*Code:\n(.*?)(?=\n\n)', reg, re.S):
    n = re.search(r'new\s+#\d+\s+// class ([\w/$]+Renderer[\w$]*)', m.group(2))
    if n:
        lambda_target[m.group(1)] = n.group(1)

# static init: EntityType.X gefolgt von invokedynamic
static = reg.split('static {};')[1]
mapping = {}
cur = None
for line in static.split('\n'):
    g = re.search(r'getstatic.*// Field net/minecraft/world/entity/EntityTypes?\.([A-Z0-9_]+):', line)
    if g:
        cur = g.group(1).lower()
        continue
    d = re.search(r'invokedynamic #\d+,\s*0\s*// InvokeDynamic #(\d+):', line)
    if d and cur:
        b = boot.get(int(d.group(1)))
        if b:
            cls = b[1] if b[0] == 'new' else lambda_target.get(b[1])
            if cls:
                mapping[cur] = cls
        cur = None


@functools.lru_cache(None)
def class_info(cls):
    out = javap(cls, '-v')
    sup = re.search(r'super_class: #\d+\s*// ([\w/$]+)', out)
    refs = set(re.findall(r'= Class\s+#?\d*\s*// ([\w/$]+)', out)) | set(re.findall(r'// class ([\w/$]+)', out))
    return (sup.group(1) if sup else None), refs


def layers_of(cls):
    found = set()
    seen = 0
    while cls and cls.startswith('net/minecraft') and seen < 10:
        sup, refs = class_info(cls)
        if cls.split('/')[-1] in ('LivingEntityRenderer', 'MobRenderer', 'AgeableMobRenderer', 'EntityRenderer'):
            cls = sup
            seen += 1
            continue
        for r in refs:
            if '/layers/' in r and r.endswith('Layer'):
                found.add(r.split('/')[-1])
            # anonyme innere Klassen (z. B. VindicatorRenderer$1 extends ItemInHandLayer)
            if r.startswith(cls + '$'):
                isup, _ = class_info(r)
                if isup and '/layers/' in isup:
                    found.add(isup.split('/')[-1])
        cls = sup
        seen += 1
    return sorted(found)


res = {e: {'renderer': c.split('/')[-1], 'layers': layers_of(c)} for e, c in sorted(mapping.items())}
# Mannequin wird über den Spieler-Renderer (Avatar) gezeichnet – gleiche Ebenen wie ein Spieler
res.setdefault('mannequin', {'renderer': 'AvatarRenderer', 'layers': ['CustomHeadLayer', 'HumanoidArmorLayer', 'PlayerItemInHandLayer', 'WingsLayer']})
# nur die für Ausrüstung relevanten Ebenen behalten
KEEP = {'HumanoidArmorLayer', 'CustomHeadLayer', 'ItemInHandLayer', 'PlayerItemInHandLayer', 'CrossedArmsItemLayer', 'FoxHeldItemLayer',
        'PandaHoldsItemLayer', 'DolphinCarryingItemLayer', 'WitchItemLayer', 'WingsLayer', 'SimpleEquipmentLayer', 'WolfArmorLayer', 'LlamaDecorLayer'}
res = {e: sorted(set(r['layers']) & KEEP) for e, r in res.items()}
res = {e: l for e, l in res.items() if l}
json.dump(res, open(sys.argv[2] if len(sys.argv) > 2 else 'render_layers.json', 'w'), indent=1, sort_keys=True)
for e, l in res.items():
    print(f"{e:22s} {' '.join(x.replace('Layer', '') for x in l)}")
