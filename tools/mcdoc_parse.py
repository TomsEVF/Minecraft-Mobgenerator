"""Minimaler mcdoc-Parser für die Entity-Schemas von SpyglassMC/vanilla-mcdoc.

Liest java/world/entity/** und java/util/**, löst Struct-Spreads, Enums und Typ-Aliase auf
und liefert pro Entity die Felder mit Versionsbereich (since/until).
"""
import os, re, json, glob

TOKEN_RE = re.compile(r'''
    (?P<doc>///[^\n]*)
  | (?P<comment>//[^\n]*)
  | (?P<ws>\s+)
  | (?P<str>"(?:\\.|[^"\\])*")
  | (?P<spread>\.\.\.)
  | (?P<range>\.\.)
  | (?P<num>-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[bBsSlLfFdD]?)
  | (?P<path>(?:::)?[A-Za-z_%][A-Za-z0-9_%]*(?:(?:::|:|/|\.)[A-Za-z_%][A-Za-z0-9_%/]*)*)
  | (?P<punct>\[\[|\]\]|[{}\[\]()<>,?|@=#:;*<])
''', re.X)


def tokenize(src):
    out = []
    pos = 0
    while pos < len(src):
        m = TOKEN_RE.match(src, pos)
        if not m:
            raise SyntaxError(f'Unerwartetes Zeichen {src[pos]!r} bei {pos}')
        kind = m.lastgroup
        val = m.group(kind)
        pos = m.end()
        if kind in ('ws', 'comment'):
            continue
        if kind == 'doc':
            out.append(('doc', val[3:].strip()))
        else:
            out.append((kind, val))
    out.append(('eof', None))
    return out


def vkey(v):
    if v is None:
        return None
    parts = [int(x) for x in re.findall(r'\d+', v)]
    return tuple(parts + [0] * (3 - len(parts)))


