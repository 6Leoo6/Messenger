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
    var inc = ''
    var out = ''
    for (const [key, value] of Object.entries(user['friend_req'])) {
        if(namesById[key] == '') {
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
        window.localStorage.setItem("idToSendReq", id)
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
    idTo = window.localStorage.getItem("idToSendReq")
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
            contacts: JSON.parse(data[6]),
            groups: JSON.parse(data[7]),
            settings: JSON.parse(data[8]),
            friend_req: JSON.parse(data[9]),
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
        <h2 class="name-title">${name}</h2>
        <table class="message-table" id="${user['contacts'][id]}-msgs"></table>
        <form class="message-form" id="${user['contacts'][id]}-send" action="" onsubmit="sendMessage(event, id)">
          <input type="text" id="${user['contacts'][id]}-msgt" autocomplete="off" />
          <button>Küldés</button>
        </form>
        <ul id="${user['contacts'][id]}-msgs"></ul>
      </div>`

    }
    document.getElementById('friends-div').innerHTML = friendsListContent
    document.getElementById('main-div').innerHTML += friendDivs
}

function loadChat(id) {
    id = id.split('-')[0]
    console.log(id)
    hideChildren(true, document.getElementById('main-div').children)
    chatDiv = document.getElementById(id + '-chat')
    chatDiv.hidden = false
}

visualizeFriends()

var user = JSON.parse(window.localStorage.getItem("user"))
var ws = new WebSocket('ws://' + location.origin.split('//')[1] + `/ws/${user['id']}?password=${user['password']}`)
console.log(ws)
ws.onmessage = async function (event) {
    const scrollPos = window.scrollY
    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    var user = JSON.parse(window.localStorage.getItem("user"))
    var data = JSON.parse(event.data)
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


    var messages = document.getElementById(data['i'] + '-msgs')
    try {

        var lastRow = messages.children.item(messages.childElementCount - 1).children.item(0)

        if (lastRow.children.item(0).innerHTML != '' && lastRow.children.item(0).children.item(0).children.item(1).id.split('-')[0] == data['a']) {
            console.log('left')
            document.getElementById(lastRow.children.item(0).children.item(0).children.item(1).id).parentElement.innerHTML += `<div class="msg-div" id="${data['a']}-${data['t']}"><p>${data['d']}</p></div>`
            scrollToBottom(scrollPos, scrollable)
            return
        }
        else if (lastRow.children.item(1).innerHTML != '' && lastRow.children.item(1).children.item(0).children.item(1).id.split('-')[0] == data['a']) {
            console.log('right')
            document.getElementById(lastRow.children.item(1).children.item(0).children.item(1).id).parentElement.innerHTML += `<div class="msg-div" id="${data['a']}-${data['t']}"><p>${data['d']}</p></div>`
            scrollToBottom(scrollPos, scrollable)
            return
        }
    }
    catch { }


    if (user['id'] == data['a']) {
        other_side = ''
        own_side = `<div class="right"><div class="msg-div" id="${data['a']}-${data['t']}"><p>${data['d']}</p></div></div>`
    }
    else {
        other_side = `<div class="left"><p>${namesById[data['a']]}</p><div class="msg-div" id="${data['a']}-${data['t']}"><p>${data['d']}</p></div></div>`
        own_side = ''
    }

    messages.innerHTML += `
    <tr>
      <td>${other_side}</td>
      <td>${own_side}</td>
    </tr>
    `
    scrollToBottom(scrollPos, scrollable)
};
function sendMessage(event, id) {
    var user = JSON.parse(window.localStorage.getItem("user"))
    id = id.split('-')[0]
    var input = document.getElementById(id + "-msgt")
    var data = {
        'i': id, //chatID
        'a': user['id'], //author
        'c': 't', //content: txt/media
        'd': input.value //data
    }
    ws.send(JSON.stringify(data))
    input.value = ''
    event.preventDefault()
}

function scrollToBottom(scrollPos, scrollable) {
    if (scrollable === Math.ceil(scrollPos)) {
        console.log('At bottom!')
        window.scrollTo(0, document.body.scrollHeight)
    }
    console.log(scrollable, scrollPos)
}
