#!/usr/bin/env python3
"""Check an issue draft against its plugin/templates/ shape before publishing.

Usage: python3 scripts/check-issue-draft.py --template <bug|central|child> <draft.md>
Prints one `path:line: message` per problem and exits 1 when any exist.
"""
import argparse
import re
import sys
from pathlib import Path

HEADINGS = {
    'bug': ['發生什麼事', '當時怎麼操作', '證據與補充', '技術查核（由 skill 補充）', 'AI 交審摘要'],
    'central': ['目標與範圍', '子卡', '驗收契約', '狀態', '附錄 A：需求來源', '附錄 B：驗收環境', '附錄 C：交付紀錄'],
    'child': ['依賴', '範圍', '要做', '做完會看到', '驗證', '驗收方式', '附錄：交付紀錄'],
}
ANGLE = re.compile(r'<(?!https?://)[^<>\n]+>')
SQUARE = re.compile(r'\[(?! \]|x\])[^\]\n]+\](?![(\[])')
BOX = re.compile(r'^\s*- \[([ x])\] (.*)$')
PARENT = re.compile(r'^Parent: daodaoedu/daodao#\d+$')
NOT_YET = ('尚未產生', '尚未開始')


def strip_comments(lines):
    out, inside = [], False
    for line in lines:
        text = line
        if inside:
            if '-->' not in text:
                out.append('')
                continue
            text, inside = text.split('-->', 1)[1], False
        text = re.sub(r'<!--.*?-->', '', text)
        if '<!--' in text:
            text, inside = text.split('<!--', 1)[0], True
        out.append(text)
    return out


def check(text, template):
    lines = strip_comments(text.splitlines())
    problems = []

    def fail(n, message):
        problems.append((n, message))

    for n, line in enumerate(lines, 1):
        for match in ANGLE.finditer(line):
            fail(n, f'未替換的佔位符 {match.group(0)}')
        if template == 'bug':
            for match in SQUARE.finditer(line):
                fail(n, f'未替換的佔位符 {match.group(0)}')

    found = [(n, line[3:].strip()) for n, line in enumerate(lines, 1) if line.startswith('## ')]
    names = [name for _, name in found]
    expected = HEADINGS[template]
    for name in expected:
        if name not in names:
            fail(0, f'缺少段落「## {name}」')
    present = [name for name in names if name in expected]
    if present != [name for name in expected if name in present]:
        fail(0, f'段落順序應為：{"、".join(expected)}')

    if not any(line.startswith('# ') for line in lines):
        fail(0, '缺少標題「# 」')

    if template == 'child':
        if not any(PARENT.match(line.strip()) for line in lines):
            fail(0, '缺少獨立一行「Parent: daodaoedu/daodao#N」')
        section = None
        for n, line in enumerate(lines, 1):
            if line.startswith('## '):
                section = line[3:].strip()
                continue
            box = BOX.match(line)
            if not box or section != '驗證':
                continue
            checked, body = box.group(1) == 'x', box.group(2)
            evidence = body.split('證據：', 1)[1].strip() if '證據：' in body else ''
            if not evidence:
                fail(n, '驗證項目要寫「證據：」')
            elif checked and evidence.startswith(NOT_YET):
                fail(n, '證據尚未產生就不能打勾')
    return problems


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--template', required=True, choices=sorted(HEADINGS))
    parser.add_argument('draft', type=Path)
    args = parser.parse_args(argv)
    problems = check(args.draft.read_text(), args.template)
    for n, message in problems:
        print(f'{args.draft}:{n}: {message}')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
