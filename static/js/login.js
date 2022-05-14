params = (new URL(location)).searchParams;
isLogin = params.get('login')
if(isLogin == 'true' || window.localStorage.getItem('user') == null) {} 
else {window.location.href = '/main'}



async function login() {
    email = document.getElementById('email-input').value
    password = document.getElementById('password-input').value

    var url = new URL(document.location.origin+'/api/login')
    url.searchParams.set('email', email)
    url.searchParams.set('password', password)

    var res = await fetch(url, {method: 'POST'})
    var data = await res.json()

    var warning = document.getElementById('warning')
    warning.hidden = false
    

    if(data['status'] == 200) {
        warning.className = 'text-success'
        warning.innerHTML = 'Sikeres bejelentkezés, átirányítás a főoldalra...'

        data = data['data']
        userData = {
            'firstN': data[0],
            'lastN': data[1],
            'id': data[2],
            'userN': data[3],
            'email': data[4],
            'password': data[5],
            'contacts': data[6],
            'groups': data[7],
            'settings': data[8],
            'friend_req': data[9],
        }
        window.localStorage.clear()
        window.localStorage.setItem('user', JSON.stringify(userData))
        
        await new Promise(r => setTimeout(r, 1500))

        window.location.href = '/?login=0'
    }
    else {
        warning.className = 'text-danger'

        var error = data['error']
        
        if(error == 'bad_auth') {
            warning.innerHTML = 'Az email cím vagy a jelszó helytelen'
        }
        else {
            warning.innerHTML = 'Ismeretlen hiba lépett fel'
        }
    }
}