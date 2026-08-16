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

/* =========================================
   ATHLETE HOME
========================================= */

function goHome() {

    window.location.href = "athlete.html";

}


/* =========================================
   PROFILE
========================================= */

function openProfile() {

    window.location.href = "profile.html";

}


/* =========================================
   GOALS
========================================= */

function openGoal(goalId) {

    if (goalId === "current") {

        window.location.href = "goal.html";

        return;
    }


    if (goalId === "past-1") {

        window.location.href = "goal.html?goal=5k";

        return;
    }


    if (goalId === "past-2") {

        window.location.href = "goal.html?goal=10k";

        return;
    }

}


/* =========================================
   MESSAGES
========================================= */

function openMessages() {

    window.location.href = "messages.html";

}
