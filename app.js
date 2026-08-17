/* =========================================
   TWETE APP
   Authentication
========================================= */


/* =========================================
   SUPABASE
========================================= */

const SUPABASE_URL = "https://cvwawazfelidkloqmbma.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================
   WEBSITE URL
========================================= */

const TWETE_URL =
    window.location.origin +
    window.location.pathname.substring(
        0,
        window.location.pathname.lastIndexOf("/") + 1
    );


/* =========================================
   ELEMENTS
========================================= */

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const createAccountButton =
    document.getElementById("createAccountButton");

const forgotPasswordButton =
    document.getElementById("forgotPassword");


/* =========================================
   MESSAGE
========================================= */

function showMessage(message, type = "error") {

    let messageBox =
        document.getElementById("authMessage");

    if (!messageBox) {

        messageBox =
            document.createElement("div");

        messageBox.id =
            "authMessage";

        messageBox.style.marginTop =
            "15px";

        messageBox.style.textAlign =
            "center";

        messageBox.style.fontSize =
            "14px";

        const card =
            document.querySelector(".login-card");

        if (card) {
            card.appendChild(messageBox);
        }
    }

    messageBox.textContent =
        message;

    if (type === "success") {

        messageBox.style.color =
            "#C6FF00";

    } else {

        messageBox.style.color =
            "#ff6b6b";
    }
}


/* =========================================
   VALIDATION
========================================= */

function getCredentials() {

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    if (!email) {

        showMessage(
            "Please enter your email address."
        );

        return null;
    }

    if (!password) {

        showMessage(
            "Please enter your password."
        );

        return null;
    }

    return {
        email,
        password
    };
}


/* =========================================
   LOGIN
========================================= */

async function loginUser() {

    const credentials =
        getCredentials();

    if (!credentials) {
        return;
    }

    loginButton.disabled = true;

    loginButton.textContent =
        "Logging in...";

    showMessage("");

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.signInWithPassword({

                email:
                    credentials.email,

                password:
                    credentials.password

            });


        if (error) {

            console.error(
                "Login error:",
                error
            );

            showMessage(
                "Incorrect email or password."
            );

            return;
        }


        if (!data || !data.user) {

            showMessage(
                "Login failed. Please try again."
            );

            return;
        }


        showMessage(
            "Login successful!",
            "success"
        );


        await redirectUser(
            data.user
        );

    }

    catch (error) {

        console.error(
            "Unexpected login error:",
            error
        );

        showMessage(
            "Something went wrong. Please try again."
        );

    }

    finally {

        loginButton.disabled = false;

        loginButton.textContent =
            "Log In";
    }
}


/* =========================================
   CREATE ACCOUNT
========================================= */

async function createAccount() {

    const credentials =
        getCredentials();

    if (!credentials) {
        return;
    }


    if (credentials.password.length < 6) {

        showMessage(
            "Password must be at least 6 characters."
        );

        return;
    }


    createAccountButton.disabled =
        true;

    createAccountButton.textContent =
        "Creating account...";

    showMessage("");


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.signUp({

                email:
                    credentials.email,

                password:
                    credentials.password,

                options: {

                    emailRedirectTo:
                        TWETE_URL

                }

            });


        if (error) {

            console.error(
                "Signup error:",
                error
            );

            showMessage(
                error.message ||
                "Unable to create account."
            );

            return;
        }


        /*
           Supabase may intentionally return
           a successful-looking response for an
           already registered email.

           Therefore we do NOT try to detect
           existing accounts from the client.
        */


        if (
            data &&
            data.user &&
            data.user.identities &&
            data.user.identities.length === 0
        ) {

            showMessage(
                "This email may already be registered. Try logging in instead."
            );

            return;
        }


        /*
           If email confirmation is enabled,
           session will normally be null.
        */

        if (
            data &&
            data.user &&
            !data.session
        ) {

            showMessage(
                "Account created! Please check your email to confirm your account.",
                "success"
            );

            return;
        }


        /*
           If email confirmation is disabled,
           the user may already have a session.
        */

        if (
            data &&
            data.user
        ) {

            showMessage(
                "Account created successfully!",
                "success"
            );

            await redirectUser(
                data.user
            );

            return;
        }


        showMessage(
            "Account created. Please check your email."
            ,
            "success"
        );

    }

    catch (error) {

        console.error(
            "Unexpected signup error:",
            error
        );

        showMessage(
            "Something went wrong. Please try again."
        );

    }

    finally {

        createAccountButton.disabled =
            false;

        createAccountButton.textContent =
            "Create New Account";
    }
}


/* =========================================
   REDIRECT USER
========================================= */

async function redirectUser(user) {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();


        if (error) {

            console.error(
                "Profile lookup error:",
                error
            );

            /*
               Don't block authentication if
               the profile doesn't exist yet.
            */

            window.location.href =
                "athlete.html";

            return;
        }


        if (
            data &&
            data.role === "coach"
        ) {

            window.location.href =
                "coach.html";

            return;
        }


        /*
           Default role:
           athlete
        */

        window.location.href =
            "athlete.html";

    }

    catch (error) {

        console.error(
            "Redirect error:",
            error
        );

        window.location.href =
            "athlete.html";
    }
}


/* =========================================
   FORGOT PASSWORD
========================================= */

async function forgotPassword() {

    const email =
        emailInput.value.trim();

    if (!email) {

        showMessage(
            "Enter your email address first."
        );

        emailInput.focus();

        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient.auth
                .resetPasswordForEmail(
                    email,
                    {
                        redirectTo:
                            TWETE_URL
                    }
                );


        if (error) {

            console.error(
                "Password reset error:",
                error
            );

            showMessage(
                "Unable to send password reset email."
            );

            return;
        }


        showMessage(
            "If an account exists for this email, a password reset email has been sent.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "Unexpected reset error:",
            error
        );

        showMessage(
            "Something went wrong. Please try again."
        );
    }
}


/* =========================================
   SHOW / HIDE PASSWORD
========================================= */

function togglePassword() {

    if (!passwordInput) {
        return;
    }


    if (
        passwordInput.type ===
        "password"
    ) {

        passwordInput.type =
            "text";

    } else {

        passwordInput.type =
            "password";
    }
}


/* =========================================
   BUTTON EVENTS
========================================= */

if (loginButton) {

    loginButton.addEventListener(
        "click",
        loginUser
    );
}


if (createAccountButton) {

    createAccountButton.addEventListener(
        "click",
        createAccount
    );
}


if (forgotPasswordButton) {

    forgotPasswordButton.addEventListener(
        "click",
        forgotPassword
    );
}


/* =========================================
   ENTER KEY
========================================= */

if (passwordInput) {

    passwordInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key ===
                "Enter"
            ) {

                loginUser();
            }

        }
    );
}


/* =========================================
   PASSWORD TOGGLE
========================================= */

const passwordToggle =
    document.querySelector(
        ".password-toggle"
    );

if (passwordToggle) {

    passwordToggle.addEventListener(
        "click",
        togglePassword
    );
}


/* =========================================
   SESSION CHECK
========================================= */

async function checkExistingSession() {

    try {

        const {
            data
        } =
            await supabaseClient.auth
                .getSession();


        if (
            data &&
            data.session &&
            data.session.user
        ) {

            /*
               Uncomment this later if you
               want already logged-in users
               to automatically skip the login page.

               await redirectUser(
                   data.session.user
               );
            */
        }

    }

    catch (error) {

        console.error(
            "Session check error:",
            error
        );
    }
}


/* =========================================
   START
========================================= */

checkExistingSession();
