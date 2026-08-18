/* Twete Web Push Service Worker */

self.addEventListener("push", function (event) {
    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch (error) {
        data = {
            title: "Twete",
            body: event.data
                ? event.data.text()
                : "You have a new message."
        };
    }

    const title = data.title || "Twete";

    const options = {
        body: data.body || "You have a new message.",
        icon: data.icon || "/favicon.png",
        badge: data.badge || "/favicon.png",

        data: {
            url: data.url || "/messages.html"
        },

        tag: data.tag || "twete-message",

        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(
            title,
            options
        )
    );
});


self.addEventListener(
    "notificationclick",
    function (event) {

        event.notification.close();

        const targetUrl =
            event.notification.data &&
            event.notification.data.url
                ? event.notification.data.url
                : "/messages.html";


        event.waitUntil(

            clients.matchAll({
                type: "window",
                includeUncontrolled: true
            })

            .then(function (clientList) {

                for (const client of clientList) {

                    if ("focus" in client) {

                        client.navigate(targetUrl);

                        return client.focus();

                    }

                }


                if (clients.openWindow) {

                    return clients.openWindow(
                        targetUrl
                    );

                }

            })

        );

    }
);
