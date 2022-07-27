from base64 import b64decode

from Crypto.Cipher import PKCS1_OAEP
from Crypto.Hash import SHA256
from Crypto.PublicKey import RSA

def generateKeys():
    key_pair = RSA.generate(1024)
    return key_pair

def decryptMsg(key, text):
    cipher = PKCS1_OAEP.new(key, hashAlgo=SHA256)
    decrypted_message = cipher.decrypt(b64decode(text))
    return decrypted_message.decode('utf-8')