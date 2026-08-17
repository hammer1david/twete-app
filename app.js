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
   TWETE WEBSITE URL
========================================= */

const TWETE_URL =
    "https://hammer1david.github.io/twete-app/";


/* =========================================
   SHOW MESSAGE
========================================= */

function showMessage(message, type = "normal") {

    const element =
        document.getElementById("authMessage");

    if (!element) return;

    element.textContent = message;

    if (type === "error") {

        element.style.color = "#ff5555";

    } else if (type === "success") {

        element.style.color = "#C6FF00";

    } else {

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
            "Incorrect email or password.",
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
   REDIRECT USER ACCORDING TO ROLE
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
   CREATE ACCOUNT
========================================= */

async function createAccount() {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;


    if (!email) {

        showMessage(
            "Please enter your email address.",
            "error"
        );

        return;
    }


    if (!password) {

        showMessage(
            "Please enter a password.",
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


    const button =
        document.getElementById("createAccountButton");

    button.disabled = true;

    button.textContent = "Creating account...";


    /*
       Check whether the email already has
       an active session/account.

       Supabase intentionally doesn't expose
       arbitrary user existence checks from
       browser JavaScript for security reasons.
    */

    const { data, error } =
        await supabaseClient.auth.signUp({

            email: email,

            password: password,

            options: {

                emailRedirectTo:
                    TWETE_URL

            }

        });


    if (error) {

        console.error(error);


        const message =
            error.message.toLowerCase();


        if (
            message.includes("already registered") ||
            message.includes("already exists") ||
            message.includes("user already")
        ) {

            showMessage(
                "This email is already registered.",
                "error"
            );

        } else {

            showMessage(
                error.message,
                "error"
            );
        }


        button.disabled = false;

        button.textContent = "Create a new account";

        return;
    }


    /*
       Supabase may return a user without a
       session when email confirmation is required.
    */

    if (data.user) {

        if (!data.session) {

            showMessage(
                "Account created. Please check your email to confirm your account.",
                "success"
            );

        } else {

            showMessage(
                "Account created successfully!",
                "success"
            );

            await redirectUser(data.user);
        }
    }


    button.disabled = false;

    button.textContent = "Create a new account";
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
            "Please enter your email address first.",
            "error"
        );

        return;
    }


    const { error } =
        await supabaseClient.auth.resetPasswordForEmail(
            email,
            {
                redirectTo: TWETE_URL
            }
        );


    if (error) {

        console.error(error);

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
   LOGOUT
========================================= */

async function logout() {

    await supabaseClient.auth.signOut();

    window.location.href = "index.html";
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
   CHECK EXISTING SESSION
========================================= */

async function checkExistingSession() {

    const { data } =
        await supabaseClient.auth.getSession();


    if (!data.session) {
        return;
    }


    /*
       We intentionally don't automatically
       redirect from the login page here.

       The user can still see the login screen
       while testing.
    */
}


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    checkExistingSession
);
