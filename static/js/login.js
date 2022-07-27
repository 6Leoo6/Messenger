params = (new URL(location)).searchParams;
isLogin = params.get('login')
if (isLogin == 'true' || window.localStorage.getItem('user') == null || window.localStorage.getItem('sid') == null) { }
else { window.location.href = '/main' }

async function encrypt(text) {
    var url = new URL(window.location.origin + '/api/get_public_key')
    var res = await fetch(url, { method: 'GET' })
    var data = await res.json()
    pbk = data['pbk']
    publicKey = forge.pki.publicKeyFromPem(pbk)
    var encrypted = publicKey.encrypt(text, "RSA-OAEP", {
        md: forge.md.sha256.create(),
        mgf1: forge.mgf1.create()
    });
    return forge.util.encode64(encrypted)
}

async function encryptPassword(password, salt) {
    var md = forge.md.sha256.create()
    var dkey = forge.pkcs5.pbkdf2(password, salt, 1000, 16, md)
    return forge.util.bytesToHex(dkey)
}

async function login() {
    email = document.getElementById('email-input').value
    password = document.getElementById('password-input').value
    encpass = await encryptPassword(password, email)

    var url = new URL(document.location.origin + '/api/login')
    url.searchParams.set('email', email)
    url.searchParams.set('password', await encrypt(encpass))

    var res = await fetch(url, { method: 'POST' })
    var data = await res.json()

    var warning = document.getElementById('warning')
    warning.hidden = false


    if (data['status'] == 200) {
        warning.className = 'text-success'
        warning.innerHTML = 'Sikeres bejelentkezés, átirányítás a főoldalra...'
        
        sid = data['sid']
        data = data['data']
        userData = {
            'firstN': data[0],
            'lastN': data[1],
            'id': data[2],
            'userN': data[3],
            'email': data[4],
            'contacts': data[5],
            'groups': data[6],
            'settings': data[7],
            'friend_req': data[8],
        }
        window.localStorage.clear()
        window.localStorage.setItem('user', JSON.stringify(userData))
        window.localStorage.setItem('sid', sid)

        await new Promise(r => setTimeout(r, 1500))

        window.location.href = '/main'
    }
    else {
        warning.className = 'text-danger'

        var error = data['error']

        if (error == 'bad_auth') {
            warning.innerHTML = 'Az email cím vagy a jelszó helytelen'
        }
        else {
            warning.innerHTML = 'Ismeretlen hiba lépett fel'
        }
    }
}