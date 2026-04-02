import argparse
import getpass
import bcrypt

from database import SessionLocal
import models


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or promote an admin account")
    parser.add_argument("--email", required=True, help="Admin email")
    parser.add_argument("--password", help="Admin password (omit to be prompted securely)")
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="If account exists, reset password to the provided one",
    )
    return parser.parse_args()


def read_password(args: argparse.Namespace) -> str:
    if args.password:
        return args.password

    first = getpass.getpass("Enter admin password: ")
    second = getpass.getpass("Confirm admin password: ")
    if first != second:
        raise ValueError("Passwords do not match")
    if not first:
        raise ValueError("Password cannot be empty")
    return first


def main() -> None:
    args = parse_args()
    email = args.email.strip().lower()
    if not email:
        raise ValueError("Email is required")

    password = read_password(args)

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            user = models.User(email=email, password_hash=hash_password(password), role="admin")
            db.add(user)
            db.commit()
            print(f"Created first admin: {email}")
            return

        changed = False
        if user.role != "admin":
            user.role = "admin"
            changed = True

        if args.reset_password:
            user.password_hash = hash_password(password)
            changed = True

        if changed:
            db.commit()
            print(f"Updated account as admin: {email}")
        else:
            print("Account already admin. Use --reset-password to change password.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
