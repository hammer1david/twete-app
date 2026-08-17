/* =========================================
   TWETE AUTH GUARD
========================================= */

const AUTH_SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const AUTH_SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";


/* =========================================
   GET SUPABASE CLIENT
========================================= */

function getAuthClient() {

    /*
       Use the existing Supabase client
       if app.js already created it.
    */

    if (
        typeof supabaseClient !== "undefined" &&
        supabaseClient
    ) {
        return supabaseClient;
    }


    /*
       Otherwise create one.
    */

    if (
        window.supabase &&
        window.supabase.createClient
    ) {

        return window.supabase.createClient(
            AUTH_SUPABASE_URL,
            AUTH_SUPABASE_KEY
        );
    }


    return null;
}


/* =========================================
   PROTECT PAGE
========================================= */

async function protectPage(requiredRole = null) {

    console.log(
        "Twete Auth Guard starting..."
    );


    try {

        const client =
            getAuthClient();


        /* =========================
           SUPABASE NOT AVAILABLE
        ========================= */

        if (!client) {

            console.error(
                "Supabase library is not loaded."
            );

            /*
               Do NOT redirect to login here.
               This prevents a false logout.
            */

            return;
        }


        /* =========================
           GET SESSION
        ========================= */

        const {
            data,
            error
        } =
            await client.auth.getSession();


        if (error) {

            console.error(
                "Session error:",
                error
            );

            return;
        }


        const session =
            data?.session;


        /* =========================
           NOT LOGGED IN
        ========================= */

        if (
            !session ||
            !session.user
        ) {

            console.log(
                "No active session."
            );

            window.location.href =
                "index.html";

            return;
        }


        console.log(
            "Authenticated user:",
            session.user.email
        );


        /* =========================
           NO ROLE REQUIRED
        ========================= */

        if (!requiredRole) {

            console.log(
                "Authentication verified."
            );

            return;
        }


        /* =========================
           GET PROFILE ROLE
        ========================= */

        const {
            data: profile,
            error: profileError
        } =
            await client
                .from("profiles")
                .select("role")
                .eq(
                    "id",
                    session.user.id
                )
                .maybeSingle();


        if (profileError) {

            console.error(
                "Could not read profile:",
                profileError
            );

            /*
               IMPORTANT:
               The user IS authenticated.

               Do not send them to login just
               because the profile query failed.
            */

            return;
        }


        const role =
            profile?.role;


        console.log(
            "Twete user role:",
            role
        );


        /* =========================
           PROFILE NOT FOUND
        ========================= */

        if (!role) {

            console.warn(
                "No profile role found."
            );

            /*
               Don't pretend the user is logged out.
            */

            return;
        }


        /* =========================
           WRONG ROLE
        ========================= */

        if (
            role !== requiredRole
        ) {

            console.log(
                "Wrong page for user role:",
                role
            );


            if (
                role === "coach"
            ) {

                window.location.replace(
                    "coach.html"
                );

            } else {

                window.location.replace(
                    "athlete.html"
                );
            }

            return;
        }


        /* =========================
           AUTHORIZED
        ========================= */

        console.log(
            "Twete access granted:",
            role
        );

    } catch (error) {

        console.error(
            "Auth guard error:",
            error
        );

        /*
           Do not automatically redirect
           on unexpected JavaScript errors.

           Only an actual missing session
           should redirect to login.
        */
    }
}
