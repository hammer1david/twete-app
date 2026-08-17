/* =========================================
   TWETE AUTH GUARD
========================================= */

const AUTH_SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const AUTH_SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";

const authSupabase =
    window.supabase.createClient(
        AUTH_SUPABASE_URL,
        AUTH_SUPABASE_KEY
    );


/* =========================================
   PROTECT PAGE
========================================= */

async function protectPage(requiredRole = null) {

    try {

        const {
            data: {
                session
            },
            error
        } =
            await authSupabase.auth.getSession();


        if (error) {

            console.error(
                "Session error:",
                error
            );

            window.location.href =
                "index.html";

            return;
        }


        /* =========================
           NOT LOGGED IN
        ========================= */

        if (!session || !session.user) {

            window.location.href =
                "index.html";

            return;
        }


        /* =========================
           GET USER ROLE
        ========================= */

        const {
            data: profile,
            error: profileError
        } =
            await authSupabase
                .from("profiles")
                .select("role")
                .eq("id", session.user.id)
                .maybeSingle();


        if (profileError) {

            console.error(
                "Profile error:",
                profileError
            );

            window.location.href =
                "index.html";

            return;
        }


        const role =
            profile?.role || "athlete";


        /* =========================
           WRONG ROLE
        ========================= */

        if (
            requiredRole &&
            role !== requiredRole
        ) {

            if (role === "coach") {

                window.location.href =
                    "coach.html";

            } else {

                window.location.href =
                    "athlete.html";
            }

            return;
        }


        /* =========================
           AUTHORIZED
        ========================= */

        console.log(
            "Twete auth verified:",
            role
        );

    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );

        window.location.href =
            "index.html";
    }
}
