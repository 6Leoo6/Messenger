from ast import Index
from msilib.schema import Error
import psycopg2
from psycopg2 import pool
from psycopg2 import errors
import json
import random
import re
import string


class DB():
    def __init__(self):
        self.users_pool = pool.SimpleConnectionPool(1, 20, host="localhost", database="users", user="postgres", password="postgres")
        self.imgs_pool = pool.SimpleConnectionPool(1, 20, host="localhost", database="images", user="postgres", password="postgres")
        self.chats_pool = pool.SimpleConnectionPool(1, 20, host="localhost", database="chats", user="postgres", password="postgres")
        self.MAX_MESSAGES = 20
        
        conn = self.imgs_pool.getconn()
        conn.cursor().execute("CREATE TABLE IF NOT EXISTS system (id text, data json, img bytea)")
        conn.cursor().execute("CREATE TABLE IF NOT EXISTS images (id text, author text, data json, img bytea)")
        conn.commit()
        self.imgs_pool.putconn(conn)

    def connect_user(self):
        conn = self.users_pool.getconn()
        #conn.execute("CREATE TABLE IF NOT EXISTS users (firstN, lastN, id, username, email, password, contacts, groups, settings, friend_req)")
        return conn, conn.cursor()

    def connect_chat(self):
        conn = self.chats_pool.getconn()
        return conn, conn.cursor()
    
    def connect_images(self):
        conn = self.imgs_pool.getconn()
        return conn, conn.cursor()



    def generate_id(self, letter_count, digit_count, seed1=None, seed2=None): 
        random.seed(seed1)
        str1 = ''.join((random.choice(string.ascii_letters) for _ in range(letter_count)))  
        str1 += ''.join((random.choice(string.digits) for _ in range(digit_count)))  
    
        sam_list = list(str1)

        random.seed(seed2)
        random.shuffle(sam_list)
        random.seed(None)
        final_string = ''.join(sam_list)  
        return final_string

    def checkEmail(self, email, c):
        regex = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'

        c.execute('SELECT email FROM users')
        emails = list(map(lambda x: x[0], c.fetchall()))
        if re.fullmatch(regex, email) and email not in emails:
            return True
        elif email in emails:
            return 'email1'
        return 'email2'

    def auth(self, id, password):
        conn, cur = self.connect_user()
        try:
            cur.execute('SELECT password FROM users WHERE id=%s', [id])
            fetch = cur.fetchone()[0]
            if fetch == password:
                self.users_pool.putconn(conn)
                return True
        except IndexError: pass
        self.users_pool.putconn(conn)
        return False


    def registerUser(self, firstN, lastN, username, email, password):
        conn, cur = self.connect_user()
        isID = False
        while not isID:
            id = self.generate_id(8, 8)
            cur.execute('SELECT id FROM users WHERE id=(%s)', [id])
            if cur.fetchone():
                continue
            isID = True
        if not firstN.isalpha() or len(firstN) > 32:
            self.users_pool.putconn(conn)
            return 'firstN'
        if not lastN.isalpha() or len(lastN) > 32:
            self.users_pool.putconn(conn)
            return 'lastN'
        cur.execute('SELECT id FROM users WHERE username=(%s)', (username,))
        if len(username) > 16:
            self.users_pool.putconn(conn)
            return 'userN'
        if cur.fetchall():
            self.users_pool.putconn(conn)
            return 'userNot'
        emailProblem = self.checkEmail(email, cur)
        if  emailProblem != True:
            self.users_pool.putconn(conn)
            return emailProblem
        if len(password) < 8 or len(password) > 32 or password.isdigit() or password.isalpha():
            self.users_pool.putconn(conn)
            return 'password'

        cur.execute('INSERT INTO users VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)', [firstN, lastN, id, username, email, password, '{}', '{}', '{}', '{}', '{}'])

        conn.commit()
        self.users_pool.putconn(conn)
        return id



    def loginUser(self, email, password):
        conn, cur = self.connect_user()

        cur.execute('SELECT * FROM users WHERE email=%s', [email])
        data = cur.fetchone()
        self.users_pool.putconn(conn)

        if not data:
            return 'email'
        data = list(data)
        if data[5] == password:
            return data
        
        return 'password'


    def searchFriend(self, userN: str):
        conn, cur = self.connect_user()

        cur.execute('SELECT id FROM users WHERE username=(%s)', [userN])
        data = cur.fetchone()
        self.users_pool.putconn(conn)

        if not data:
            return 'userN'

        return data[0]



    def sendFriendReq(self, idTo, idFrom, passwordFrom):
        conn, cur = self.connect_user()
        
        cur.execute('SELECT * FROM users WHERE id=(%s)', [idFrom])
        sender = cur.fetchone()
        if not sender:
            self.users_pool.putconn(conn)
            return 'sender'
        if sender[5] != passwordFrom:
            self.users_pool.putconn(conn)
            return 'password'

        cur.execute('SELECT * FROM users WHERE id=(%s)', [idTo])
        receiver = cur.fetchone()
        if not receiver:
            self.users_pool.putconn(conn)
            return 'receiver'
        try:
            receiver = json.loads(receiver[9])
            receiver.update({idFrom: 'incoming'})
        except TypeError as e:
            receiver = {idFrom: 'incoming'}
        receiver = json.dumps(receiver)
        cur.execute('UPDATE users SET friend_req=(%s) WHERE id=(%s);', [receiver, idTo])

        try:
            sender = json.loads(sender[9])
            sender.update({idTo: 'outgoing'})
        except TypeError as e:
            sender = {idTo: 'outgoing'}
        sender = json.dumps(sender)
        cur.execute('UPDATE users SET friend_req=(%s) WHERE id=(%s);', [sender, idFrom])
        conn.commit()
        self.users_pool.putconn(conn)
        return sender



    def getUsernById(self, id):
        conn, cur = self.connect_user()

        cur.execute('SELECT username FROM users WHERE id=(%s)', [id])
        name = cur.fetchone()
        self.users_pool.putconn(conn)
        if not name:
            return 400
        return name[0]



    def handleFriendReq(self, id, password, idTo, action):
        conn, cur = self.connect_user()

        try:
            cur.execute('SELECT contacts, friend_req FROM users WHERE id=(%s)', [idTo])
            receiverC, receiverReqs = cur.fetchone()
        except TypeError:
            self.users_pool.putconn(conn)
            return 'idto'

        try:
            cur.execute('SELECT password, contacts, friend_req FROM users WHERE id=(%s)', [id])
            senderPass, senderC, senderReqs = cur.fetchone()
        except TypeError:
            self.users_pool.putconn(conn)
            return 'id'

        if senderPass != password:
            self.users_pool.putconn(conn)
            return 'password'

        try:
            if senderReqs[idTo] == 'outgoing' and action == 'accept':
                self.users_pool.putconn(conn)
                return 'unable'
        except KeyError:
            self.users_pool.putconn(conn)
            return 'unable'

        senderReqs.pop(idTo, None)
        receiverReqs.pop(id, None)

        cur.execute('UPDATE users SET friend_req=(%s) WHERE id=(%s);', [json.dumps(senderReqs), id])
        cur.execute('UPDATE users SET friend_req=(%s) WHERE id=(%s);', [json.dumps(receiverReqs), idTo])

        if action != 'accept':
            conn.commit()
            self.users_pool.putconn(conn)
            return 200
        
        conn_chats, cur_chats = self.connect_chat()

        first_seed, second_seed = sorted([id, idTo])

        chatId = self.generate_id(16, 0, first_seed, second_seed)
        print(chatId)
  
        cur_chats.execute(f'CREATE TABLE IF NOT EXISTS {chatId} (number int, data json)')
        cur_chats.execute(f'SELECT number FROM {chatId}')
        if not cur_chats.fetchall():
            cur_chats.execute(f'INSERT INTO {chatId} VALUES (%s, %s)', [ 0, json.dumps({'members': sorted([id, idTo]), 'type': 'dm'})])


        senderC.update({idTo: chatId})
        receiverC.update({id: chatId})

        cur.execute('UPDATE users SET contacts=(%s) WHERE id=(%s);', (json.dumps(senderC), id))
        cur.execute('UPDATE users SET contacts=(%s) WHERE id=(%s);', (json.dumps(receiverC), idTo))

        conn.commit()
        self.users_pool.putconn(conn)
        conn_chats.commit()
        self.chats_pool.putconn(conn_chats)
        return 200


    def getChatMembers(self, chatId):
        conn, cur = self.connect_chat()
        try:
            cur.execute(f'SELECT data FROM {chatId} WHERE number=0')
            fetch = cur.fetchone()[0]
            self.chats_pool.putconn(conn)
            return fetch['members']
        except IndexError:
            self.chats_pool.putconn(conn)
            return False
        

    def saveMessage(self, data: dict):
        conn, cur = self.connect_chat()
        

        send_time = data['t']
        data.pop('t')
        chatId = data.pop('i')

        cur.execute(f'SELECT number FROM {chatId}')
        latestChat = max(list(map(lambda x: x[0], cur.fetchall())))
        cur.execute(f'SELECT data FROM {chatId} WHERE number=%s', [latestChat])
        if latestChat == 0 or cur.fetchone()[0]['n'] == self.MAX_MESSAGES:
            cur.execute(f'INSERT INTO {chatId} VALUES (%s, %s)', [latestChat+1, json.dumps({'i': latestChat+1, 'n': 0, 'msgs': {}})])
            latestChat += 1
        
        cur.execute(f'SELECT data FROM {chatId} WHERE number=%s', [latestChat])
        existing = cur.fetchone()[0]
        existing['msgs'].update({send_time: data})
        existing['n'] += 1
        cur.execute(f'UPDATE {chatId} SET data=%s WHERE number=%s', [json.dumps(existing), latestChat])
        conn.commit()
        self.chats_pool.putconn(conn)


    def getMsgs(self, id, password, chatId, logIndex):
        conn, cur = self.connect_chat()
        if logIndex == 0:
            self.chats_pool.putconn(conn)
            return 'logIndex'
        if logIndex == -1:
            cur.execute(f'SELECT number FROM {chatId}')
            logIndex = max(map(lambda x: int(x[0]), cur.fetchall()))
        if logIndex == 0:
            self.chats_pool.putconn(conn)
            return 'noMsgs'
        
        valid = self.auth(id, password)
        if not valid:
            self.chats_pool.putconn(conn)
            return 'password'

        cur.execute(f'SELECT data FROM {chatId} WHERE number=0')
        if id not in cur.fetchone()[0]['members']:
            self.chats_pool.putconn(conn)
            return 'notM'
        try:
            cur.execute(f"SELECT * FROM {chatId} WHERE number=0")
        except errors.UndefinedTable:
            self.chats_pool.putconn(conn)
            return 'chatId'

        try:
            twoSegment = False
            matches = [logIndex, logIndex]
            if logIndex > 1:
                matches.append(logIndex-1)
                twoSegment = True
            cur.execute(f'SELECT data FROM {chatId} WHERE number IN {tuple(matches)}')
            log = list(map(lambda x: x[0], cur.fetchall()))
            if (twoSegment and len(log) == 1) or len(log) == 0:
                self.chats_pool.putconn(conn)
                return 'logIndex'
        except IndexError:
            self.chats_pool.putconn(conn)
            return 'logIndex'
        self.chats_pool.putconn(conn)
        return log

    def uploadMedia(self, data, img_bytes: bytes, id, password):
        conn, cur = self.connect_images()
        if not self.auth(id, password):
            self.imgs_pool.putconn(conn)
            return 'auth'

        cur.execute('SELECT * FROM images WHERE author=%s AND img=%s', [id, img_bytes])
        if cur.fetchall():
            self.imgs_pool.putconn(conn)
            return 'duplicate'
        while True:
            img_id = self.generate_id(16, 16)
            cur.execute('SELECT id FROM images WHERE id=%s', [img_id])
            if not cur.fetchall():
                break
        cur.execute('INSERT INTO images VALUES (%s, %s, %s, %s)', [img_id, id, json.dumps(data), psycopg2.Binary(img_bytes)])
        conn.commit()
        self.imgs_pool.putconn(conn)

        conn, cur = self.connect_user()
        cur.execute('SELECT images FROM users WHERE id=%s', [id])
        images = cur.fetchone()[0]
        if not images:
            images = {'images': []}
        images['images'].append(img_id)
        cur.execute('UPDATE users SET images=%s WHERE id=%s', [json.dumps(images), id])
        conn.commit()
        self.users_pool.putconn(conn)
        return img_id
    
    def uploadToDefault(self, data, img_bytes: bytes, id='not_found'):
        data = {"name": "not-found.png", "type": "image/png"}
        conn, cur = self.connect_images()
        cur.execute('INSERT INTO system VALUES (%s, %s, %s)', [id, json.dumps(data), img_bytes])
        conn.commit()
        self.imgs_pool.putconn(conn)

 
    def getMedia(self, userId, imgId):
        conn, cur = self.connect_images()
        if userId != 'default':
            cur.execute(f'SELECT * FROM images WHERE author=%s AND id=%s', [userId, imgId])
        else:
            cur.execute(f'SELECT * FROM system WHERE id=%s', [imgId])
        try:
            data = cur.fetchone()
            self.imgs_pool.putconn(conn)
            if not data: return 'badRoute'
            return data
        except IndexError:
            self.imgs_pool.putconn(conn)
            return 'badRoute'


    def deleteMedia(self, userId, password, imgId):
        conn, cur = self.connect_user()
        cur.execute('SELECT images FROM users WHERE id=%s AND password=%s', [userId, password])
        imgs = cur.fetchone()
        if not imgs:
            self.users_pool.putconn(conn)
            return 'badAuth'
        imgs = imgs[0]
        try:
            imgs['images'].remove(imgId)
        except ValueError:
            self.users_pool.putconn(conn)
            return 'imgid'
        except TypeError:
            self.users_pool.putconn(conn)
            return
        cur.execute('UPDATE users SET images=%s WHERE id=%s', [json.dumps(imgs), userId])
        conn.commit()
        self.users_pool.putconn(conn)

        conn, cur = self.connect_images()
        cur.execute('DELETE FROM images WHERE id=%s', [imgId])
        conn.commit()
        self.imgs_pool.putconn(conn)

    
    def listMedia(self, id, password):
        conn, cur = self.connect_user()
        cur.execute('SELECT images FROM users WHERE id=%s AND password=%s', [id, password])
        fetch = cur.fetchone()
        self.users_pool.putconn(conn)
        if not fetch:
            return 'badLogin'
        try:
            return [[img, self.getMediaType(img)] for img in fetch[0]['images']]
        except TypeError:
            return []

'''   def getMediaType(self, imgId):
        conn, cur = self.connect_images()
        cur.execute('SELECT data FROM images WHERE id=%s', [imgId])
        data = cur.fetchone()
        self.imgs_pool.putconn(conn)
        if not data: 
            return 'notExists'
        return data[0]['type']'''



db = DB()        


if __name__ == '__main__':
    #print(db.sendFriendReq("360V9ylSpO4G2f20","6ps21z7gNT108Uy2", "Szuperjelszo007"))
    #print(db.handleFriendReq("360V9ylSpO4G2f20", "Titkosjelszo01", "6ps21z7gNT108Uy2", 'accept'))
    #print(db.auth("6ps21z7gNT108Uy2", "Szuperjelszo007"))
    #print(db.registerUser("Leó", "Takács", "Leoo", "leo.takacs@yahoo.com", "Szuperjelszo007"))
    #print(db.deleteMedia("6ps21z7gNT108Uy2", "Szuperjelszo007", "582tL22hMQdyQ1V7061cl06i8N5aoK62"))
    print(db.getMediaType('y2o42i6ql38R1e10unk90sG7zj25g7b8'))