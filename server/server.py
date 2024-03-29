import time
from json import dumps, loads
from pathlib import Path
from typing import List

from fastapi import (FastAPI, File, Request, Response, UploadFile, WebSocket,
                     WebSocketDisconnect)
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.cors import CORSMiddleware

from server.database import db
from server.encryption import generateKeys
from server.video import range_requests_response

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
    StaticFiles(directory=Path(__file__).parent.parent.absolute() / "static"),
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
        if db.getIdBySession(str(ws.url).rsplit('/', 1)[1].split('?')[0]) not in members:
            return

        for connection in self.active_connections:
            if db.getIdBySession(str(connection.url).rsplit('/', 1)[1].split('?')[0]) in members:
                try:
                    await connection.send_text(dumps(data))
                except:
                    self.disconnect(connection)
        db.saveMessage(data)


manager = ConnectionManager()

keyPair = generateKeys()
exportedPublicKey = keyPair.public_key().export_key()

# -------------------------------------HTML Templates-------------------------------------
@app.get('/')
def login(req: Request):
    return templates.TemplateResponse('login.html', {'request': req})


@app.get('/register')
def register(req: Request):
    return templates.TemplateResponse('register.html', {'request': req})


@app.get('/main')
def home(req: Request):
    return templates.TemplateResponse('main.html', {'request': req})

@app.get('/join/{a}')
def home(req: Request):
    return templates.TemplateResponse('join.html', {'request': req})

# -------------------------------------Web Sockets----------------------------------------