class Parser:
    def __init__(self, tokens, module):
        self.t = tokens
        self.i = 0
        self.module = module

    def peek(self, k=0):
        return self.t[self.i + k]

    def next(self):
        tok = self.t[self.i]
        self.i += 1
        return tok

    def accept(self, val):
        if self.peek()[1] == val:
            self.i += 1
            return True
        return False

    def expect(self, val):
        tok = self.next()
        if tok[1] != val:
            raise SyntaxError(f'{self.module}: erwartet {val!r}, gefunden {tok!r} (#{self.i})')
        return tok

    # ---------- Hilfen ----------
    def docs(self):
        lines = []
        while self.peek()[0] == 'doc':
            lines.append(self.next()[1])
        return lines

    def attr_value(self):
        tok = self.peek()
        if tok[1] == '(':
            # #[id(registry="item", tags="allowed")]
            self.next()
            args = {}
            while not self.accept(')'):
                k = self.next()[1]
                if self.accept('='):
                    args[k] = self.attr_value()
                else:
                    args[k] = True
                self.accept(',')
            return args
        if tok[1] == '[':
            self.next()
            vals = []
            while not self.accept(']'):
                vals.append(self.attr_value())
                self.accept(',')
            return vals
        tok = self.next()
        if tok[0] == 'str':
            return json.loads(tok[1])
        if tok[0] == 'path' and self.peek()[1] in ('[', '[['):
            # z. B. nbt_path=minecraft:block[[%fallback]] – Klammern überspringen
            depth = 0
            while True:
                x = self.next()[1]
                if x == ']]' and depth == 1:
                    # „]]“ schließt hier die Klammer UND das Attribut – zweite Hälfte zurücklegen
                    self.i -= 1
                    self.t[self.i] = ('punct', ']')
                    break
                depth += {'[': 1, '[[': 2, ']': -1, ']]': -2}.get(x, 0)
                if depth <= 0:
                    break
        return tok[1]

    def attrs(self):
        res = {}
        while self.peek()[1] == '#' and self.peek(1)[1] == '[':
            self.next(); self.next()
            name = self.next()[1]
            if self.accept('='):
                res[name] = self.attr_value()
            elif self.peek()[1] == '(':
                res[name] = self.attr_value()
            else:
                res[name] = True
            self.expect(']')
        return res

    def pre(self):
        """Doku und Attribute vor einem Element (in beliebiger Reihenfolge)."""
        docs, attrs = [], {}
        while True:
            if self.peek()[0] == 'doc':
                docs += self.docs()
            elif self.peek()[1] == '#' and self.peek(1)[1] == '[':
                attrs.update(self.attrs())
            else:
                return docs, attrs

    # ---------- Typen ----------
    def range_(self):
        # @ 3 | @ 0..8 | @ 1.. | @ ..5 | @ 0<..<1
        lo = hi = None
        tok = self.peek()
        if tok[0] == 'num':
            lo = self.next()[1]
            self.accept('<')
            if self.accept('..'):
                self.accept('<')
                if self.peek()[0] == 'num':
                    hi = self.next()[1]
            else:
                hi = lo
        elif self.accept('..'):
            self.accept('<')
            hi = self.next()[1]
        f = lambda x: None if x is None else float(re.sub(r'[bBsSlLfFdD]$', '', x))
        return (f(lo), f(hi))

    def type_(self):
        docs, attrs = self.pre()
        t = self.primary()
        # Nachsilben
        while True:
            if self.peek()[1] == '[' and self.peek(1)[1] == ']':
                self.next(); self.next()
                t = {'k': 'array', 'of': t}
            elif self.accept('@'):
                r = self.range_()
                if t.get('k') in ('list', 'array'):
                    t = dict(t, size=r)
                else:
                    t = dict(t, range=r)
            elif self.peek()[1] == '[' and self.peek(1)[0] in ('str', 'path'):
                # Indexzugriff wie [value] – nicht weiter ausgewertet
                self.next(); self.next(); self.expect(']')
                t = {'k': 'complex', 'why': 'index'}
            else:
                break
        if attrs:
            t = dict(t, attrs=attrs)
        return t

    def generic_args(self):
        args = []
        if self.accept('<'):
            while not self.accept('>'):
                args.append(self.type_())
                self.accept(',')
        return args

    def primary(self):
        tok = self.peek()
        if tok[1] == '(':
            self.next()
            alts = []
            while not self.accept(')'):
                docs, attrs = self.pre()
                if self.peek()[1] == ')':
                    break
                alt = self.type_()
                if attrs:
                    alt = dict(alt, attrs={**alt.get('attrs', {}), **attrs})
                alts.append(alt)
                self.accept('|')
            return {'k': 'union', 'alts': alts}
        if tok[1] == '[':
            self.next()
            of = self.type_()
            self.expect(']')
            return {'k': 'list', 'of': of}
        if tok[1] == 'struct':
            self.next()
            name = None
            if self.peek()[0] == 'path' and self.peek(1)[1] == '{':
                name = self.next()[1]
            body = self.struct_body()
            return {'k': 'struct', 'name': name, 'members': body}
        if tok[1] == 'enum':
            return self.enum_decl(inline=True)
        if tok[0] == 'str':
            self.next()
            return {'k': 'lit', 'v': json.loads(tok[1])}
        if tok[0] == 'num':
            self.next()
            return {'k': 'lit', 'v': tok[1]}
        if tok[0] == 'path':
            self.next()
            name = tok[1]
            if name in ('true', 'false'):
                return {'k': 'lit', 'v': name == 'true'}
            if self.peek()[1] in ('[[', '[') and ':' in name and '::' not in name:
                # Dispatcher-Verweis minecraft:entity[[id]] / minecraft:foo[bar]
                depth = 0
                while True:
                    x = self.next()[1]
                    if x in ('[[', '['):
                        depth += 1 if x == '[' else 2
                    elif x in (']]', ']'):
                        depth -= 1 if x == ']' else 2
                    if depth <= 0:
                        break
                return {'k': 'dispatch', 'name': name}
            args = self.generic_args()
            prim = {'boolean', 'byte', 'short', 'int', 'long', 'float', 'double', 'string', 'any'}
            if name in prim:
                return {'k': name}
            return {'k': 'ref', 'name': name, 'module': self.module, 'args': args}
        raise SyntaxError(f'{self.module}: unerwarteter Typ {tok!r}')

    def struct_body(self):
        self.expect('{')
        members = []
        while not self.accept('}'):
            docs, attrs = self.pre()
            if self.accept('}'):
                break
            if self.accept('...'):
                members.append({'spread': self.type_(), 'attrs': attrs, 'doc': docs})
            else:
                tok = self.next()
                if tok[1] == '[':
                    key = self.type_()
                    self.expect(']')
                    name = {'map': key}
                else:
                    name = json.loads(tok[1]) if tok[0] == 'str' else tok[1]
                opt = self.accept('?')
                self.expect(':')
                typ = self.type_()
                members.append({'name': name, 'opt': opt, 'type': typ, 'attrs': attrs, 'doc': docs})
            self.accept(',')
        return members

    def enum_decl(self, inline=False):
        self.expect('enum')
        self.expect('(')
        base = self.next()[1]
        self.expect(')')
        name = None
        if self.peek()[0] == 'path':
            name = self.next()[1]
        self.expect('{')
        values = []
        while not self.accept('}'):
            docs, attrs = self.pre()
            if self.accept('}'):
                break
            key = self.next()[1]
            self.expect('=')
            v = self.next()
            val = json.loads(v[1]) if v[0] == 'str' else v[1]
            values.append({'key': key, 'value': val, 'attrs': attrs, 'doc': docs})
            self.accept(',')
        return {'k': 'enum', 'base': base, 'name': name, 'values': values}

    # ---------- Datei ----------
    def file(self):
        decls = []
        uses = {}
        while self.peek()[0] != 'eof':
            docs, attrs = self.pre()
            tok = self.peek()
            if tok[0] == 'eof':
                break
            if tok[1] == 'use':
                self.next()
                path = self.next()[1]
                alias = path.split('::')[-1]
                if self.accept('as'):
                    alias = self.next()[1]
                uses[alias] = path
            elif tok[1] == 'struct':
                self.next()
                name = self.next()[1]
                self.generic_params()
                decls.append(('struct', name, {'k': 'struct', 'name': name, 'members': self.struct_body()}, attrs, docs))
            elif tok[1] == 'enum':
                e = self.enum_decl()
                decls.append(('enum', e['name'], e, attrs, docs))
            elif tok[1] == 'type':
                self.next()
                name = self.next()[1]
                self.generic_params()
                self.expect('=')
                decls.append(('type', name, self.type_(), attrs, docs))
            elif tok[1] == 'dispatch':
                self.next()
                reg = self.next()[1]
                self.expect('[')
                keys = []
                while not self.accept(']'):
                    k = self.next()
                    keys.append(json.loads(k[1]) if k[0] == 'str' else k[1])
                    self.accept(',')
                self.generic_params()
                self.expect('to')
                decls.append(('dispatch', reg, {'keys': keys, 'type': self.type_()}, attrs, docs))
            elif tok[1] == 'inject':
                # inject struct X { ... } – für uns nicht nötig
                self.next(); self.next(); self.next()
                self.struct_body()
            else:
                raise SyntaxError(f'{self.module}: unbekannte Deklaration {tok!r}')
        return decls, uses

    def generic_params(self):
        if self.accept('<'):
            while not self.accept('>'):
                self.next()


