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

async function register() {
    var lastN = document.getElementById('lastN').value
    var firstN = document.getElementById('firstN').value
    var userN = document.getElementById('userN').value
    var email = document.getElementById('email').value
    var password = document.getElementById('password').value
    var passwordAgain = document.getElementById('password-again').value

    var warning = document.getElementById('warning')
    warning.hidden = false
    warning.className = 'text-danger'

    if (lastN == '' || firstN == '' || userN == '' || email == '' || password == '') {
        warning.innerHTML = 'Egyik helyet se hagyja üresen'
        return
    }
    else if (password != passwordAgain) {
        warning.innerHTML = 'A két jelszó nem egyezik'
        return
    }

    var url = new URL(window.location.origin + '/api/register')

    encpass = await encryptPassword(password, email)
    console.log(encpass)

    url.searchParams.set('firstN', firstN)
    url.searchParams.set('lastN', lastN)
    url.searchParams.set('userN', userN)
    url.searchParams.set('email', email)
    url.searchParams.set('password', await encrypt(encpass))
    url.searchParams.set('unencpass', await encrypt(password))
    var res = await fetch(url, { method: 'POST' })
    var data = await res.json()
    var resToUser
    var color

    if (data['status'] == 201) {
        var id = data['id']
        resToUser = 'Sikeres regisztráció és bejelentkezés!'
        color = 'text-success'
        userData = {
            'firstN': firstN,
            'lastN': lastN,
            'id': id,
            'userN': userN,
            'email': email,
            'contacts': {},
            'groups': {},
            'settings': {},
            'friend_req': {},
        }
        window.localStorage.setItem('user', JSON.stringify(userData))
        window.localStorage.setItem('session', data['sid'])
        document.getElementById('lastN').value = ''
        document.getElementById('firstN').value = ''
        document.getElementById('userN').value = ''
        document.getElementById('email').value = ''
        document.getElementById('password').value = ''
        document.getElementById('password-again').value = ''
    }
    else if (data['status'] == 400) {
        var error = data['error']
        console.log(error)

        if (error == 'firstN') {
            resToUser = 'A vezetékneved nem tartalmazhat 32 karakternél többet vagy az ABC-ben nem szereplő betűt'
        }
        else if (error == 'lastN') {
            resToUser = 'A keresztneved nem tartalmazhat 32 karakternél többet vagy az ABC-ben nem szereplő betűt'
        }
        else if (error == 'userN') {
            resToUser = 'A fehasználóneved nem tartalmazhat 16 karakternél többet'
        }
        else if (error == 'userNot') {
            resToUser == 'Ez a felhasználónév már használatban van'
        }
        else if (error == 'email1') {
            resToUser = 'Ez az email már használatban van'
        }
        else if (error == 'email2') {
            resToUser = 'Ez az email nem érvényes'
        }
        else if (error == 'password') {
            resToUser = 'A jelszónak 8 és 32 karakter között kell lennie hosszúságban és tartalmaznia kell betűket és számokat is'
        }
        else {
            resToUser = 'Ismeretlen hiba'
        }
        color = 'text-danger'
    }

    warning.hidden = false
    warning.innerHTML = resToUser
    warning.className = color
}