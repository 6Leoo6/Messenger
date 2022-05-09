from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, UploadFile, File
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from typing import List
from json import loads, dumps
import time

import database as db

app = FastAPI()

templates = Jinja2Templates(directory='templates')

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/static",
    StaticFiles(directory=Path(__file__).parent.absolute() / "static"),
    name="static",
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.chat_members = {}

    async def connect(self, websocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket):
        await websocket.send_text(message)

    async def broadcast(self, data, ws):
        members = db.getChatMembers(data['i'])
        if str(ws.url).rsplit('/', 1)[1].split('?')[0] not in members: return

        for connection in self.active_connections:
            if str(connection.url).rsplit('/', 1)[1].split('?')[0] in members:
                await connection.send_text(dumps(data))
        db.saveMessage(data)

manager = ConnectionManager()


#-------------------------------------HTML Templates-------------------------------------
@app.get('/')
def home(req: Request):
    return templates.TemplateResponse('index.html', {'request': req})

@app.get('/register')
def home(req: Request):
    return templates.TemplateResponse('register.html', {'request': req})

@app.get('/main')
def home(req: Request):
    return templates.TemplateResponse('main.html', {'request': req})

#-------------------------------------Web Sockets----------------------------------------
@app.websocket("/ws/{id}")
async def websocket_endpoint(websocket: WebSocket, id: str, password: str):
    if not db.auth(id, password):
        return
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            data = loads(data)
            data.update({'t': int(time.time())})
            print(data)
            
            if data['d']: await manager.broadcast(data, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"Client #{id} left the chat")

#--------------------------------------API Requests--------------------------------------
@app.post('/api/register')
def register(firstN: str, lastN: str, userN: str, email: str, password: str):
    ret = db.registerUser(firstN, lastN, userN, email, password)
    if ret not in ['firstN', 'lastN', 'userN', 'email1', 'email2', 'password']: return {'status': 201, 'id':ret}
    return {'status': 400, 'error': ret}

@app.post('/api/login')
def login(email: str, password: str):
    res = db.loginUser(email, password)
    if res in ['email', 'password']:
        return {'status': 400, 'error':'bad_auth'}
    return {'status': 200, 'data': res}

@app.post('/api/search_friend')
def search_friend(userN: str):
    res = db.searchFriend(userN)
    return {'status': 200, 'id':res} if res != 'userN' else {'status': 400}

@app.post('/api/send_friend_req')
def send_friend_req(idTo: str, idFrom: str, passwordFrom: str):
    res = db.sendFriendReq(idTo, idFrom, passwordFrom)
    return {'status': 200, 'data': res} if res not in ['sender', 'password', 'receiver'] else {'status': 400, 'error': res}

@app.post('/api/get_usern_by_id')
def get_usern_by_id(id: str):
    res = db.getUsernById(id)
    return {'status': 400} if res == 400 else {'status': 200, 'name': res}

@app.post('/api/handle_friend_req')
def handle_friend_req(id: str, password: str, idTo: str, action: str):
    if action not in ['accept', 'cancel', 'decline']: return {'status': 400, 'error':'action'}
    res = db.handleFriendReq(id, password, idTo, action)
    return {'status': 400, 'error': res} if res != 200 else {'status': res}







#To run the app: python -m uvicorn server:app --host 0.0.0.0 --reload