def module_of(path, root):
    rel = os.path.relpath(path, os.path.dirname(root))[:-6].split(os.sep)
    if rel[-1] == 'mod':
        rel = rel[:-1]
    return '::' + '::'.join(rel)


class Schema:
    def __init__(self, root, subdirs):
        self.structs = {}   # vollqualifizierter Name -> Typ
        self.uses = {}      # Modul -> {alias: pfad}
        self.dispatch = {}  # entity-id -> [(typ, attrs)]
        self.errors = []
        for sub in subdirs:
            for f in sorted(glob.glob(os.path.join(root, sub, '**', '*.mcdoc'), recursive=True)):
                mod = module_of(f, root)
                try:
                    decls, uses = Parser(tokenize(open(f).read()), mod).file()
                except SyntaxError as e:
                    self.errors.append(str(e))
                    continue
                self.uses[mod] = uses
                for kind, name, body, attrs, docs in decls:
                    if kind == 'dispatch':
                        # benannte Structs direkt in einer dispatch-Zeile sind auch anderswo referenzierbar
                        if body['type'].get('k') == 'struct' and body['type'].get('name'):
                            self.structs.setdefault(f"{mod}::{body['type']['name']}", (body['type'], mod, docs))
                        if name == 'minecraft:entity':
                            for key in body['keys']:
                                self.dispatch.setdefault(key, []).append((body['type'], attrs, mod))
                    else:
                        self.structs[f'{mod}::{name}'] = (body, mod, docs)

    def resolve(self, name, module):
        """Verweis relativ zu einem Modul auflösen."""
        if name.startswith('::'):
            return name if name in self.structs else None
        parts = name.split('::')
        if parts[0] == 'super':
            mod = module
            while parts and parts[0] == 'super':
                mod = mod.rsplit('::', 1)[0]
                parts = parts[1:]
            full = mod + '::' + '::'.join(parts)
            return full if full in self.structs else None
        uses = self.uses.get(module, {})
        if parts[0] in uses:
            target = uses[parts[0]] + ('::' + '::'.join(parts[1:]) if len(parts) > 1 else '')
            if not target.startswith('::'):
                # relativer Import wie „use super::MobBase“
                return self.resolve(target, module)
            return target if target in self.structs else None
        full = f'{module}::{name}'
        if full in self.structs:
            return full
        return None
