"""Flacht die geparsten Entity-Schemas pro Version zu Feldlisten ab."""
import json
from mcdoc_parse import Schema, vkey

# Strukturen, deren Felder als „allgemein“ gelten (nicht mob-spezifisch)
BASE_STRUCTS = {'EntityBase', 'LivingEntity', 'MobBase', 'FallDamageLogicData'}
# Namen, die als komplexe Objekte stehen bleiben (werden in der App gesondert behandelt)
OPAQUE = {'ItemStack', 'Text', 'AnyEntity', 'CustomData', 'MobEffectInstance', 'Attribute', 'Memories',
          'EntityEquipment', 'DropChances', 'Offers', 'SlottedItem', 'BlockState', 'ItemStackOfComponent'}


def active(attrs, v):
    if not attrs:
        return True
    s, u = attrs.get('since'), attrs.get('until')
    if s and vkey(v) < vkey(s):
        return False
    if u and vkey(v) >= vkey(u):
        return False
    return True


class Flattener:
    def __init__(self, schema):
        self.s = schema

    def lookup(self, name, module):
        full = self.s.resolve(name, module)
        return (full, self.s.structs[full]) if full else (None, None)

    def simplify(self, t, module, v, depth=0):
        attrs = t.get('attrs', {})
        k = t['k']
        out = {}
        if 'range' in t:
            out['range'] = t['range']
        if k in ('boolean', 'byte', 'short', 'int', 'long', 'float', 'double', 'any'):
            return {'k': k, **out}
        if k == 'string':
            if 'id' in attrs:
                idattr = attrs['id']
                reg = idattr if isinstance(idattr, str) else idattr.get('registry')
                tags = None if isinstance(idattr, str) else idattr.get('tags')
                res = {'k': 'id', 'reg': reg}
                if tags:
                    res['tags'] = tags
                return res
            if attrs.get('uuid'):
                return {'k': 'uuid'}
            return {'k': 'string'}
        if k == 'lit':
            return {'k': 'lit', 'v': t['v']}
        if k == 'union':
            alts = [a for a in t['alts'] if active(a.get('attrs'), v)]
            if len(alts) == 1:
                return self.simplify(alts[0], module, v, depth)
            simp = [self.simplify(a, module, v, depth) for a in alts]
            if simp and all(x['k'] == 'lit' for x in simp):
                return {'k': 'enum', 'base': 'string', 'values': [[x['v'], str(x['v']), ''] for x in simp]}
            if simp and all(x['k'] == 'enum' for x in simp) and len({x['base'] for x in simp}) == 1:
                # z. B. Shulker-Farbe: Farbstoff-Farben + „16 = normal“
                return {'k': 'enum', 'base': simp[0]['base'], 'values': [v for x in simp for v in x['values']],
                        'name': '+'.join(str(x.get('name')) for x in simp)}
            return {'k': 'union', 'alts': simp}
        if k == 'list':
            return {'k': 'list', 'of': self.simplify(t['of'], module, v, depth + 1), **({'size': t['size']} if 'size' in t else {})}
        if k == 'array':
            res = {'k': 'array', 'of': t['of']['k'], **({'size': t['size']} if 'size' in t else {})}
            if attrs.get('uuid'):
                res['uuid'] = True
            return res
        if k == 'struct':
            if depth > 2:
                return {'k': 'struct', 'name': t.get('name'), 'deep': True}
            return {'k': 'struct', 'name': t.get('name'), 'fields': self.fields(t, module, v, depth + 1)}
        if k == 'enum':
            vals = [[e['value'], e['key'], ' '.join(e['doc'])] for e in t['values'] if active(e['attrs'], v)]
            return {'k': 'enum', 'base': t['base'], 'values': vals, 'name': t.get('name')}
        if k == 'ref':
            short = t['name'].split('::')[-1]
            if short in OPAQUE:
                return {'k': 'opaque', 'name': short}
            full, decl = self.lookup(t['name'], module)
            if not decl:
                return {'k': 'opaque', 'name': short}
            body, mod, docs = decl
            if body['k'] == 'struct' and depth > 2:
                return {'k': 'struct', 'name': short, 'deep': True}
            res = self.simplify(body, mod, v, depth)
            if res['k'] == 'struct':
                res['name'] = short
            if attrs.get('id') and res['k'] == 'string':
                return self.simplify({**t, 'k': 'string'}, module, v, depth)
            return res
        if k == 'dispatch':
            return {'k': 'opaque', 'name': t['name']}
        return {'k': 'opaque', 'name': k}

    def fields(self, struct_t, module, v, depth=0, origin=None, seen=None):
        """Liefert {name: (desc, doc, origin)} für eine Struktur in Version v."""
        seen = seen or set()
        res = {}
        name = struct_t.get('name') or origin
        for m in struct_t['members']:
            if not active(m.get('attrs'), v):
                continue
            if 'spread' in m:
                sp = m['spread']
                if not active(sp.get('attrs'), v):
                    continue
                if sp['k'] == 'struct':
                    res.update(self.fields(sp, module, v, depth, name, seen))
                elif sp['k'] == 'ref':
                    full, decl = self.lookup(sp['name'], module)
                    if not decl or full in seen:
                        continue
                    body, mod, docs = decl
                    if body['k'] == 'struct':
                        res.update(self.fields(body, mod, v, depth, full.split('::')[-1], seen | {full}))
                    elif body['k'] == 'union':
                        for alt in body['alts']:
                            if active(alt.get('attrs'), v) and alt['k'] == 'struct':
                                res.update(self.fields(alt, mod, v, depth, full.split('::')[-1], seen | {full}))
                elif sp['k'] == 'union':
                    for alt in sp['alts']:
                        if active(alt.get('attrs'), v) and alt['k'] == 'struct':
                            res.update(self.fields(alt, module, v, depth, name, seen))
                continue
            if isinstance(m['name'], dict):
                continue
            desc = self.simplify(m['type'], module, v, depth)
            res[m['name']] = (desc, ' '.join(m['doc']).strip(), name)
        return res

    def entity(self, eid, v):
        """Felder eines Entities in Version v, oder None wenn es das Entity dort nicht gibt."""
        for typ, attrs, mod in self.s.dispatch.get(eid, []):
            if not active(attrs, v):
                continue
            if typ['k'] == 'struct':
                return self.fields(typ, mod, v, 0, typ.get('name'))
            if typ['k'] == 'ref':
                full, decl = self.lookup(typ['name'], mod)
                if decl:
                    body, m2, docs = decl
                    if body['k'] == 'struct':
                        return self.fields(body, m2, v, 0, full.split('::')[-1], {full})
        return None
