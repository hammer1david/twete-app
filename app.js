/* =========================================
   TWETE + SUPABASE
========================================= */


/* =========================================
   SUPABASE CONNECTION
========================================= */

const SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


/* =========================================
   MESSAGE
========================================= */

function showMessage(message, type = "normal") {

    const element =
        document.getElementById("authMessage");

    if (!element) return;

    element.textContent = message;

    if (type === "error") {
        element.style.color = "#ff5555";
    }

    else if (type === "success") {
        element.style.color = "#C6FF00";
    }

    else {
        element.style.color = "#ffffff";
    }
}


/* =========================================
   LOGIN
========================================= */

async function login() {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;


    if (!email || !password) {

        showMessage(
            "Please enter your email and password.",
            "error"
        );

        return;
    }


    const button =
        document.getElementById("loginButton");

    button.disabled = true;

    button.textContent = "Logging in...";


    const { data, error } =
        await supabaseClient.auth.signInWithPassword({

            email: email,

            password: password

        });


    if (error) {

        console.error(error);

        showMessage(
            "Login failed. Please check your email and password.",
            "error"
        );

        button.disabled = false;

        button.textContent = "Log in";

        return;
    }


    await redirectUser(data.user);


    button.disabled = false;

    button.textContent = "Log in";
}


/* =========================================
   CHECK USER ROLE
========================================= */

async function redirectUser(user) {

    if (!user) {

        showMessage(
            "No user session found.",
            "error"
        );

        return;
    }


    const { data: profile, error } =
        await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();


    if (error) {

        console.error(error);

        showMessage(
            "Could not load your profile.",
            "error"
        );

        return;
    }


    /* COACH */

    if (profile.role === "coach") {

        window.location.href =
            "coach.html";

        return;
    }


    /* ATHLETE */

    window.location.href =
        "athlete.html";
}


/* =========================================
   COACH LOGIN
========================================= */

async function coachLogin() {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;


    if (!email || !password) {

        showMessage(
            "Enter your coach email and password.",
            "error"
        );

        return;
    }


    const button =
        document.getElementById("coachLoginButton");

    button.disabled = true;

    button.textContent = "Checking...";


    const { data, error } =
        await supabaseClient.auth.signInWithPassword({

            email: email,

            password: password

        });


    if (error) {

        console.error(error);

        showMessage(
            "Login failed. Check your email and password.",
            "error"
        );

        button.disabled = false;

        button.textContent = "Coach Login";

        return;
    }


    /* Check profile */

    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();


    if (profileError) {

        showMessage(
            "Could not check your account.",
            "error"
        );

        await supabaseClient.auth.signOut();

        button.disabled = false;

        button.textContent = "Coach Login";

        return;
    }


    /* IMPORTANT:
       Only a real coach account
       can access coach.html.
    */

    if (profile.role !== "coach") {

        showMessage(
            "This account is not registered as a coach.",
            "error"
        );

        await supabaseClient.auth.signOut();

        button.disabled = false;

        button.textContent = "Coach Login";

        return;
    }


    window.location.href =
        "coach.html";
}


/* =========================================
   CREATE ACCOUNT
========================================= */

async function showSignup() {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;


    if (!email || !password) {

        showMessage(
            "Enter an email and password first.",
            "error"
        );

        return;
    }


    if (password.length < 6) {

        showMessage(
            "Password must contain at least 6 characters.",
            "error"
        );

        return;
    }


    showMessage(
        "Creating your account...",
        "normal"
    );


    const { data, error } =
        await supabaseClient.auth.signUp({

            email: email,

            password: password

        });


    if (error) {

        console.error(error);

        showMessage(
            error.message,
            "error"
        );

        return;
    }


    if (data.session) {

        showMessage(
            "Account created successfully!",
            "success"
        );

        await redirectUser(data.user);

        return;
    }


    showMessage(
        "Account created. Please check your email to confirm your account.",
        "success"
    );
}


/* =========================================
   SHOW / HIDE PASSWORD
========================================= */

function togglePassword() {

    const password =
        document.getElementById("password");


    if (!password) return;


    if (password.type === "password") {

        password.type = "text";

    } else {

        password.type = "password";

    }
}


/* =========================================
   FORGOT PASSWORD
========================================= */

async function forgotPassword() {

    const email =
        document.getElementById("email").value.trim();


    if (!email) {

        showMessage(
            "Enter your email first.",
            "error"
        );

        return;
    }


    const { error } =
        await supabaseClient.auth.resetPasswordForEmail(
            email
        );


    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }


    showMessage(
        "Password reset email sent.",
        "success"
    );
}


/* =========================================
   ATHLETE HOME
========================================= */

function goHome() {

    window.location.href =
        "athlete.html";

}


/* =========================================
   PROFILE
========================================= */

function openProfile() {

    window.location.href =
        "profile.html";

}


/* =========================================
   GOALS
========================================= */

function openGoal(goalId) {

    if (goalId === "current") {

        window.location.href =
            "goal.html";

        return;
    }


    if (goalId === "past-1") {

        window.location.href =
            "goal.html?goal=5k";

        return;
    }


    if (goalId === "past-2") {

        window.location.href =
            "goal.html?goal=10k";

        return;
    }

}


/* =========================================
   MESSAGES
========================================= */

function openMessages() {

    window.location.href =
        "messages.html";

}


/* =========================================
   AUTO LOGIN CHECK
========================================= */

async function checkExistingSession() {

    const { data } =
        await supabaseClient.auth.getSession();


    if (!data.session) {
        return;
    }


    const user =
        data.session.user;


    /*
       We don't automatically redirect here yet.
       This keeps the login page usable while
       we're testing.
    */
}


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    checkExistingSession
);
