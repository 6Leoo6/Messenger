import json
import random
import re
import sqlite3
import string
import datetime


class DB():
    def __init__(self):
        self.user_conn, self.user_cursor = self.connect()
        self.chat_conn, self.chat_cursor = self.connect_chat()

    def connect(self):
        conn = sqlite3.connect(r'basicinfo.db')
        cursor = conn.cursor()
        cursor.execute("create table if not exists users (firstN, lastN, id, username, email, password, contacts, groups, settings, friend_req)")
        return conn, cursor

    def connect_chat(self):
        conn = sqlite3.connect(r'chats.db')
        cursor = conn.cursor()
        return conn, cursor



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



    def registerUser(self, firstN, lastN, username, email, password):
        isID = False
        while not isID:
            id = self.generate_id(8, 8)
            self.user_cursor.execute('SELECT id FROM users')
            ids = list(map(lambda x: x[0], self.user_cursor.fetchall()))
            if id in ids:
                continue
            isID = True
        if not firstN.isalpha() or len(firstN) > 32: return 'firstN'
        if not lastN.isalpha() or len(lastN) > 32: return 'lastN'
        self.user_cursor.execute('SELECT id FROM users WHERE username=(?)', [username])
        usernAvailable = self.user_cursor.fetchone()
        if len(username) > 16 or usernAvailable: return 'userN'
        emailProblem = self.checkEmail(email, self.user_cursor)
        if  emailProblem != True: return emailProblem
        if len(password) < 8 or len(password) > 32 or password.isdigit() or password.isalpha(): return 'password'

        self.user_cursor.execute('INSERT INTO users values (?,?,?,?,?,?,?,?,?,?)', [firstN, lastN, id, username, email, password, {}, {}, {}, {}])
        self.user_conn.commit()
        return id



    def loginUser(self, email, password):

        self.user_cursor.execute(f'SELECT * FROM users WHERE email="{email}"')
        data = self.user_cursor.fetchall()
        if not data:
            return 'email'
        data = list(data[0])
        if data[5] == password:
            return data
        return 'password'



    def searchFriend(self, userN: str):

        self.user_cursor.execute(f'SELECT * FROM users WHERE username="{userN}"')
        data = self.user_cursor.fetchall()
        if not data:
            return 'userN'
        return data[0][2]



    def sendFriendReq(self, idTo, idFrom, passwordFrom):

        self.user_cursor.execute(f'SELECT * FROM users WHERE id="{idFrom}"')
        sender = self.user_cursor.fetchone()
        if not sender:
            return 'sender'
        if sender[5] != passwordFrom:
            return 'password'
        self.user_cursor.execute(f'SELECT * FROM users WHERE id="{idTo}"')
        receiver = self.user_cursor.fetchone()
        if not receiver:
            return 'receiver'
        try:
            receiver = json.loads(receiver[9])
            receiver.update({idFrom: 'incoming'})
        except TypeError as e:
            receiver = {idFrom: 'incoming'}
        receiver = json.dumps(receiver)
        self.user_cursor.execute(f'UPDATE users SET friend_req=? WHERE id=?;', (receiver, idTo))

        try:
            sender = json.loads(sender[9])
            sender.update({idTo: 'outgoing'})
        except TypeError as e:
            sender = {idTo: 'outgoing'}
        sender = json.dumps(sender)
        self.user_cursor.execute(f'UPDATE users SET friend_req=? WHERE id=?;', (sender, idFrom))
        self.user_conn.commit()
        return sender



    def getUsernById(self, id):

        self.user_cursor.execute(f'SELECT username FROM users WHERE id="{id}"')
        name = self.user_cursor.fetchone()
        return 400 if not name else name[0]



    def handleFriendReq(self, id, password, idTo, action):
 

        self.user_cursor.execute(f'SELECT contacts, friend_req FROM users WHERE id="{idTo}"')
        try:
            receiverC, receiverReqs = self.user_cursor.fetchone()
            receiverC = json.loads(receiverC)
            receiverReqs = json.loads(receiverReqs)
        except:
            return 'idto'

        self.user_cursor.execute(f'SELECT password, contacts, friend_req FROM users WHERE id="{id}"')
        try:
            senderPass, senderC, senderReqs = self.user_cursor.fetchone()
            senderC = json.loads(senderC)
            senderReqs = json.loads(senderReqs)
        except:
            return 'id'

        if senderPass != password: return 'password'


        if senderReqs[idTo] == 'outgoing' and action == 'accept':
            return 'unable'

        senderReqs.pop(idTo, None)
        receiverReqs.pop(id, None)

        self.user_cursor.execute(f'UPDATE users SET friend_req=? WHERE id=?;', (json.dumps(senderReqs), id))
        self.user_cursor.execute(f'UPDATE users SET friend_req=? WHERE id=?;', (json.dumps(receiverReqs), idTo))

        if action != 'accept': 
            self.user_conn.commit()
            return 200

        first_seed, second_seed = sorted([id, idTo])

        chatId = self.generate_id(16, 0, first_seed, second_seed)
  
        self.chat_cursor.execute(f'CREATE TABLE IF NOT EXISTS {chatId} (number, data)')
        self.chat_cursor.execute(f'SELECT number FROM {chatId}')
        chatdb = self.chat_cursor.fetchone()
        print(chatdb)
        if chatdb:
            pass
        else:
            self.chat_cursor.execute(f'INSERT INTO {chatId} values (?, ?)', [0, json.dumps({'members': sorted([id, idTo]), 'type': 'dm'})])


        senderC.update({idTo: chatId})
        receiverC.update({id: chatId})

        self.user_cursor.execute(f'UPDATE users SET contacts=? WHERE id=?;', (json.dumps(senderC), id))
        self.user_cursor.execute(f'UPDATE users SET contacts=? WHERE id=?;', (json.dumps(receiverC), idTo))

        self.user_conn.commit()
        self.chat_conn.commit()
        return 200

    def auth(self, id, password):
        self.user_cursor.execute(f'SELECT password FROM users WHERE id="{id}"')
        try:
            fetch = self.user_cursor.fetchone()[0]
        except:
            return False
        if fetch == password:
            return True

    def getChatMembers(self, chatId):
        self.chat_cursor.execute(f'SELECT data FROM {chatId} WHERE number=0')
        try:
            fetch = self.chat_cursor.fetchone()[0]
        except:
            return False
        return json.loads(fetch)['members']

    def saveMessage(self, data: dict):
        send_time = data['t']
        data.pop('t')
        chatId = data.pop('i')
        print(data)
        MAX_MESSAGES = 20

        self.chat_cursor.execute(f'SELECT number FROM {chatId}')
        latestChat = max(list(map(lambda x: x[0], self.chat_cursor.fetchall())))
        print(latestChat)
        if latestChat == 0 or json.loads(self.chat_cursor.execute(f'SELECT data FROM {chatId} WHERE number={latestChat}').fetchone()[0])['n'] == MAX_MESSAGES:
            self.chat_cursor.execute(f'INSERT INTO {chatId} values (?, ?)', [latestChat+1, json.dumps({'n': 0, 'msgs': {}})])
            latestChat += 1

        existing = json.loads(self.chat_cursor.execute(f'SELECT data FROM {chatId} WHERE number={latestChat}').fetchone()[0])
        existing['msgs'].update({send_time: data})
        existing['n'] += 1
        self.chat_cursor.execute(f'UPDATE {chatId} SET data=? WHERE number=?', [json.dumps(existing), latestChat])

        self.chat_conn.commit()
        

Db = DB()

if __name__ == '__main__':
    print(Db.test('Leo'))