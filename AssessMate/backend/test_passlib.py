from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

try:
    hash = pwd_context.hash("password")
    print(f"Hash: {hash}")
    print(f"Verify: {pwd_context.verify('password', hash)}")
except Exception as e:
    import traceback
    traceback.print_exc()
