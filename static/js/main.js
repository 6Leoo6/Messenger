function getUser() {
    return window.localStorage.getItem('user')
}


function changeList(id) {
    if (id == "user-single") {
        document.getElementById("add-friend").hidden = false
        document.getElementById("friends-div").hidden = false
        document.getElementById("add-group").hidden = true
        document.getElementById("groups-div").hidden = true
    } else if (id == "user-group") {
        document.getElementById("add-friend").hidden = true
        document.getElementById("friends-div").hidden = true
        document.getElementById("add-group").hidden = false
        document.getElementById("groups-div").hidden = false
    }
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

function hideChildren(hide, children) {
    for (child of children) {
        child.hidden = hide
    }
}

async function showAddFriend(id) {
    var mainDiv = document.getElementById('main-div')
    if (id == "a-fr") {
        hideChildren(true, mainDiv.children)
        document.getElementById("add-friend-div").hidden = false

        var input = document.getElementById("search-friend")

        input.addEventListener("keyup", function (event) {
            if (event.key === "Enter") {
                event.preventDefault()
                document.getElementById("search-btn").click()
            }
        })
        visualizeReqs()
    } else if (id == "a-gr") {
        hideChildren(true, mainDiv.children)
        document.getElementById("add-group-div").hidden = false
        document.getElementById("add-group-div").innerHTML = `
        <form id="create-group-form" action=""><h2>Csoport létrehozása</h2>
          <div id="group-form-inside">
            <label for="group-name-input" class="form-label">Csoport neve</label>
            <input type="text" class="form-control" id="group-name-input" aria-describedby="basic-addon3">
            <div id="group-create-side">
              <div id="user-list-div"></div>
              <div id="group-create-settings">
                <div class="form-check group-create-setting">
                  <input class="form-check-input" type="checkbox" value="" id="invite-link-disable">
                  <label class="form-check-label" for="invite-link-disable">
                    Meghívó link letiltása
                  </label>
                </div>
                <div class="form-check group-create-setting">
                  <input class="form-check-input" type="checkbox" value="" id="public-name" checked>
                  <label class="form-check-label" for="public-name">
                    Név mindenki számára látható
                  </label>
                </div>
                <div class="group-create-setting">
                  <label for="group-accept-setting">Ki engedélyezheti az új tagok belépését?</label>
                  <select class="form-select" aria-label="Default select example" id="group-accept-setting">
                    <option value="1" selected>Nem kell engedély</option>
                    <option value="2">Bárki</option>
                    <option value="3">Adminisztrátor</option>
                    <option value="4">Tulajdonos</option>
                  </select>
                </div>
                
              </div>
            </div>
            <p id="clipboard-p" style="color: rgb(25,135,84);" hidden>Link vágólapra másolva</p>
            <button class="btn btn-primary" id="create-group-btn" onclick="createGroup(event)">Létrehozás</button>
          </div>
        </form>
        <input id="copy-input" type="text" value="" hidden>
        <div class="center-div" id="copy-div">
            <h1 class="center-title" id="success-group-header"></h1>
            <button id="copy-link-btn" class="btn btn-primary center-btn" onclick="copyLink()" hidden>Link másolása</button>
        </div>`
        generateFriendInviteBoxes()
    }
}

async function handleReq(id) {
    var [idTo, action] = id.split('-')

    var url = new URL(location.origin + "/api/handle_friend_req")
    url.searchParams.set("sid", window.localStorage.getItem('sid'))
    url.searchParams.set("idTo", idTo)
    url.searchParams.set("action", action)
    var res = await fetch(url, { method: "POST" })
    res = await res.json()
    visualizeReqs()
    visualizeFriends()
}

async function visualizeReqs() {
    var res = await calculateFriendDiv()
    var [inc, out] = res
    var incDiv = document.getElementById("incoming-div")
    incDiv.innerHTML = inc
    var outDiv = document.getElementById("outgoing-div")
    outDiv.innerHTML = out

}

async function calculateFriendDiv() {
    await getUserData()
    var user = JSON.parse(getUser())
    var namesById = JSON.parse(window.localStorage.getItem("namesbyid"))
    if (namesById == null) {
        window.localStorage.setItem("namesbyid", "{}")
    }
    var namesById = JSON.parse(window.localStorage.getItem("namesbyid"))
    var inc = ''
    var out = ''
    for (const [key, value] of Object.entries(user['friend_req'])) {
        if (namesById[key] == undefined) {
            var url = new URL(location.origin + "/api/get_usern_by_id")
            url.searchParams.set("id", key)
            var res = await fetch(url, { method: "POST" })
            res = await res.json()
            if (res['status'] == 400) { continue }
        }

        if (value == "incoming") {
            inc += `
            <div id="${key}-div-i" class="friend-req-divs">
            <p id="username-p">${res['name']}</p>
            <p id="id-p" class="text-black-50 fs-6">Id: ${key}</p>
            <div>
              <button type="button" id="${key}-accept" class="btn btn-success accept-friend-btn" onclick="handleReq(id)">
                Elfogadás
              </button>
              <button type="button" id="${key}-decline" class="btn btn-danger decline-friend-btn" onclick="handleReq(id)">
                Elutasítás
              </button>
            </div>
            </div>`
        }
        else {
            out += `
            <div id="${key}-div-o" class="friend-req-divs">
            <p id="username-p">${res['name']}</p>
            <p id="id-p" class="text-black-50 fs-6">Id: ${key}</p>
            <div>
              <button type="button" id="${key}-cancel" class="btn btn-danger cancel-req-btn" onclick="handleReq(id)">
                Elvetés
              </button>
            </div>
            </div>`
        }
    }
    return [inc, out]
}

async function submitSearch() {
    var userN = document.getElementById("search-friend").value
    var url = new URL(location.origin + "/api/search_friend")
    url.searchParams.set("userN", userN)
    var res = await fetch(url, { method: "POST" })
    res = await res.json()
    var warning = document.getElementById("warning-friend")
    var result_div = document.getElementById("result-div")
    if (res["status"] == 200) {
        var id = res["id"]
        window.sessionStorage.setItem("idToSendReq", id)
        warning.hidden = true
        var user = JSON.parse(getUser())
        friend_req = user["friend_req"]

        result_div.hidden = false
        document.getElementById("username-p").innerHTML = userN
        document.getElementById("id-p").innerHTML = "Id: " + id
        var add_friend = document.getElementById("add-friend-btn")
        add_friend.className = "btn"
        add_friend.classList.add("btn-primary")
        if (Object.keys(friend_req).includes(id)) {
            add_friend.disabled = true
            if (friend_req[id] == "incoming") {
                add_friend.innerHTML = "Fogadja el a barátkérelmét"
            } else {
                add_friend.innerHTML = "A barátkérelem elküldve"
            }
        } else if (Object.keys(user["contacts"]).includes(id)) {
            add_friend.disabled = true
            add_friend.innerHTML = "Már barátok vagytok"
        } else if (id == user["id"]) {
            add_friend.disabled = true
            add_friend.innerHTML = "Már saját magad barátja vagy"
        } else {
            add_friend.disabled = false
            add_friend.innerHTML = "Jelölés barátként"
        }
    } else {
        result_div.hidden = true
        warning.hidden = false
    }
}

async function addFriend() {
    var url = new URL(location.origin + "/api/send_friend_req")
    idTo = window.sessionStorage.getItem("idToSendReq")
    window.sessionStorage.removeItem("idToSendReq")
    url.searchParams.set("idTo", idTo)
    url.searchParams.set("sid", window.localStorage.getItem('sid'))
    var res = await fetch(url, { method: "POST" })
    res = await res.json()
    var btn = document.getElementById("add-friend-btn")
    if (res["status"] == 200) {
        btn.className = "btn"
        btn.classList.add("btn-success")

        btn.innerText = "Barátkérelem elküldve"
        btn.disabled = true
        getUserData()
        visualizeReqs()
    } else {
        btn.className = "btn"
        btn.classList.add("btn-danger")

        btn.innerText = "Hiba"
        btn.disabled = true
    }
}

async function getUserData() {
    var url = new URL(document.location.origin + "/api/get_user_data")
    url.searchParams.set("sid", window.localStorage.getItem('sid'))
    var res = await fetch(url, { method: "GET" })
    var data = await res.json()

    if (data["status"] == 200) {
        data = data["data"]
        userData = {
            firstN: data[0],
            lastN: data[1],
            id: data[2],
            userN: data[3],
            email: data[4],
            contacts: data[5],
            groups: data[6],
            settings: data[7],
            friend_req: data[8],
        }
        window.localStorage.setItem("user", JSON.stringify(userData))
    } else {
        window.localStorage.removeItem("user")
        location.href = "/"
    }
}


async function visualizeFriends() {
    await getUserData()
    var friendsListContent = ''
    var friendDivs = ''
    var user = JSON.parse(getUser())
    for (const [id, chatId] of Object.entries(user['contacts'])) {
        var url = new URL(location.origin + "/api/get_usern_by_id")
        url.searchParams.set("id", id)
        var res = await fetch(url, { method: "POST" })
        res = await res.json()
        if (res['status'] == 400) { continue }
        var name = res['name']

        friendsListContent += `<div class="friend-div" id="${user['contacts'][id]}-btn" onclick="showChat(id)"><p>${name}</p></div>`
        friendDivs += `
        <div class="chat" id="${user['contacts'][id]}-chat" hidden>
        <div class="name-div"><h2 class="name-title">${name}</h2><span class="material-symbols-outlined name-div-setting" onclick="openSettings('${chatId}', 'chat')">settings</span></div>
        <table class="message-table" id="${user['contacts'][id]}-msgs"><tbody></tbody></table>
        <form class="message-form" id="${user['contacts'][id]}-send" action="" onsubmit="sendMessage(event, id)">
            <div class="msg-form-div">
                <a id="${user['contacts'][id]}-opener" href="javascript:void(0)" onclick="loadFileSelector(id)" class="upload-link">
                    <span class="material-symbols-outlined upload-icon">
                        file_upload
                    </span>
                </a>
                <input class="shadow-none" type="text" id="${user['contacts'][id]}-msgt" autocomplete="off" placeholder="Írja ide a szöveget"/>
                <button class="btn btn-dark">Küldés</button>
            </div>
          
        </form>
      </div>`

    }
    document.getElementById('friends-div').innerHTML = friendsListContent
    document.getElementById('direct-msgs').innerHTML = friendDivs
}

async function visualizeGroups() {
    var groupsListContent = ''
    var groupDivs = ''
    var user = JSON.parse(getUser())
    for (const [groupId, level] of Object.entries(user['groups'])) {
        var url = new URL(location.origin + "/api/get_group_name")
        url.searchParams.set("groupId", groupId)
        url.searchParams.set("sid", window.localStorage.getItem('sid'))
        var res = await fetch(url, { method: "GET" })
        res = await res.json()
        if (res['status'] == 400) { var name = 'Unknown' }
        else { var name = res['data'] }

        if (level == 'incoming') {
            groupsListContent += `<div class="friend-div" id="${groupId}-btn" onclick="showChat(id)"><p>${name}</p><span class="group-invite-warn material-symbols-outlined">priority_high</span></div>`
            groupDivs += `
            <div class="chat" id="${groupId}-chat" hidden>
                <div class="name-div"><h2 class="name-title">${name}</h2></div>
                <div id="" class="center-div">
                    <h1 id="" class="center-title">Meghívtak, hogy csatlakozz ebbe a csoportba</h1>
                    <div class="btn-side-by-side">
                        <button id="a-${groupId}" class="btn btn-success center-btn" onclick="handleGroupInvite(id)">Elfogadás</button>
                        <button id="d-${groupId}" class="btn btn-danger center-btn" onclick="handleGroupInvite(id)">Elutasítás</button>
                    </div>
                </div>
            </div>`
        }
        else if (level == 'waiting') {
            groupsListContent += `<div class="friend-div" id="${groupId}-btn" onclick="showChat(id)"><p>${name}</p><span class="group-request-warn material-symbols-outlined">hourglass_top</span></div>`
            groupDivs += `
            <div class="chat" id="${groupId}-chat" hidden>
                <div class="name-div"><h2 class="name-title">${name}</h2></div>
                <div id="" class="center-div">
                    <h1 id="" class="center-title">Jelentkezésed ebbe a csoportba elbírálás alatt áll</h1>
                    <button id="${groupId}-cancel-waiting" class="btn btn-danger center-btn" onclick="handleJoinRequest(id, 'c')">Elvetés</button>
                </div>
            </div>`
        }
        else if (level != 'incoming' && level != 'waiting') {
            groupsListContent += `<div class="friend-div" id="${groupId}-btn" onclick="showChat(id)"><p>${name}</p></div>`
            groupDivs += `
            <div class="chat" id="${groupId}-chat" hidden>
                <div class="name-div"><h2 class="name-title">${name}</h2><span class="material-symbols-outlined name-div-setting" onclick="openSettings('${groupId}', 'group')">settings</span></div>
                <table class="message-table" id="${groupId}-msgs"><tbody></tbody></table>
                <form class="message-form" id="${groupId}-send" action="" onsubmit="sendMessage(event, id)">
                    <div class="msg-form-div">
                        <a id="${groupId}-opener" href="javascript:void(0)" onclick="loadFileSelector(id)" class="upload-link">
                            <span class="material-symbols-outlined upload-icon">
                                file_upload
                            </span>
                        </a>
                        <input class="shadow-none" type="text" id="${groupId}-msgt" autocomplete="off" placeholder="Írja ide a szöveget"/>
                        <button class="btn btn-dark">Küldés</button>
                    </div>
                </form>
            </div>`
        }



    }
    document.getElementById('groups-div').innerHTML = groupsListContent
    document.getElementById('group-msgs').innerHTML = groupDivs
}

async function loadChat(chatId) {
    chatId = chatId.split('-')[0]
    if (JSON.parse(window.sessionStorage.getItem('scrollPos'))[chatId]) {
        window.scrollTo(0, JSON.parse(window.sessionStorage.getItem('scrollPos'))[chatId])
    }
    var howManyLoaded = JSON.parse(window.sessionStorage.getItem('howManyLoaded'))
    if (howManyLoaded[chatId]) { return }
    window.sessionStorage.setItem('currentlyLoading', true)
    var url = new URL(location.origin + "/api/get_messages")
    url.searchParams.set("sid", window.localStorage.getItem('sid'))
    url.searchParams.set("chatId", chatId)
    url.searchParams.set("logIndex", -1)
    var res = await fetch(url, { method: "POST" })
    res = await res.json()
    if (res['status'] == 400) {
        window.sessionStorage.setItem('currentlyLoading', false)
        return
    }
    data = res['data']

    var messages = document.getElementById(chatId + '-msgs')
    messages.children.item(0).innerHTML = ''
    howManyLoaded[chatId] = []
    for (log of data) {
        howManyLoaded[chatId].push(parseInt(log['i']))
        for (var [time, msg] of Object.entries(log['msgs'])) {
            msg['t'] = time
            msg['i'] = chatId
            visualizeMessages(msg)
        }
    }
    window.sessionStorage.setItem('howManyLoaded', JSON.stringify(howManyLoaded))
    window.sessionStorage.setItem('currentlyLoading', false)
}

function showChat(chatId) {
    chatId = chatId.split('-')[0]
    hideChildren(true, document.getElementById('main-div').children)
    hideChildren(true, document.getElementById('direct-msgs').children)
    hideChildren(true, document.getElementById('group-msgs').children)
    chatDiv = document.getElementById(chatId + '-chat')
    chatDiv.hidden = false
    chatDiv.parentElement.parentElement.hidden = false
    window.scrollTo({
        top: document.body.scrollHeight,
        left: 0,
        behavior: 'instant',
    })
}

async function visualizeMessages(data) {
    const scrollPos = window.scrollY
    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    var user = JSON.parse(getUser())
    var namesById = JSON.parse(window.localStorage.getItem("namesbyid"))
    if (!namesById) {
        window.localStorage.setItem("namesbyid", "{}")
        namesById = {}
    }
    if (!namesById[data['a']]) {
        var url = new URL(location.origin + "/api/get_usern_by_id")
        url.searchParams.set("id", data['a'])
        var res = await fetch(url, { method: "POST" })
        res = await res.json()
        if (res['status'] != 400) { namesById[data['a']] = res['name'] }
        window.localStorage.setItem("namesbyid", JSON.stringify(namesById))
    }

    var d = new Date(0)
    d.setUTCSeconds(data['t'])
    var messages = document.getElementById(data['i'] + '-msgs')
    if (data['c'] == 't') {
        var msg = `<div class="msg-div" id="${data['a']}-${data['t']}" onclick="showTime(id)"><p>${data['d']}</p></div><p class="time-txt" id="${data['a']}-${data['t']}-time" hidden>${d.toLocaleString()}</p>`
    }
    else if (data['c'] == 'v') {
        var msg = `<div class="msg-img-div msg-index-img-div"  id="${data['a']}-${data['t']}" onclick="showTime(id)"><img src="/img/${data['a']}/${data['d']}?isindexi=1"/><span onclick="fullscreenMedia('${data['a']}', '${data['d']}', 'v', '${data['a']}-${data['t']}-time')" class="material-symbols-outlined">play_arrow</span></div><p class="time-txt" id="${data['a']}-${data['t']}-time" hidden>${d.toLocaleString()}</p>`
    }
    else if (data['c'] == 'i') {
        var msg = `<div class="msg-img-div"  id="${data['a']}-${data['t']}" onclick="fullscreenMedia('${data['a']}', '${data['d']}', 'i', '${d.toLocaleString()}')"><img src="/img/${data['a']}/${data['d']}"/></div>`
    }

    try {

        var lastRow = messages.children.item(0).children.item(messages.children.item(0).childElementCount - 1)
        if (lastRow == null) { throw 'First row' }
        if (lastRow.children.item(0).innerHTML != '' && lastRow.children.item(0).children.item(0).children.item(1).id.split('-')[0] == data['a']) {
            var e = document.getElementById(lastRow.children.item(0).children.item(0).children.item(1).id).parentElement
            e.innerHTML += msg
            scrollToBottom(scrollPos, scrollable)

            return
        }
        else if (lastRow.children.item(1).innerHTML != '' && lastRow.children.item(1).children.item(0).children.item(0).id.split('-')[0] == data['a']) {
            var e = document.getElementById(lastRow.children.item(1).children.item(0).children.item(0).id).parentElement
            e.innerHTML += msg
            scrollToBottom(scrollPos, scrollable)

            return
        }
    }
    catch (error) { }


    if (user['id'] == data['a']) {
        other_side = ''
        own_side = `<div class="right row-div">${msg}</div>`
    }
    else {
        other_side = `<div class="left row-div"><p class="name-tag">${namesById[data['a']]}</p>${msg}</div>`
        own_side = ''
    }

    messages.children.item(0).innerHTML += `
        <tr>
          <td>${other_side}</td>
          <td>${own_side}</td>
        </tr>
        `
    scrollToBottom(scrollPos, scrollable)

}

async function storeMsgsToStr(data, storeMsgs) {
    var user = JSON.parse(getUser())
    var namesById = JSON.parse(window.localStorage.getItem("namesbyid"))
    if (!namesById) {
        window.localStorage.setItem("namesbyid", "{}")
        namesById = {}
    }
    if (!namesById[data['a']]) {
        var url = new URL(location.origin + "/api/get_usern_by_id")
        url.searchParams.set("id", data['a'])
        var res = await fetch(url, { method: "POST" })
        res = await res.json()
        if (res['status'] != 400) { namesById[data['a']] = res['name'] }
        window.localStorage.setItem("namesbyid", JSON.stringify(namesById))
    }

    var d = new Date(0)
    d.setUTCSeconds(data['t'])
    if (data['c'] == 't') {
        var msg = `<div class="msg-div" id="${data['a']}-${data['t']}" onclick="showTime(id)"><p>${data['d']}</p></div><p class="time-txt" id="${data['a']}-${data['t']}-time" hidden>${d.toLocaleString()}</p>`
    }
    else if (data['c'] == 'v') {
        var msg = `<div class="msg-img-div msg-index-img-div"  id="${data['a']}-${data['t']}" onclick="showTime(id)"><img src="/img/${data['a']}/${data['d']}?isindexi=1"/><span onclick="fullscreenMedia('${data['a']}', '${data['d']}', 'v', '${data['a']}-${data['t']}-time')" class="material-symbols-outlined">play_arrow</span></div><p class="time-txt" id="${data['a']}-${data['t']}-time" hidden>${d.toLocaleString()}</p>`
    }
    else if (data['c'] == 'i') {
        var msg = `<div class="msg-img-div"  id="${data['a']}-${data['t']}" onclick="fullscreenMedia('${data['a']}', '${data['d']}', 'i', '${d}')"><img src="/img/${data['a']}/${data['d']}"/></div>`
    }

    try {
        var lastRow = storeMsgs.children.item(0).lastChild
        if (lastRow == null) { throw 'No rows' }
        if (lastRow.children.item(0).innerHTML != '' && lastRow.children.item(0).children.item(0).children.item(1).id.split('-')[0] == data['a']) {
            storeMsgs.children.item(0).lastChild.children.item(0).children.item(0).innerHTML += msg
            return storeMsgs
        }
        else if (lastRow.children.item(1).innerHTML != '' && lastRow.children.item(1).children.item(0).children.item(1).id.split('-')[0] == data['a']) {
            storeMsgs.children.item(0).lastChild.children.item(1).children.item(0).innerHTML += msg
            return storeMsgs
        }
    }
    catch (error) { }


    if (user['id'] == data['a']) {
        other_side = ''
        own_side = `<div class="right row-div">${msg}</div>`
    }
    else {
        other_side = `<div class="left row-div"><p class="name-tag">${namesById[data['a']]}</p>${msg}</div>`
        own_side = ''
    }


    storeMsgs.children.item(0).innerHTML += `<tr><td>${other_side}</td><td>${own_side}</td></tr>`
    return storeMsgs
}


function setupWS() {
    var user = JSON.parse(getUser())
    window.ws = new WebSocket('ws://' + location.origin.split('//')[1] + `/ws/${window.localStorage.getItem('sid')}`)
    ws.onmessage = async function (event) {
        var data = JSON.parse(event.data)
        visualizeMessages(data)
    };
}


function sendMessage(event, id) {
    if (!(ws.readyState === ws.OPEN)) {
        setupWS()
    }
    var user = JSON.parse(getUser())
    id = id.split('-')[0]
    var input = document.getElementById(id + "-msgt")
    var data = {
        'i': id, //chatID
        'c': 't', //content: txt/media
        'd': input.value //data
    }
    try {
        ws.send(JSON.stringify(data))
    }
    catch {
        location = '/'
    }

    input.value = ''
    event.preventDefault()
}

function scrollToBottom(scrollPos, scrollable) {
    if (scrollable === Math.ceil(scrollPos)) {
        window.scrollTo({
            top: document.body.scrollHeight,
            left: 0,
            behavior: 'instant',
        })
    }
}

document.addEventListener('scroll', async function (event) {
    const scrollPos = window.scrollY
    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    var mainDiv = document.getElementById('main-div')
    for (child of mainDiv.children) {
        if (child.hidden == false && child.classList.contains('chat')) {
            chatId = child.id.split('-')[0]
            var scrP = JSON.parse(window.sessionStorage.getItem('scrollPos'))
            scrP[chatId] = scrollPos
            window.sessionStorage.setItem('scrollPos', JSON.stringify(scrP))
            if (scrollPos < 300) {
                if (window.sessionStorage.getItem('currentlyLoading') == 'true') {
                    return
                }
                var howManyLoaded = JSON.parse(window.sessionStorage.getItem('howManyLoaded'))
                var nextToLoad = Math.min(...howManyLoaded[chatId]) - 1
                if (howManyLoaded[chatId].includes(nextToLoad) || nextToLoad < 1) {
                    return
                }
                window.sessionStorage.setItem('currentlyLoading', true)

                var url = new URL(location.origin + "/api/get_messages")
                url.searchParams.set("sid", window.localStorage.getItem('sid'))
                url.searchParams.set("chatId", chatId)
                url.searchParams.set("logIndex", nextToLoad)
                var res = await fetch(url, { method: "POST" })
                res = await res.json()
                if (res['status'] == 400) { return }
                data = res['data']

                var messages = document.getElementById(chatId + '-msgs')
                if (messages.firstChild.children.item(0).children.item(0).innerHTML == '') {
                    var oldestMsgs = messages.firstChild.children.item(0).children.item(1).firstChild
                }
                else {
                    var oldestMsgs = messages.firstChild.children.item(0).children.item(0).firstChild
                }
                var tempLog = { 'i': -1, 'msgs': {} }
                for (var c of oldestMsgs.children) {
                    if (c.tagName === 'DIV') {
                        if (c.classList.contains('msg-div')) {
                            tempLog['msgs'][c.id.split('-')[1]] = { 'a': c.id.split('-')[0], 'c': 't', 'd': c.firstChild.innerText }
                        }
                        else if (c.classList.contains('msg-img-div')) {
                            tempLog['msgs'][c.id.split('-')[1]] = { 'a': c.id.split('-')[0], 'c': 'i', 'd': c.firstChild.getAttribute("src").split('/')[3] }
                        }

                    }
                }
                data.push(tempLog)
                messages.firstChild.children.item(0).remove()

                var storeMsgs = document.createElement('table')
                storeMsgs.innerHTML += '<tbody></tbody>'
                for (log of data) {
                    for (var [time, msg] of Object.entries(log['msgs'])) {
                        msg['t'] = time
                        msg['i'] = chatId
                        storeMsgs = await storeMsgsToStr(msg, storeMsgs)
                    }
                    if (parseInt(log['i']) != -1) {
                        howManyLoaded[chatId].push(parseInt(log['i']))
                        window.sessionStorage.setItem('howManyLoaded', JSON.stringify(howManyLoaded))
                    }
                }

                var temp = messages.firstChild.innerHTML

                messages.children.item(0).innerHTML = storeMsgs.lastChild.innerHTML + temp

                window.scrollTo({ top: scrollPos + Math.abs(scrollable - (document.documentElement.scrollHeight - window.innerHeight)), left: 0, behavior: 'instant' })
                var scrP = JSON.parse(window.sessionStorage.getItem('scrollPos'))
                scrP[chatId] = scrollPos
                window.sessionStorage.setItem('scrollPos', JSON.stringify(scrP))
                window.sessionStorage.setItem('currentlyLoading', false)
            }
        }
    }
})

function showTime(id) {
    const scrollPos = window.scrollY
    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    if (!id.endsWith('-time')) {
        id += '-time'
    }
    var time = document.getElementById(id)
    var state = time.hidden
    var times = document.querySelectorAll('.time-txt')
    times.forEach(function (t) {
        t.hidden = true
    })

    time.hidden = !state
    scrollToBottom(scrollPos, scrollable)
}

async function loadGallery() {
    hideChildren(true, document.getElementById('main-div').children)
    document.getElementById('gallery').hidden = false

    if (window.sessionStorage.getItem('galleryLoaded') == 'true') { return }

    await loadGalleryItems()
}

async function loadGalleryItems() {
    var user = JSON.parse(getUser())

    var url = new URL(location.origin + '/api/list_media')
    url.searchParams.set('sid', window.localStorage.getItem('sid'))
    var res = await fetch(url, { method: 'GET' })
    res = await res.json()
    if (res['status'] == 400) { return }
    var data = res['data']

    var gallery = document.getElementById('gallery-items')
    var selector = document.getElementById('media-sel-div')
    for (const [img_id, t] of data.reverse()) {
        ty = t.split('/')[0]
        var isvideoholder = ''
        if (ty == 'image') {
            var innerMedia = `<img onclick="fullscreenMedia('${user['id']}', '${img_id}', 'i')" src="/img/${user['id']}/${img_id}">`
        }
        else if (ty == 'video') {
            var innerMedia = `<img src="/img/${user['id']}/${img_id}?isindexi=1"><span onclick="fullscreenMedia('${user['id']}', '${img_id}', 'v')" class="material-symbols-outlined play-btn">play_arrow</span>`
            isvideoholder = ' video-holder'
        }
        //`<video width="275" height="275" name="media"><source src="/img/${user['id']}/${img_id}?isindexi=1" type="${t}"></video>`

        ty = ty[0]

        gallery.innerHTML +=
            `<div id="${img_id}-div" class="holder${isvideoholder}">
        ${innerMedia}
        <a media-type="${ty}" id="${img_id}" onclick="selectFile(id)" href="javascript:void(0)" class="select-icon-media">
        <span class="material-symbols-outlined">check_box_outline_blank</span>
        </a>
        </div>`

        selector.innerHTML +=
            `<div id="${img_id}-sel-div" class="holder${isvideoholder}">
        ${innerMedia}
        <a media-type="${ty}" id="${img_id}-sel" onclick="selectFile(id)" href="javascript:void(0)" class="select-icon-media">
        <span class="material-symbols-outlined">check_box_outline_blank</span>
        </a>
        </div>`
    }
    window.sessionStorage.setItem('galleryLoaded', true)
}

async function uploadFile(event) {
    event.preventDefault()
    file = new FileReader()
    try {
        file.readAsBinaryString(event.srcElement[0].files[0])
    }
    catch { return }

    file.onload = async function () {
        var user = JSON.parse(getUser())
        var url = new URL(location.origin + "/uploadfile")
        url.searchParams.set('sid', window.localStorage.getItem('sid'))
        const formData = new FormData()
        formData.append('file', event.srcElement[0].files[0])
        var res = await fetch(url, { method: "POST", body: formData })
        res = await res.json()
        if (res['status'] == 400) { return }
        data = res['data']

        var gallery = document.getElementById('gallery-items')
        var selector = document.getElementById('media-sel-div')

        ty = event.srcElement[0].files[0].type.split('/')[0]
        var isvideoholder = ''
        if (ty == 'image') {
            var innerMedia = `<img onclick="fullscreenMedia('${user['id']}', '${data}', 'i')" src="/img/${user['id']}/${data}">`
        }
        else if (ty == 'video') {
            var innerMedia = `<img src="/img/${user['id']}/${data}?isindexi=1"><span onclick="fullscreenMedia('${user['id']}', '${data}', 'v')" class="material-symbols-outlined play-btn">play_arrow</span>`
            isvideoholder = ' video-holder'
        }

        ty = ty[0]

        gallery.innerHTML =
            `<div id="${data}-div" class="holder${isvideoholder}">
        ${innerMedia}
        <a media-type="${ty}" id="${data}" onclick="selectFile(id)" href="javascript:void(0)" class="select-icon-media">
        <span class="material-symbols-outlined">check_box_outline_blank</span>
        </a>
        </div>`
            + gallery.innerHTML

        selector.innerHTML =
            `<div id="${data}-sel-div" class="holder${isvideoholder}">
        ${innerMedia}
        <a media-type="${ty}" id="${data}-sel" onclick="selectFile(id)" href="javascript:void(0)" class="select-icon-media">
        <span class="material-symbols-outlined">check_box_outline_blank</span>
        </a>
        </div>`
            + selector.innerHTML
    }
}

async function deleteMedia() {
    for (const img of document.querySelectorAll('.select-icon-media.active')) {
        var url = new URL(location.origin + '/api/delete_media')
        url.searchParams.set('sid', window.localStorage.getItem('sid'))
        url.searchParams.set('imgId', img.id)
        var res = await fetch(url, { method: 'DELETE' })
        res = await res.json()
        if (res['status'] == 400) { return }
        document.getElementById(img.id + '-div').remove()
        document.getElementById(img.id + '-sel-div').remove()
    }
    closeSelector()
}

function loadFileSelector(id) {
    closeSelector()
    document.getElementById('body').style.overflowY = 'hidden'
    document.getElementById('overlay-sel').classList.add('active')
    document.getElementById('media-selector-popup').classList.add('active')
    document.getElementById('media-selector-popup').classList.add(id.split('-')[0] + '-media')
}

function selectFile(id) {
    var check = document.getElementById(id)


    if (check.classList.contains('active')) {
        check.children.item(0).innerHTML = 'check_box_outline_blank'
        check.classList.remove('active')
    }
    else {
        check.children.item(0).innerHTML = 'check_box'
        check.classList.add('active')
    }
}

function closeSelector() {
    document.getElementById('overlay-sel').classList.remove('active')
    document.getElementById('media-selector-popup').classList.remove('active')
    document.getElementById('media-selector-popup').classList.remove('select-icon-media')
    for (const img of document.querySelectorAll('.select-icon-media.active')) {
        selectFile(img.id)
    }
    document.getElementById('body').style.overflowY = 'scroll'
}

function closeShower() {
    try {
        document.getElementById('media-shower').pause()
    }
    catch { }
    document.getElementById('body').style.overflowY = 'scroll'
    document.getElementById('media-shower').remove()
    document.getElementById('overlay-show').classList.remove('active')
}

async function sendSelectedMedia() {
    for (const cl of document.getElementById('media-selector-popup').classList) {
        if (cl.endsWith('media')) {
            var id = cl.split('-')[0]
        }
    }

    for (const img of document.querySelectorAll('.select-icon-media.active')) {
        if (!(ws.readyState === ws.OPEN)) {
            setupWS()
        }
        var user = JSON.parse(getUser())
        var data = {
            'i': id, //chatID
            'c': img.getAttribute('media-type'), //content: image
            'd': img.id.split('-')[0] //imageId
        }
        try {
            ws.send(JSON.stringify(data))

        }
        catch {
            location = '/'
        }
    }
    closeSelector()
    window.scrollTo(0, document.body.scrollHeight)
}

function fullscreenMedia(author, id, type, timeId = 0) {
    document.getElementById('body').style.overflowY = 'hidden'
    document.getElementById('overlay-show').classList.add('active')
    var body = document.getElementById('body')
    if (type == 'v') {
        body.innerHTML += `<video id="media-shower" controls name="media"><source src="/video/${author}/${id}?isindexi=1"></video>`
        showTime(timeId)
    }
    else if (type == 'i') {
        body.innerHTML += `<img id="media-shower" src="/img/${author}/${id}"/>`
    }

}

async function loadChats() {
    await getUserData()
    await visualizeGroups()
    await visualizeFriends()
    for (const chatId of Object.values(JSON.parse(getUser())['contacts'])) {
        await loadChat(chatId)
    }
    for (const chatId of Object.keys(JSON.parse(getUser())['groups'])) {
        await loadChat(chatId)
    }
}

async function generateFriendInviteBoxes() {
    list = ''
    names = JSON.parse(window.localStorage.getItem('namesbyid'))
    for (const id of Object.keys(JSON.parse(getUser())['contacts'])) {
        if (names[id] == undefined) {
            var url = new URL(location.origin + "/api/get_usern_by_id")
            url.searchParams.set("id", id)
            var res = await fetch(url, { method: "POST" })
            res = await res.json()
            if (res['status'] != 400) { names[id] = res['name'] }
            window.localStorage.setItem("namesbyid", JSON.stringify(names))
        }
        list += `
            <div class="friend-req-divs friend-container">
            <p class="username-group-p">${names[id]}</p>
            <p class="text-black-50 fs-6">Id: ${id}</p>
            <span class="material-symbols-outlined group-select" id="${id}-group-select" onclick="selectUserForGroup(id)">check_box_outline_blank</span>
            </div>`
    }
    document.getElementById('user-list-div').innerHTML += list

}

function selectUserForGroup(id) {
    sel = document.getElementById(id)
    if (sel.innerText != 'check_box') {
        sel.innerText = 'check_box'
    }
    else {
        sel.innerText = 'check_box_outline_blank'
    }
}

async function createGroup(e) {
    e.preventDefault()
    var idlist = []
    for (const obj of document.querySelectorAll('.group-select')) {
        if (document.getElementById(obj.id).innerText == 'check_box') {
            idlist.push(obj.id.split('-')[0])
        }
    }

    var groupName = document.getElementById('group-name-input').value

    if (document.getElementById('public-name').checked) {
        var publicName = 1
    }
    else {
        var publicName = 0
    }

    if (document.getElementById('invite-link-disable').checked) {
        var disableLink = 1
    }
    else {
        var disableLink = 0
    }

    var groupAccept = ['no', 'anyone', 'admin', 'owner'][document.getElementById('group-accept-setting').value - 1]

    var settings = { 'approveJoin': groupAccept, 'disableLink': disableLink, 'publicName': publicName }

    if (idlist.length != 0 && groupName.length > 3 && groupName.length < 20) {
        var url = new URL(location.origin + "/api/create_group")
        url.searchParams.set("sid", window.localStorage.getItem('sid'))
        url.searchParams.set("members", JSON.stringify(idlist))
        url.searchParams.set("name", groupName)
        url.searchParams.set("settings", JSON.stringify(settings))
        var res = await fetch(url, { method: "POST" })
        res = await res.json()
        if (res['status'] == 201) {
            for (const obj of document.querySelectorAll('.group-select')) {
                document.getElementById(obj.id).innerText = 'check_box_outline_blank'
            }
            document.getElementById('group-name-input').value = ''
            document.getElementById('create-group-form').remove()
            var h = document.getElementById('success-group-header')
            h.innerText = `Sikeresen létrehoztál egy csoportot "${groupName}" néven`
            await getUserData()
            await visualizeGroups()
            if (disableLink == 0) {
                var btn = document.getElementById('copy-link-btn')
                btn.innerText = 'Link másolása'
                btn.hidden = false
                ci = document.getElementById('copy-input')
                ci.value = location.origin + '/join/' + res['data']
            }

        }
    }
}

function copyLink() {
    ci = document.getElementById('copy-input')
    ci.hidden = false
    ci.select()
    if (document.execCommand("copy")) {
        var btn = document.getElementById('copy-link-btn')
        btn.innerText = 'Link kimásolva'
    }
    ci.hidden = true
}

async function handleGroupInvite(id) {
    var url = new URL(location.origin + "/api/handle_group_invite")
    url.searchParams.set("sid", window.localStorage.getItem('sid'))
    url.searchParams.set("groupId", id.split('-')[1])
    url.searchParams.set("action", id.split('-')[0])
    var res = await fetch(url, { method: "POST" })
    res = await res.json()
    if (res['status'] == 200) {
        await getUserData()
        if (id.split('-')[0] == 'd') {
            document.getElementById(id.split('-')[1] + '-chat').remove()
        }
        else {
            await visualizeGroups()
            for (const chatId of Object.keys(JSON.parse(getUser())['groups'])) {
                await loadChat(chatId)
            }
            showChat(id.split('-')[1])

        }
    }
}

async function handleJoinRequest(id, action) {
    var url = new URL(location.origin + "/api/handle_join_request")
    url.searchParams.set("sid", window.localStorage.getItem('sid'))
    url.searchParams.set("groupId", id.split('-')[0])
    url.searchParams.set("action", action)
    var res = await fetch(url, { method: "POST" })
    res = await res.json()
    if (res['status'] == 200) {
        console.log(action)
        if(action.startsWith('d_') || action.startsWith('a_')) {
            document.getElementById(id).parentElement.parentElement.remove()
            return
        }
        await getUserData()
        await visualizeGroups()
        for (const chatId of Object.keys(JSON.parse(getUser())['groups'])) {
            await loadChat(chatId)
        }
    }
}

function closeOverlay() {
    overlay_sel = document.getElementById('overlay-sel')
    overlay_show = document.getElementById('overlay-show')
    overlay_set = document.getElementById('overlay-set')
    if (overlay_set.classList.contains('active')) {
        closeSettings()
    } else if (overlay_show.classList.contains('active')) {
        closeShower()
    } else if (overlay_sel.classList.contains('active')) {
        closeSelector()
    }

}

async function openSettings(id, type) {
    document.getElementById('body').style.overflowY = 'hidden'
    document.getElementById('overlay-set').classList.add('active')
    if (type == 'group') {
        popup = document.getElementById('group-settings')
        popup.classList.add('active')

        var url = new URL(location.origin + "/api/get_group_data")
        url.searchParams.set("sid", window.localStorage.getItem('sid'))
        url.searchParams.set("groupId", id.split('-')[0])
        var res = await fetch(url, { method: "GET" })
        res = await res.json()
        if (res['status'] == 200) {
            data = res['data']
            window.sessionStorage.setItem(id.split('-')[0], JSON.stringify(data))
            var owner = ''
            var admins = ''
            var members = ''

            var user = JSON.parse(getUser())

            var isowner = false

            if(user['id'] == data['owner']) {
                isowner = true
            }

            for (const member of data['members']) {
                var name = await getNameById(member)
                var moreOptions = '</div>'
                var adminbtn = ''
                if(isowner && member != data['owner']) {
                    if(!data['admins'].includes(member)) {
                        adminbtn = `<button id="" class="btn btn-success decline-request">Adminisztrátorrá tétel</button>`
                    }
                    moreOptions = `<span id="${member}-more-btn" onclick="moreOptionsBar(id)" class="material-symbols-outlined group-settings-menu">menu</span>
                    </div>
                    <div id="${member}-more-bar" class="more-options-bar" hidden>
                    ${adminbtn}
                    <button id="" class="btn btn-warning accept-request">Kirúgás</button>
                    <button id="" class="btn btn-danger decline-request">Kitiltás</button></div>`
                }
                members +=
                    `<div class="friend-req-divs setting-user-div">
                <p class="username-group-p">${name}</p>
                <p class="text-black-50 fs-6">Id: ${member}</p>
                ${moreOptions}`
            }
            var namesbyid = JSON.parse(window.localStorage.getItem('namesbyid'))
            for (const admin of data['admins']) {
                admins +=
                    `<div class="friend-req-divs setting-user-div">
                <p class="username-group-p">${namesbyid[admin]}</p>
                <p class="text-black-50 fs-6">Id: ${admin}</p>
                </div>`
            }
            owner =
                `<div class="friend-req-divs setting-user-div">
            <p class="username-group-p">${namesbyid[data['owner']]}</p>
            <p class="text-black-50 fs-6">Id: ${data['owner']}</p>
            </div>`

            document.getElementById('owner-div').innerHTML = owner
            document.getElementById('admins-div').innerHTML = admins
            document.getElementById('members-div').innerHTML = members

            var reqs = ''
            var invites = ''
            var blocked = ''
            
            var apj = data['settings']['approveJoin']

            for (const req of data['waitingForApproval']) {
                var name = await getNameById(req)
                var options = ''
                if ((apj == 'anyone' && data['members'].includes(user['id'])) || (apj == 'admin' && data['admins'].includes(user['id'])) || (apj == 'owner' && data['owner'] == user['id'])) {
                    options = `<div><button id="${id.split('-')[0]}-accept-${req}" onclick="handleJoinRequest(id, 'a_${req}')" class="btn btn-success accept-request">Elfogadás</button>
                    <button id="${id.split('-')[0]}-decline-${req}" onclick="handleJoinRequest(id, 'd_${req}')" class="btn btn-danger decline-request">Elutasítás</button></div>`
                }
                reqs +=
                    `<div class="friend-req-divs setting-user-div">
                <p class="username-group-p">${name}</p>
                <p class="text-black-50 fs-6">Id: ${req}</p>
                ${options}
                </div>`
            }

            for (const inv of data['invited']) {
                var name = await getNameById(inv)
                var options = ''
                if ((apj == 'anyone' && data['members'].includes(user['id'])) || (apj == 'admin' && data['admins'].includes(user['id'])) || (apj == 'owner' && data['owner'] == user['id'])) {
                    options = `<button id="${id.split('-')[0]}-cancle-${inv}" onclick="handleJoinRequest('c_${inv}-${id.split('-')[0]}')" class="btn btn-danger decline-request">Elvetés</button>`
                }
                invites +=
                    `<div class="friend-req-divs setting-user-div">
                <p class="username-group-p">${name}</p>
                <p class="text-black-50 fs-6">Id: ${inv}</p>
                ${options}
                </div>`
            }

            for (const blo of data['blocked']) {
                var name = await getNameById(blo)
                blocked +=
                    `<div class="friend-req-divs setting-user-div">
                <p class="username-group-p">${name}</p>
                <p class="text-black-50 fs-6">Id: ${blo}</p>
                </div>`
            }

            document.getElementById('invites-div').innerHTML = invites
            document.getElementById('requests-div').innerHTML = reqs
            document.getElementById('blocked-div').innerHTML = blocked
            

            
            for(const child of document.getElementById('group-accept-setting-set').children) {
                if(child.value == ['no', 'anyone', 'admin', 'owner'].indexOf(data['settings']['approveJoin']) + 1) {
                    child.selected = true
                }
            }

            document.getElementById('invite-link-disable-set').checked = Boolean(data['settings']['disableLink'])
            document.getElementById('public-name-set').checked = Boolean(data['settings']['publicName'])
            
            document.getElementById('save-settings').innerHTML = ''

            if(isowner) {
                var settingsInput = document.querySelectorAll('.group-setting-mod')
                settingsInput.forEach(function (t) {
                    t.disabled = false
                })
                document.getElementById('save-settings').innerHTML = `<button onclick="saveSettings('${id.split('-')[0]}')" class="btn btn-primary">Mentés</button>`
            } else {
                document.getElementById('save-settings').innerHTML = ''
                var settingsInput = document.querySelectorAll('.group-setting-mod')
                settingsInput.forEach(function (t) {
                    t.disabled = true
                })
            }
            
        }
    }
}

function closeSettings() {
    document.getElementById('body').style.overflowY = 'scroll'
    document.getElementById('overlay-set').classList.remove('active')
    popup = document.getElementById('group-settings')
    popup.classList.remove('active')
    popup = document.getElementById('chat-settings')
    popup.classList.remove('active')
}

function openSettingsTab(tab) {
    var tabs = document.querySelectorAll('.settings-page')
    tabs.forEach(function (t) {
        t.hidden = true
    })
    if (tab == 'm') {
        document.getElementById('members-page').hidden = false
    } else if (tab == 'j') {
        document.getElementById('join-page').hidden = false
    } else if (tab == 's') {
        document.getElementById('settings-page').hidden = false
    }
}

async function getNameById(id) {
    var namesbyid = JSON.parse(window.localStorage.getItem('namesbyid'))
    var name = namesbyid[id]
    if (name == undefined) {
        var url = new URL(location.origin + "/api/get_usern_by_id")
        url.searchParams.set("id", id)
        var res = await fetch(url, { method: "POST" })
        res = await res.json()
        if (res['status'] == 400) { return 'Error' }
        namesbyid[id] = res['name']
        window.localStorage.setItem('namesbyid', JSON.stringify(namesbyid))
        return res['name']
    }
    return name
}

async function saveSettings(groupId) {
    data = JSON.parse(window.sessionStorage.getItem(groupId))
    if (document.getElementById('public-name-set').checked) {
        var publicName = 1
    }
    else {
        var publicName = 0
    }

    if (document.getElementById('invite-link-disable-set').checked) {
        var disableLink = 1
    }
    else {
        var disableLink = 0
    }
    var groupAccept = ['no', 'anyone', 'admin', 'owner'][document.getElementById('group-accept-setting-set').value - 1]

    var currentSettings = {'publicName':publicName, 'disableLink': disableLink, 'approveJoin': groupAccept}
    var change = false
    for(const [key, value] of Object.entries(currentSettings)) {
        if(value != data['settings'][key]) {
            change = true
        }
    }
    
    if(!change) {
        return
    }

    var url = new URL(location.origin + "/api/save_group_settings")
    url.searchParams.set("groupId", groupId)
    url.searchParams.set("settings", JSON.stringify(currentSettings))
    url.searchParams.set("sid", window.localStorage.getItem('sid'))
    var res = await fetch(url, { method: "POST" })
    res = await res.json()
    if (res['status'] == 200) {
        data['settings'] = currentSettings
        window.sessionStorage.setItem(groupId, JSON.stringify(data))
    }

    
}

function moreOptionsBar(id) {
    var value = document.getElementById(id.replace('btn', 'bar')).hidden

    var bars = document.querySelectorAll('.more-options-bar')
    bars.forEach(function (t) {
        t.hidden = true
    })
    
    document.getElementById(id.replace('btn', 'bar')).hidden = !value
}

if (getUser() == undefined) {
    location = '/'
}

document.onkeydown = function (evt) {
    evt = evt || window.event;
    if (evt.key == 'Escape') {
        closeOverlay()
    }
};

setupWS()

window.sessionStorage.setItem('currentlyLoading', false)
window.sessionStorage.setItem('howManyLoaded', '{}')
window.sessionStorage.setItem('scrollPos', '{}')
window.sessionStorage.removeItem('idToSendReq')
window.sessionStorage.setItem('galleryLoaded', false)

document.getElementById('self-name').innerText = JSON.parse(getUser())['userN']



loadChats()

loadGalleryItems()