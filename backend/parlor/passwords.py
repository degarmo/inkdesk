"""Verify bcrypt hashes written by Prisma / bcryptjs (cost 12 in seed)."""

import bcrypt


def check_password(plain: str, password_hash: str) -> bool:
    if not plain or not password_hash:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False