@app.websocket("/ws/{sessionId}")
async def websocket_endpoint(websocket: WebSocket, sessionId: str):
    res = db.verifySession(websocket.client.host, sessionId)
    if not res:
        return
    id = res
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            data = loads(data)
            data.update({'t': round(time.time(), 3)})
            data.update({'a': id})
            if data['d']:
                await manager.broadcast(data, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ----------------------------------------Image API---------------------------------------


@app.get("/img/{userId}/{imgId}", responses={200: {"content": {"image/png": {}}}}, response_class=Response)
def get_image(userId, imgId, isindexi=0):
    res = db.getMedia(userId, imgId, 'i', isindexi)
    if res in ['badRoute', None]:
        res = db.getMedia('default', 'not_found', 'i')
    return Response(content=res[0], media_type=res[1])


@app.get("/video/{userId}/{imgId}")
def get_video(userId, imgId, request: Request):
    print(request.client.host)
    res = db.getMedia(userId, imgId, 'v')
    if res in ['badRoute']:
        return 'Not found'
    return range_requests_response(
        request, file_path=res[0], content_type=res[1]
    )


@app.post("/uploadfile")
async def upload_file(sid, request: Request, file: UploadFile = File(...)):
    t = time.time()
    file_byte = await file.read()
    res = db.uploadMedia(file.content_type, file_byte, sid, request.client.host)
    if res in ['auth', 'duplicate']:
        return {'status': 400, 'error': res}
    return {'status': 200, 'data': res}


@app.get('/api/list_media')
def list_media(sid, request: Request):
    res = db.listMedia(sid, request.client.host)
    if res in ['auth']:
        return {'status': 400, 'error': res}
    return {'status': 200, 'data': res}


@app.delete('/api/delete_media')
def delete_media(sid, imgId, request: Request):
    res = db.deleteMedia(sid, imgId, request.client.host)
    if res is not None:
        return {'status': 400, 'error': res}
    return {'status': 200}

# --------------------------------------API Requests--------------------------------------


@app.post('/api/register')
def register(firstN: str, lastN: str, userN: str, email: str, password: str, unencpass, request: Request):
    ret = db.registerUser(firstN, lastN, userN, email, password, unencpass, keyPair)
    if ret not in ['firstN', 'lastN', 'userN', 'userNot' 'email1', 'email2', 'password']:
        sessionId = db.createSession(request.client.host, ret)
        return {'status': 201, 'id': ret, 'sid': sessionId}
    return {'status': 400, 'error': ret}


@app.post('/api/login')
def login(email: str, password: str, request: Request):
    res = db.loginUser(email, password, keyPair)
    if res in ['email', 'password']:
        return {'status': 400, 'error': 'bad_auth'}
    sessionId = db.createSession(request.client.host, res[2])
    return {'status': 200, 'data': res, 'sid': sessionId}

@app.get('/api/get_user_data')
def get_user_data(sid, request: Request):
    res = db.getUserData(request.client.host, sid)
    if res in ['session']:
        return {'status': 400, 'error': res}
    return {'status': 200, 'data': res}

@app.get('/api/get_public_key')
def get_private_key():
    return {'pbk': exportedPublicKey}


@app.post('/api/search_friend')
def search_friend(userN: str):
    res = db.searchFriend(userN)
    return {'status': 200, 'id': res} if res != 'userN' else {'status': 400}


@app.post('/api/send_friend_req')
def send_friend_req(idTo: str, sid: str, request: Request):
    res = db.sendFriendReq(idTo, sid, request.client.host)
    return {'status': 200, 'data': res} if res not in ['auth', 'receiver'] else {'status': 400, 'error': res}


@app.post('/api/get_usern_by_id')
def get_usern_by_id(id: str):
    res = db.getUsernById(id)
    return {'status': 400} if res == 400 else {'status': 200, 'name': res}


@app.post('/api/handle_friend_req')
def handle_friend_req(sid: str, idTo: str, action: str, request: Request):
    if action not in ['accept', 'cancel', 'decline']:
        return {'status': 400, 'error': 'action'}
    res = db.handleFriendReq(sid, request.client.host, idTo, action)
    return {'status': 400, 'error': res} if res != 200 else {'status': res}


@app.post('/api/get_messages')
def get_messages(sid: str, chatId: str, logIndex: int, request: Request):
    res = db.getMsgs(sid, request.client.host, chatId, logIndex)
    return {'status': 400, 'error': res} if res in ['logIndex', 'noMsgs', 'id', 'auth', 'notM', 'chatId'] else {'status': 200, 'data': res}

@app.post('/api/create_group')
def create_group(sid, members, name, settings, request: Request):
    res = db.createGroup(sid, members, name, settings, request.client.host)
    if res in ['auth', 'name', 'member', 'settings']:
        return {'status': 400, 'error': res}
    return {'status': 201, 'data': res}

@app.post('/api/join/{groupId}')
def join_group(groupId, sid, request: Request):
    res = db.joinGroupByLink(groupId, sid, request.client.host)
    if res in ['auth', 'groupId']:
        return {'status': 400, 'error': res}
    elif res in ['waiting', 'joined']:
        return {'status': 200, 'data': res}
    else:
        return {'status': 202, 'data': res}

@app.get('/api/get_group_name')
def get_group_name(groupId, sid, request: Request):
    res = db.getGroupName(groupId, sid, request.client.host)
    if not res:
        return {'status': 400}
    return {'status': 200, 'data': res}

@app.post('/api/handle_group_invite')
def handle_group_invite(groupId, sid, action, request: Request):
    res = db.handleGroupInvite(groupId, sid, action, request.client.host)
    if res in ['invalidAction', 'auth', 'groupId', 'unable']:
        return {'status': 400, 'error': res}
    return {'status': 200}

@app.post('/api/handle_join_request')
def handle_join_request(groupId, sid, action, request: Request):
    res = db.handleJoinRequest(groupId, sid, action, request.client.host)
    if res in ['invalidAction', 'auth', 'groupId', 'unable']:
        return {'status': 400, 'error': res}
    return {'status': 200}

@app.get('/api/get_group_data')
def get_group_data(groupId, sid, request: Request):
    res = db.getGroupData(groupId, sid, request.client.host)
    if res in ['auth', 'groupId', 'unable']:
        return {'status': 400, 'error': res}
    return {'status': 200, 'data': res}

@app.post('/api/save_group_settings')
def save_group_settings(groupId, sid, settings, request: Request):
    res = db.saveGroupSettings(groupId, settings, sid, request.client.host)
    if res in ['settings', 'auth', 'groupId', 'unable']:
        return {'status': 400, 'error': res}
    return {'status': 200}


# To run the app: python -m uvicorn server:app --host 0.0.0.0 --reload
