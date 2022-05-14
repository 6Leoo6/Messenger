from distutils.util import execute
from msilib.schema import Error
from click import command
from sqlite3worker import Sqlite3Worker
import json
import random
import re
import string


class DB():
    def __init__(self):
        self.user_conn = self.connect()
        self.chat_conn = self.connect_chat()
        self.MAX_MESSAGES = 20

    def connect(self):
        conn = Sqlite3Worker(r'users.db')
        conn.execute("create table if not exists users (firstN, lastN, id, username, email, password, contacts, groups, settings, friend_req)")
        return conn

    def connect_chat(self):
        conn = Sqlite3Worker(r'chats.db')
        return conn



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

        fetch = c.execute('SELECT email FROM users')
        emails = list(map(lambda x: x[0], fetch))
        if re.fullmatch(regex, email) and email not in emails:
            return True
        elif email in emails:
            return 'email1'
        return 'email2'



    def registerUser(self, firstN, lastN, username, email, password):
        isID = False
        while not isID:
            id = self.generate_id(8, 8)
            fetch = self.user_conn.execute('SELECT id FROM users')
            ids = list(map(lambda x: x[0], fetch))
            if id in ids:
                continue
            isID = True
        if not firstN.isalpha() or len(firstN) > 32: return 'firstN'
        if not lastN.isalpha() or len(lastN) > 32: return 'lastN'
        usernAvailable = self.user_conn.execute('SELECT id FROM users WHERE username=(?)', [username])
        if len(username) > 16: return 'userN'
        if usernAvailable: return 'userNot'
        emailProblem = self.checkEmail(email, self.user_conn)
        if  emailProblem != True: return emailProblem
        if len(password) < 8 or len(password) > 32 or password.isdigit() or password.isalpha(): return 'password'

        self.user_conn.execute('INSERT INTO users values (?,?,?,?,?,?,?,?,?,?)', [firstN, lastN, id, username, email, password, '{}', '{}', '{}', '{}'])
        #self.user_conn.commit()
        return id



    def loginUser(self, email, password):

        data = self.user_conn.execute(f'SELECT * FROM users WHERE email="{email}"')
        if not data:
            return 'email'
        data = list(data[0])
        if data[5] == password:
            return data
        return 'password'



    def searchFriend(self, userN: str):

        data = self.user_conn.execute(f'SELECT * FROM users WHERE username="{userN}"')
        if not data:
            return 'userN'
        return data[0][2]



    def sendFriendReq(self, idTo, idFrom, passwordFrom):
        try:
            sender = self.user_conn.execute(f'SELECT * FROM users WHERE id="{idFrom}"')[0]
        except IndexError:
            return 'sender'
        if sender[5] != passwordFrom:
            return 'password'
        try:
            receiver = self.user_conn.execute(f'SELECT * FROM users WHERE id="{idTo}"')[0]
        except IndexError():
            return 'receiver'
        try:
            receiver = json.loads(receiver[9])
            receiver.update({idFrom: 'incoming'})
        except TypeError as e:
            receiver = {idFrom: 'incoming'}
        receiver = json.dumps(receiver)
        self.user_conn.execute(f'UPDATE users SET friend_req=? WHERE id=?;', (receiver, idTo))

        try:
            sender = json.loads(sender[9])
            sender.update({idTo: 'outgoing'})
        except TypeError as e:
            sender = {idTo: 'outgoing'}
        sender = json.dumps(sender)
        self.user_conn.execute(f'UPDATE users SET friend_req=? WHERE id=?;', (sender, idFrom))
        #self.user_conn.commit()
        return sender



    def getUsernById(self, id):
        try:
            name = self.user_conn.execute(f'SELECT username FROM users WHERE id="{id}"')[0]
        except IndexError:
            return 400
        return name[0]



    def handleFriendReq(self, id, password, idTo, action):
        try:
            receiverC, receiverReqs = self.user_conn.execute(f'SELECT contacts, friend_req FROM users WHERE id="{idTo}"')[0]
            receiverC = json.loads(receiverC)
            receiverReqs = json.loads(receiverReqs)
        except:
            return 'idto'

        try:
            senderPass, senderC, senderReqs = self.user_conn.execute(f'SELECT password, contacts, friend_req FROM users WHERE id="{id}"')[0]
            senderC = json.loads(senderC)
            senderReqs = json.loads(senderReqs)
        except:
            return 'id'

        if senderPass != password: return 'password'


        if senderReqs[idTo] == 'outgoing' and action == 'accept':
            return 'unable'

        senderReqs.pop(idTo, None)
        receiverReqs.pop(id, None)

        self.user_conn.execute(f'UPDATE users SET friend_req=? WHERE id=?;', (json.dumps(senderReqs), id))
        self.user_conn.execute(f'UPDATE users SET friend_req=? WHERE id=?;', (json.dumps(receiverReqs), idTo))

        if action != 'accept': 
            #self.user_conn.commit()
            return 200

        first_seed, second_seed = sorted([id, idTo])

        chatId = self.generate_id(16, 0, first_seed, second_seed)
  
        self.chat_conn.execute(f'CREATE TABLE IF NOT EXISTS {chatId} (number, data)')
        chatdb = self.chat_conn.execute(f'SELECT number FROM {chatId}')
        if not chatdb:
            self.chat_conn.execute(f'INSERT INTO {chatId} values (?, ?)', [0, json.dumps({'members': sorted([id, idTo]), 'type': 'dm'})])


        senderC.update({idTo: chatId})
        receiverC.update({id: chatId})

        self.user_conn.execute(f'UPDATE users SET contacts=? WHERE id=?;', (json.dumps(senderC), id))
        self.user_conn.execute(f'UPDATE users SET contacts=? WHERE id=?;', (json.dumps(receiverC), idTo))

        #self.user_conn.commit()
        #self.chat_conn.commit()
        return 200

    def auth(self, id, password):       
        try:
            fetch = self.user_conn.execute(f'SELECT password FROM users WHERE id="{id}"')[0][0]
        except:
            return False
        if fetch == password:
            return True

    def getChatMembers(self, chatId):
        try:
            fetch = self.chat_conn.execute(f'SELECT data FROM {chatId} WHERE number=0')[0][0]
        except:
            return False
        return json.loads(fetch)['members']

    def saveMessage(self, data: dict):
        send_time = data['t']
        data.pop('t')
        chatId = data.pop('i')

        fetch = self.chat_conn.execute(f'SELECT number FROM {chatId}')
        latestChat = max(list(map(lambda x: x[0], fetch)))
        if latestChat == 0 or json.loads(self.chat_conn.execute(f'SELECT data FROM {chatId} WHERE number={latestChat}')[0][0])['n'] == self.MAX_MESSAGES:
            self.chat_conn.execute(f'INSERT INTO {chatId} values (?, ?)', [latestChat+1, json.dumps({'i': latestChat+1, 'n': 0, 'msgs': {}})])
            latestChat += 1

        existing = json.loads(self.chat_conn.execute(f'SELECT data FROM {chatId} WHERE number={latestChat}')[0][0])
        existing['msgs'].update({send_time: data})
        existing['n'] += 1
        self.chat_conn.execute(f'UPDATE {chatId} SET data=? WHERE number=?', [json.dumps(existing), latestChat])
    
    def getMsgs(self, id, password, chatId, logIndex):
        if logIndex == 0:
            return 'logIndex'
        if logIndex == -1:
            logIndex = max(map(lambda x: int(x[0]), self.chat_conn.execute(f'SELECT number FROM {chatId}')))
        if logIndex == 0:
            return 'noMsgs'
        
        try:
            correctPass = self.user_conn.execute(f'SELECT password FROM users WHERE id="{id}"')[0][0]
        except IndexError:
            return 'id'
        if password != correctPass: return 'password'
        if id not in json.loads(self.chat_conn.execute(f'SELECT data FROM {chatId} WHERE number=0')[0][0])['members']: return 'notM'
        if not self.chat_conn.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{chatId}'"): return 'chatId'
        try:
            twoSegment = False
            matches = [logIndex, logIndex]
            if logIndex > 1:
                matches.append(logIndex-1)
                twoSegment = True
            log = list(map(lambda x: x[0], self.chat_conn.execute(f'SELECT data FROM {chatId} WHERE number IN {tuple(matches)}')))
            if (twoSegment and len(log) == 1) or len(log) == 0: return 'logIndex'
        except IndexError:
            return 'logIndex'
        return log

db = DB()        

if __name__ == '__main__':
    print(db.getMsgs('1N4nE92AGSD97D43', 'Titkosjelszo01', 'kopyWpWdiCMGdppk', 2))