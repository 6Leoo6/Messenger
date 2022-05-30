if(window.localStorage.getItem('user') == undefined){
    location = '/'
}

window.sessionStorage.setItem('currentlyLoading', false)
window.sessionStorage.setItem('howManyLoaded', '{}')
window.sessionStorage.setItem('scrollPos', '{}')
window.sessionStorage.removeItem('idToSendReq')

document.getElementById('self-name').innerText = JSON.parse(window.localStorage.getItem('user'))['userN']

function changeList(id) {
    if (id == "user-single") {
        document.getElementById("add-friend").hidden = false
        document.getElementById("add-group").hidden = true
    } else if (id == "user-group") {
        document.getElementById("add-friend").hidden = true
        document.getElementById("add-group").hidden = false
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
    }
}

async function handleReq(id) {
    var user = JSON.parse(window.localStorage.getItem('user'))

    var [idTo, action] = id.split('-')

    var url = new URL(location.origin + "/api/handle_friend_req")
    url.searchParams.set("id", user['id'])
    url.searchParams.set("password", user['password'])
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
    var user = JSON.parse(window.localStorage.getItem("user"))
    var namesById = JSON.parse(window.localStorage.getItem("namesbyid"))
    if(namesById == null){
        window.localStorage.setItem("namesbyid", "{}")
    }
    var namesById = JSON.parse(window.localStorage.getItem("namesbyid"))
    var inc = ''
    var out = ''
    for (const [key, value] of Object.entries(user['friend_req'])) {
        if(namesById[key] == undefined) {
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
        var user = JSON.parse(window.localStorage.getItem("user"))
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
    var user = JSON.parse(window.localStorage.getItem("user"))
    url.searchParams.set("idTo", idTo)
    url.searchParams.set("idFrom", user["id"])
    url.searchParams.set("passwordFrom", user["password"])
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
    var user = JSON.parse(window.localStorage.getItem("user"))

    if (user == null) {
        location.href = "/"
    }

    var email = user["email"]
    var password = user["password"]

    var url = new URL(document.location.origin + "/api/login")
    url.searchParams.set("email", email)
    url.searchParams.set("password", password)
    var res = await fetch(url, { method: "POST" })
    var data = await res.json()

    if (data["status"] == 200) {
        data = data["data"]
        userData = {
            firstN: data[0],
            lastN: data[1],
            id: data[2],
            userN: data[3],
            email: data[4],
            password: data[5],
            contacts: data[6],
            groups: data[7],
            settings: data[8],
            friend_req: data[9],
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
    var user = JSON.parse(window.localStorage.getItem("user"))
    for (const [id, chatId] of Object.entries(user['contacts'])) {
        var url = new URL(location.origin + "/api/get_usern_by_id")
        url.searchParams.set("id", id)
        var res = await fetch(url, { method: "POST" })
        res = await res.json()
        if (res['status'] == 400) { continue }
        var name = res['name']

        friendsListContent += `<div class="friend-div" id="${user['contacts'][id]}-btn" onclick="loadChat(id)"><p>${name}</p></div>`
        friendDivs += `
        <div class="chat" id="${user['contacts'][id]}-chat" hidden>
        <div class="name-div"><h2 class="name-title">${name}</h2></div>
        <table class="message-table" id="${user['contacts'][id]}-msgs"><tbody></tbody></table>
        <form class="message-form" id="${user['contacts'][id]}-send" action="" onsubmit="sendMessage(event, id)">
            <div class="msg-form-div">
                <a href="javascript:void(0)" class="upload-link">
                    <span class="material-symbols-outlined upload-icon">
                        file_upload
                    </span>
                </a>
                <input class="shadow-none" type="text" id="${user['contacts'][id]}-msgt" autocomplete="off" placeholder="Írja ide a szöveget"/>
                <button class="btn btn-dark">Küldés</button>
            </div>
          
        </form>
        <ul id="${user['contacts'][id]}-msgs"></ul>
      </div>`

    }
    document.getElementById('friends-div').innerHTML = friendsListContent
    document.getElementById('main-div').innerHTML += friendDivs
}

async function loadChat(chatId) {
    chatId = chatId.split('-')[0]
    hideChildren(true, document.getElementById('main-div').children)
    chatDiv = document.getElementById(chatId + '-chat')
    chatDiv.hidden = false
    if(JSON.parse(window.sessionStorage.getItem('scrollPos'))[chatId]){
        window.scrollTo(0, JSON.parse(window.sessionStorage.getItem('scrollPos'))[chatId])
    }
    var howManyLoaded = JSON.parse(window.sessionStorage.getItem('howManyLoaded'))
    if(howManyLoaded[chatId]){return}
    window.sessionStorage.setItem('currentlyLoading', true)
    var user = JSON.parse(window.localStorage.getItem("user"))
    var url = new URL(location.origin + "/api/get_messages")
    url.searchParams.set("id", user['id'])
    url.searchParams.set("password", user['password'])
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
    for(log of data) {
        howManyLoaded[chatId].push(parseInt(log['i']))
        for(var [time, msg] of Object.entries(log['msgs'])){
            msg['t'] = time
            msg['i'] = chatId
            visualizeMessages(msg)
        }
    }
    window.sessionStorage.setItem('howManyLoaded', JSON.stringify(howManyLoaded))
    window.sessionStorage.setItem('currentlyLoading', false)
}

async function visualizeMessages(data) {
    const scrollPos = window.scrollY
    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    var user = JSON.parse(window.localStorage.getItem("user"))
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
    var msg = `<div class="msg-div" id="${data['a']}-${data['t']}" onclick="showTime(id)"><p>${data['d']}</p></div><p class="time-txt" id="${data['a']}-${data['t']}-time" hidden>${d.toLocaleString()}</p>`
    try {

        var lastRow = messages.children.item(0).children.item(messages.children.item(0).childElementCount - 1)
        if(lastRow == null) {throw 'First row'}
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
    catch (error) {}


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
    var user = JSON.parse(window.localStorage.getItem("user"))
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
    var msg = `<div class="msg-div" id="${data['a']}-${data['t']}" onclick="showTime(id)"><p>${data['d']}</p></div><p class="time-txt" id="${data['a']}-${data['t']}-time" hidden>${d.toLocaleString()}</p>`
    try {
        var lastRow = storeMsgs.children.item(0).lastChild
        if(lastRow == null) {throw 'No rows'}
        if (lastRow.children.item(0).innerHTML != '' && lastRow.children.item(0).children.item(0).children.item(1).id.split('-')[0] == data['a']) {
            storeMsgs.children.item(0).lastChild.children.item(0).children.item(0).innerHTML += msg
            return storeMsgs
        }
        else if (lastRow.children.item(1).innerHTML != '' && lastRow.children.item(1).children.item(0).children.item(1).id.split('-')[0] == data['a']) {
            storeMsgs.children.item(0).lastChild.children.item(1).children.item(0).innerHTML += msg
            return storeMsgs
        }
    }
    catch (error) {}


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


var user = JSON.parse(window.localStorage.getItem("user"))
function setupWS(){
    window.ws = new WebSocket('ws://' + location.origin.split('//')[1] + `/ws/${user['id']}?password=${user['password']}`)
    ws.onmessage = async function (event) {
        var data = JSON.parse(event.data)
        visualizeMessages(data)
    };
}
setupWS()

function sendMessage(event, id) {
    if(!(ws.readyState === ws.OPEN)){
        setupWS()
    }
    var user = JSON.parse(window.localStorage.getItem("user"))
    id = id.split('-')[0]
    var input = document.getElementById(id + "-msgt")
    var data = {
        'i': id, //chatID
        'a': user['id'], //author
        'c': 't', //content: txt/media
        'd': input.value //data
    }
    try{
        ws.send(JSON.stringify(data))
    }
    catch{
        location
    }
    
    input.value = ''
    event.preventDefault()
}

function scrollToBottom(scrollPos, scrollable) {
    if (scrollable === Math.ceil(scrollPos)) {
        window.scrollTo(0, document.body.scrollHeight)
    }
}

document.addEventListener('scroll', async function(event) {
    const scrollPos = window.scrollY
    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    var mainDiv = document.getElementById('main-div')
    for(child of mainDiv.children){
        if(child.hidden == false && child.classList.contains('chat')) {
            chatId = child.id.split('-')[0]
            var scrP = JSON.parse(window.sessionStorage.getItem('scrollPos'))
            scrP[chatId] = scrollPos
            window.sessionStorage.setItem('scrollPos', JSON.stringify(scrP))
            if(scrollPos < 300) {
                if(window.sessionStorage.getItem('currentlyLoading') == 'true') {
                    return
                }
                var howManyLoaded = JSON.parse(window.sessionStorage.getItem('howManyLoaded'))
                var nextToLoad = Math.min(...howManyLoaded[chatId])-1
                if(howManyLoaded[chatId].includes(nextToLoad) || nextToLoad<1){
                    return
                }
                window.sessionStorage.setItem('currentlyLoading', true)

                var user = JSON.parse(window.localStorage.getItem("user"))
                var url = new URL(location.origin + "/api/get_messages")
                url.searchParams.set("id", user['id'])
                url.searchParams.set("password", user['password'])
                url.searchParams.set("chatId", chatId)
                url.searchParams.set("logIndex", nextToLoad)
                var res = await fetch(url, { method: "POST" })
                res = await res.json()
                if (res['status'] == 400) {return}
                data = res['data']

                var messages = document.getElementById(chatId + '-msgs')
                if(messages.firstChild.children.item(0).children.item(0).innerHTML == ''){
                    var oldestMsgs = messages.firstChild.children.item(0).children.item(1).firstChild
                }
                else {
                    var oldestMsgs = messages.firstChild.children.item(0).children.item(0).firstChild
                }
                var tempLog = {'i':-1, 'msgs': {}}
                for(var c of oldestMsgs.children){
                    if(c.tagName === 'DIV') {
                        tempLog['msgs'][c.id.split('-')[1]] = {'a':c.id.split('-')[0], 'c':'t', 'd':c.firstChild.innerText}
                    }      
                }
                tempLog = JSON.stringify(tempLog)
                data.push(tempLog)
                messages.firstChild.children.item(0).remove()

                var storeMsgs = document.createElement('table')
                storeMsgs.innerHTML += '<tbody></tbody>'
                for(log of data) {
                    log = JSON.parse(log)
                    if(parseInt(log['i']) != -1){
                        howManyLoaded[chatId].push(parseInt(log['i']))
                        window.sessionStorage.setItem('howManyLoaded', JSON.stringify(howManyLoaded))
                    }
                    for(var [time, msg] of Object.entries(log['msgs'])){
                        msg['t'] = time
                        msg['i'] = chatId
                        storeMsgs = await storeMsgsToStr(msg, storeMsgs)
                    }
                }
                
                var temp = messages.firstChild.innerHTML

                messages.children.item(0).innerHTML = storeMsgs.lastChild.innerHTML + temp
                
                window.scrollTo(0, scrollPos+Math.abs(scrollable-(document.documentElement.scrollHeight - window.innerHeight)))
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
    var time = document.getElementById(id+'-time')
    var state = time.hidden
    var times = document.querySelectorAll('.time-txt')
    times.forEach(function(t){
        t.hidden = true
    })
    
    time.hidden = !state
    scrollToBottom(scrollPos, scrollable)
}

async function loadGallery() {
    hideChildren(true, document.getElementById('main-div').children)
    document.getElementById('gallery').hidden = false
}

visualizeFriends()