import urllib.request
import urllib.error
import json

req = urllib.request.Request(
    "http://127.0.0.1:8000/auth/register",
    data=json.dumps({"username":"test","email":"test@test.com","password":"password","class_level":"X"}).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)

try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode('utf-8'))
