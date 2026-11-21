from pathlib import Path
from base64 import b64decode
from hashlib import sha256

files = {
    'n43-hats.png': '2f0c181a3483d921ec97b39db540bd35533fcd1be55513c0a85f2e67f27ee052',
    'n43-preview.png': '6769aa8f6d8ecd9cd4ea6b87b815050e9fc8445c01ef39ecfa50d7c440cd51aa',
}
for name, expected in files.items():
    here = Path(__file__).resolve().parent
    raw = b64decode(''.join((here / (name + '.b64')).read_text().split()), validate=True)
    if sha256(raw).hexdigest() != expected:
        raise ValueError(f'Checksum mismatch: {name}')
    with (here / name).open('xb') as f:
        f.write(raw)
    print(name)
