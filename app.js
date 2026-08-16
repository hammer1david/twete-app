/* =========================================
   TWETE APP JAVASCRIPT
========================================= */


/* =========================================
   LOGIN
========================================= */

function login() {

    /*
        TEMPORARY LOGIN

        For now we don't check username
        or password.

        We will connect the real
        authentication system later.
    */

    window.location.href = "athlete.html";
}


/* =========================================
   SHOW / HIDE PASSWORD
========================================= */

function togglePassword() {

    const password =
        document.getElementById("password");

    if (!password) {
        return;
    }


    if (password.type === "password") {

        password.type = "text";

    } else {

        password.type = "password";

    }
}


/* =========================================
   FORGOT PASSWORD
========================================= */

function forgotPassword() {

    /*
        Password recovery will be connected
        when we build the real account system.
    */

    alert("Password recovery will be available soon.");

}
