#!/usr/bin/env python3
"""
Разовое получение JWT для ручных запросов к api.rating.chgk.info (сайт 4gk этот токен не использует).

1) Выдача токена: POST /authentication_token (JSON: email, password)
2) Проверка: GET /users/test с Authorization: Bearer <token> (в OpenAPI; эндпоинт помечен deprecated)

Использование:
  python3 scripts/rating-chgk-token.py
  RATING_CHGK_EMAIL=you@mail.ru python3 scripts/rating-chgk-token.py   # пароль запросит интерактивно

Не коммитьте токен и не вставляйте пароль в историю shell (history).
"""

from __future__ import annotations

import getpass
import json
import os
import sys
import urllib.error
import urllib.request

BASE = "https://api.rating.chgk.info"


def post_json(url: str, payload: dict) -> tuple[int, dict | list | str]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            status = resp.status
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        status = e.code
    try:
        parsed: dict | list | str = json.loads(body)
    except json.JSONDecodeError:
        parsed = body
    return status, parsed


def get_json(url: str, headers: dict[str, str]) -> tuple[int, dict | list | str]:
    req = urllib.request.Request(url, method="GET", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            status = resp.status
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        status = e.code
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        parsed = body
    return status, parsed


def extract_token(obj: dict) -> str | None:
    for key in ("token", "access_token", "accessToken"):
        v = obj.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def main() -> int:
    email = os.environ.get("RATING_CHGK_EMAIL", "").strip()
    if not email:
        email = input("E-mail (аккаунт rating.chgk.info): ").strip()
    if not email:
        print("Нужен e-mail.", file=sys.stderr)
        return 1

    password = os.environ.get("RATING_CHGK_PASSWORD", "")
    if not password:
        password = getpass.getpass("Пароль: ")

    status, data = post_json(
        f"{BASE}/authentication_token",
        {"email": email, "password": password},
    )

    if status != 200:
        print(f"POST /authentication_token → HTTP {status}", file=sys.stderr)
        print(json.dumps(data, ensure_ascii=False, indent=2) if isinstance(data, (dict, list)) else data, file=sys.stderr)
        return 1

    if not isinstance(data, dict):
        print("Неожиданный ответ (не JSON-объект).", file=sys.stderr)
        return 1

    token = extract_token(data)
    if not token:
        print("В ответе нет поля token / access_token. Ответ:", data, file=sys.stderr)
        return 1

    me_status, me = get_json(
        f"{BASE}/users/test",
        {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )

    print("— Проверка: GET /users/test —")
    if me_status == 200 and isinstance(me, dict):
        print(json.dumps(me, ensure_ascii=False, indent=2)[:2000])
        if len(json.dumps(me, ensure_ascii=False)) > 2000:
            print("… (обрезано)")
    else:
        print(f"HTTP {me_status}:", me)

    print()
    print("Заголовок для своих curl/скриптов (одна строка, без переносов):")
    print(f'Authorization: Bearer {token}')
    print()
    print("В .env проекта это поле не требуется для таблицы ОЧП на 4gk.pl.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
