#!/usr/bin/env python3
# Novità di una release del Brume: confronta il manifest dell'immagine nuova con
# quello della release precedente e stampa un elenco Markdown in italiano.
# Uso: release-notes.py <manifest precedente> <manifest nuovo>
# (formato manifest: "nome - versione" per riga)
import sys


def load(path):
    pkgs = {}
    for line in open(path, encoding='utf-8'):
        name, sep, ver = line.strip().partition(' - ')
        if sep:
            pkgs[name] = ver
    return pkgs


def short(ver):
    # "6.12.112~f0a7…-r1" -> "6.12.112", "1718~981c978eff" -> "1718"
    return ver.split('~')[0]


old, new = load(sys.argv[1]), load(sys.argv[2])
changed = [n for n in sorted(new) if n in old and old[n] != new[n]]
kmods = [n for n in changed if n.startswith('kmod-')]
lines = []

if 'kernel' in changed:
    lines.append(f'- Kernel Linux {short(old["kernel"])} → {short(new["kernel"])}: correzioni di sicurezza e di stabilità'
                 + (f' ({len(kmods)} moduli aggiornati insieme)' if kmods else ''))
for n in changed:
    if n != 'kernel' and n not in kmods:
        lines.append(f'- {n} {short(old[n])} → {short(new[n])}')
for n in sorted(set(new) - set(old)):
    lines.append(f'- Nuovo: {n} {short(new[n])}')
for n in sorted(set(old) - set(new)):
    lines.append(f'- Rimosso: {n}')

print('\n'.join(lines) if lines else '- Nessun pacchetto cambiato')
