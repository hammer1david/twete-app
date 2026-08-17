/* =========================================
   TWETE APP
   LOGIN & ACCOUNT
========================================= */


/* =========================================
   SUPABASE
========================================= */

const SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
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

const messageBox =
    document.getElementById("authMessage");


/* =========================================
   MESSAGE
========================================= */

function showMessage(message, type = "error") {

    if (!messageBox) {
        return;
    }

    messageBox.textContent = message;

    if (type === "success") {

        messageBox.style.color =
            "#C6FF00";

    } else {

        messageBox.style.color =
            "#ff6b6b";
    }
}


function clearMessage() {

    if (messageBox) {
        messageBox.textContent = "";
    }
}


/* =========================================
   GET CREDENTIALS
========================================= */

function getCredentials() {

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    if (!email) {

        showMessage(
            "Please enter your email."
        );

        emailInput.focus();

        return null;
    }

    if (!password) {

        showMessage(
            "Please enter your password."
        );

        passwordInput.focus();

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

async function login() {

    const credentials =
        getCredentials();

    if (!credentials) {
        return;
    }

    clearMessage();

    if (loginButton) {

        loginButton.disabled = true;

        loginButton.textContent =
            "Logging in...";
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .signInWithPassword({

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


    } catch (error) {

        console.error(
            "Unexpected login error:",
            error
        );

        showMessage(
            "Something went wrong. Please try again."
        );


    } finally {

        if (loginButton) {

            loginButton.disabled =
                false;

            loginButton.textContent =
                "Log in";
        }
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


    clearMessage();


    if (createAccountButton) {

        createAccountButton.disabled =
            true;

        createAccountButton.textContent =
            "Creating account...";
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .signUp({

                    email:
                        credentials.email,

                    password:
                        credentials.password,

                    options: {

                        emailRedirectTo:
                            window.location.origin +
                            window.location.pathname
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


        if (
            data &&
            data.user &&
            data.session
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
            "Account created. Please check your email.",
            "success"
        );


    } catch (error) {

        console.error(
            "Unexpected signup error:",
            error
        );

        showMessage(
            "Something went wrong. Please try again."
        );


    } finally {

        if (createAccountButton) {

            createAccountButton.disabled =
                false;

            createAccountButton.textContent =
                "Create a new account";
        }
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
                .select(`
                    role,
                    full_name,
                    birthday,
                    country,
                    discipline,
                    preferred_distance,
                    experience_level
                `)
                .eq(
                    "id",
                    user.id
                )
                .maybeSingle();


        if (error) {

            console.error(
                "Profile lookup error:",
                error
            );

            window.location.href =
                "athlete.html";

            return;
        }


        /* =========================
           COACH
        ========================= */

        if (
            data &&
            data.role === "coach"
        ) {

            window.location.href =
                "coach.html";

            return;
        }


        /* =========================
           ATHLETE
        ========================= */

        if (
            data &&
            data.role === "athlete"
        ) {

            const profileComplete =
                data.full_name &&
                data.birthday &&
                data.country &&
                data.discipline &&
                data.preferred_distance &&
                data.experience_level;


            if (!profileComplete) {

                window.location.href =
                    "onboarding.html";

                return;
            }


            window.location.href =
                "athlete.html";

            return;
        }


        window.location.href =
            "onboarding.html";


    } catch (error) {

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


    clearMessage();


    showMessage(
        "Sending password reset email...",
        "success"
    );


    try {

        /*
           IMPORTANT:
           The reset email will send the user
           to reset-password.html.
        */

        const resetUrl =
            new URL(
                "reset-password.html",
                window.location.href
            ).href;


        const {
            error
        } =
            await supabaseClient.auth
                .resetPasswordForEmail(

                    email,

                    {
                        redirectTo:
                            resetUrl
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
            "Password reset email sent! Check your inbox.",
            "success"
        );


    } catch (error) {

        console.error(
            "Unexpected password reset error:",
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

                login();
            }
        }
    );
}


/* =========================================
   START
========================================= */

console.log(
    "Twete authentication loaded."
);
