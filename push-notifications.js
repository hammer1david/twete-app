/* =========================================
   TWETE WEB PUSH NOTIFICATIONS
========================================= */

const VAPID_PUBLIC_KEY =
    "BKDcr7e89FuoYxYf3VAti4YTSYrkeFenZAE10g3r6BMjuwYBDN2PIF8b7QigIv969G1xM48FQXKBhHlVOqzYr5s";

/* =========================================
   CONVERT VAPID KEY
========================================= */

function urlBase64ToUint8Array(base64String) {

    const padding =
        "=".repeat(
            (4 - base64String.length % 4) % 4
        );

    const base64 =
        (base64String + padding)
            .replace(/-/g, "+")
            .replace(/_/g, "/");

    const rawData =
        window.atob(base64);

    return Uint8Array.from(
        [...rawData].map(
            char => char.charCodeAt(0)
        )
    );
}


/* =========================================
   REGISTER SERVICE WORKER
========================================= */

async function registerPushServiceWorker() {

    if (!("serviceWorker" in navigator)) {

        console.warn(
            "Service Workers are not supported."
        );

        return null;
    }

    try {

        const registration =
            await navigator.serviceWorker.register(
                "sw.js"
            );

        console.log(
            "Twete service worker registered."
        );

        return registration;

    } catch (error) {

        console.error(
            "Service worker registration failed:",
            error
        );

        return null;
    }
}


/* =========================================
   GET CURRENT USER
========================================= */

async function getPushUser() {

    try {

        const {
            data: {
                user
            },
            error
        } =
            await profileSupabase.auth.getUser();

        if (error) {

            console.error(
                "Could not get user:",
                error
            );

            return null;
        }

        return user;

    } catch (error) {

        console.error(
            "User lookup failed:",
            error
        );

        return null;
    }
}


/* =========================================
   ENABLE PUSH NOTIFICATIONS
========================================= */

async function enablePushNotifications() {

    try {

        if (!("Notification" in window)) {

            console.warn(
                "Browser notifications are not supported."
            );

            return false;
        }


        if (!("PushManager" in window)) {

            console.warn(
                "Push notifications are not supported."
            );

            return false;
        }


        /* =========================
           REQUEST PERMISSION
        ========================= */

        const permission =
            await Notification.requestPermission();

        if (permission !== "granted") {

            console.log(
                "Notification permission not granted."
            );

            return false;
        }


        /* =========================
           SERVICE WORKER
        ========================= */

        const registration =
            await registerPushServiceWorker();

        if (!registration) {

            return false;
        }


        /* =========================
           EXISTING SUBSCRIPTION
        ========================= */

        let subscription =
            await registration.pushManager
                .getSubscription();


        /* =========================
           CREATE SUBSCRIPTION
        ========================= */

        if (!subscription) {

            subscription =
                await registration.pushManager.subscribe({

                    userVisibleOnly: true,

                    applicationServerKey:
                        urlBase64ToUint8Array(
                            VAPID_PUBLIC_KEY
                        )
                });
        }


        console.log(
            "Push subscription created:",
            subscription
        );


        /* =========================
           CURRENT USER
        ========================= */

        const user =
            await getPushUser();

        if (!user) {

            console.warn(
                "No logged-in user found."
            );

            return false;
        }


        /* =========================
           SUBSCRIPTION DATA
        ========================= */

        const subscriptionJSON =
            subscription.toJSON();


        const endpoint =
            subscription.endpoint;


        const p256dh =
            subscriptionJSON.keys?.p256dh;


        const auth =
            subscriptionJSON.keys?.auth;


        if (
            !endpoint ||
            !p256dh ||
            !auth
        ) {

            console.error(
                "Push subscription data is incomplete."
            );

            return false;
        }


        /* =========================
           SAVE TO SUPABASE
        ========================= */

        const {
            error
        } =
            await profileSupabase
                .from("push_subscriptions")
                .upsert(
                    {
                        user_id: user.id,
                        endpoint: endpoint,
                        p256dh: p256dh,
                        auth: auth
                    },
                    {
                        onConflict: "endpoint"
                    }
                );


        if (error) {

            console.error(
                "Could not save push subscription:",
                error
            );

            return false;
        }


        console.log(
            "Twete push subscription saved."
        );

        return true;


    } catch (error) {

        console.error(
            "Push notification setup failed:",
            error
        );

        return false;
    }
}


/* =========================================
   DISABLE PUSH NOTIFICATIONS
========================================= */

async function disablePushNotifications() {

    try {

        const registration =
            await navigator.serviceWorker
                .getRegistration();

        if (!registration) {
            return;
        }


        const subscription =
            await registration.pushManager
                .getSubscription();

        if (!subscription) {
            return;
        }


        const endpoint =
            subscription.endpoint;


        await subscription.unsubscribe();


        await profileSupabase
            .from("push_subscriptions")
            .delete()
            .eq(
                "endpoint",
                endpoint
            );


        console.log(
            "Twete push notifications disabled."
        );


    } catch (error) {

        console.error(
            "Could not disable push notifications:",
            error
        );
    }
}


/* =========================================
   CHECK PUSH STATUS
========================================= */

async function isPushEnabled() {

    try {

        if (
            !("serviceWorker" in navigator) ||
            !("PushManager" in window)
        ) {

            return false;
        }


        const registration =
            await navigator.serviceWorker
                .getRegistration(
                    "sw.js"
                );


        if (!registration) {

            return false;
        }


        const subscription =
            await registration.pushManager
                .getSubscription();


        return !!subscription;


    } catch (error) {

        console.error(
            "Could not check push status:",
            error
        );

        return false;
    }
}




/* =========================================
   START
========================================= */

console.log(
    "Twete push notifications loaded."
);



/* =========================================
   SEND TEST PUSH
========================================= */

async function sendTestPushNotification() {

    try {

        const result =
            await profileSupabase.functions.invoke(
                "send-push",
                {
                    body: {
                        title: "Twete",
                        body: "This is a test push notification.",
                        url: "/messages.html"
                    }
                }
            );

        console.log(
            "FULL PUSH RESULT:",
            result
        );

        const data = result?.data;
        const error = result?.error;

        if (error) {

            return {
                success: false,
                message:
                    "ERROR: " +
                    (
                        error.message ||
                        JSON.stringify(error)
                    )
            };
        }

        if (!data) {

            return {
                success: false,
                message:
                    "ERROR: No data returned"
            };
        }

        if (data.sent > 0) {

            return {
                success: true,
                message:
                    "PUSH SENT: " +
                    data.sent
            };
        }

        return {
            success: false,
            message:
                "PUSH NOT SENT: " +
                JSON.stringify(data)
        };

    } catch (error) {

        console.error(
            "PUSH EXCEPTION:",
            error
        );

        return {
            success: false,
            message:
                "EXCEPTION: " +
                (
                    error?.message ||
                    String(error)
                )
        };
    }
}
