#!/usr/bin/env python3
"""驗證報告上傳到 Google 文件：截圖走 rclone，文件走 Drive API，全程不經對話 context。

只需要 python3 與設定好的 rclone remote，不依賴任何平台的 Drive connector，
所以 Claude Code、Codex 等能跑 shell 的平台都用同一支。

  python3 upload-report.py --slug <task-slug> --evidence "$TASK/evidence" \
      --html "$TASK/notes/report.html" --title "Task <n> 驗證報告"

HTML 裡的截圖寫成 <img src="evidence/<檔名>">，上傳後自動換成 Drive 的嵌入網址。
只想看換完的 HTML（不上傳）：

  python3 upload-report.py rewrite --html report.html --ids lsjson.json
"""

import argparse
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid

ROOT_DIR = 'dev-task-verify-reports'
IMG_SRC = re.compile(r'''src=(["'])evidence/([^"']+)\1''')


def embed_url(file_id):
    return f'https://drive.google.com/uc?export=view&id={file_id}'


def rewrite_html(html, ids):
    """把 src="evidence/<檔名>" 換成 Drive 網址。檔名不在 ids 裡就整批失敗，不產出缺圖的報告。"""
    missing = sorted({m.group(2) for m in IMG_SRC.finditer(html)} - ids.keys())
    if missing:
        raise SystemExit(f'HTML 引用了 evidence/ 裡沒有上傳的檔案：{", ".join(missing)}')
    return IMG_SRC.sub(lambda m: f'src={m.group(1)}{embed_url(ids[m.group(2)])}{m.group(1)}', html)


def ids_from_lsjson(entries):
    return {e['Name']: e['ID'] for e in entries if not e.get('IsDir')}


def rclone(*args):
    return subprocess.run(['rclone', *args], check=True, capture_output=True, text=True).stdout


def access_token(remote):
    rclone('lsd', f'{remote}:')  # 讓 rclone 先刷新過期的 token
    conf = json.loads(rclone('config', 'dump'))
    if remote not in conf:
        raise SystemExit(f'找不到 rclone remote「{remote}」，一次性設定見 verify-report.md')
    return json.loads(conf[remote]['token'])['access_token']


def drive_request(token, url, body, content_type):
    for attempt in range(4):
        req = urllib.request.Request(
            url, data=body, method='POST',
            headers={'Authorization': f'Bearer {token}', 'Content-Type': content_type},
        )
        try:
            with urllib.request.urlopen(req) as res:
                return json.loads(res.read() or b'{}')
        except urllib.error.HTTPError as e:
            detail = e.read().decode()
            if e.code == 403 and 'rateLimitExceeded' in detail and attempt < 3:
                time.sleep(20)
                continue
            raise SystemExit(f'Drive API {e.code}：{detail}')


def make_public(token, file_id):
    drive_request(
        token,
        f'https://www.googleapis.com/drive/v3/files/{file_id}/permissions?sendNotificationEmail=false',
        json.dumps({'role': 'reader', 'type': 'anyone'}).encode(),
        'application/json',
    )


def upload_doc(token, title, folder_id, html):
    boundary = uuid.uuid4().hex
    meta = {'name': title, 'mimeType': 'application/vnd.google-apps.document', 'parents': [folder_id]}
    body = (
        f'--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{json.dumps(meta)}\r\n'
        f'--{boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n{html}\r\n--{boundary}--\r\n'
    ).encode()
    return drive_request(
        token,
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
        body,
        f'multipart/related; boundary={boundary}',
    )


def folder_id(remote, parent, name):
    for e in json.loads(rclone('lsjson', '--dirs-only', f'{remote}:{parent}')):
        if e['Name'] == name:
            return e['ID']
    raise SystemExit(f'Drive 上找不到資料夾 {parent}/{name}')


def upload(args):
    task_dir = f'{ROOT_DIR}/{args.slug}'
    evidence_dir = f'{args.remote}:{task_dir}/evidence'
    rclone('mkdir', evidence_dir)
    rclone('copy', args.evidence, evidence_dir)
    ids = ids_from_lsjson(json.loads(rclone('lsjson', evidence_dir)))
    with open(args.html, encoding='utf-8') as f:
        html = rewrite_html(f.read(), ids)

    token = access_token(args.remote)
    task_folder = folder_id(args.remote, ROOT_DIR, args.slug)
    # Google 文件轉檔時要能公開抓到圖片才嵌得進去；設在 task 資料夾會套用到裡面所有檔案
    if not args.no_public:
        make_public(token, task_folder)
    doc = upload_doc(token, args.title, task_folder, html)
    if not args.no_public:
        make_public(token, doc['id'])
    print(json.dumps({'docUrl': doc['webViewLink'], 'docId': doc['id'], 'images': len(ids)}, ensure_ascii=False))


def main(argv):
    if argv[:1] == ['rewrite']:
        p = argparse.ArgumentParser(prog='upload-report.py rewrite')
        p.add_argument('--html', required=True)
        p.add_argument('--ids', required=True, help='rclone lsjson 的輸出檔')
        a = p.parse_args(argv[1:])
        with open(a.html, encoding='utf-8') as f, open(a.ids, encoding='utf-8') as g:
            sys.stdout.write(rewrite_html(f.read(), ids_from_lsjson(json.load(g))))
        return

    p = argparse.ArgumentParser(prog='upload-report.py')
    p.add_argument('--slug', required=True, help='task 資料夾名，例如 392-chat-archived-unread')
    p.add_argument('--evidence', required=True, help='本機截圖資料夾')
    p.add_argument('--html', required=True, help='報告 HTML，截圖寫成 src="evidence/<檔名>"')
    p.add_argument('--title', required=True)
    p.add_argument('--remote', default='gdrive')
    p.add_argument('--no-public', action='store_true', help='內容敏感時用：不開「知道連結的人可看」，圖片會嵌不進去')
    upload(p.parse_args(argv))


if __name__ == '__main__':
    main(sys.argv[1:])
