import base64, gzip, hashlib
chunks=[]
for i in range(6):
    s=open('.locktmp/c%d'%i).read()
    chunks.append(''.join(s.split()))
FIX={0: [['replace', 2186, 2187, 'N'], ['insert', 6367, 6367, 'd'], ['insert', 15875, 15875, 'a'], ['delete', 15876, 15877, '']], 1: [['insert', 15415, 15415, 'q'], ['replace', 21043, 21044, '2']], 2: [['insert', 14709, 14709, 'a']]}
for idx,ops in FIX.items():
    s=chunks[idx]
    for tag,i1,i2,text in sorted(ops,key=lambda o:-o[1]):
        s=s[:i1]+text+s[i2:]
    chunks[idx]=s
data=gzip.decompress(base64.b64decode(''.join(chunks)))
h=hashlib.sha256(data).hexdigest()
assert h=='a77e8c461843f76a6e9cbe1eb5e43b56ea7930f68728da4a5fa1dd328621bf3e', h
open('app/package-lock.json','wb').write(data)
print('LOCKFILE_OK', len(data), h)
