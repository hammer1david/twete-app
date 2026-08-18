/* =========================================
   TWETE MESSAGES
========================================= */


/* =========================================
   SUPABASE
========================================= */

const MESSAGES_SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const MESSAGES_SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";

const messagesSupabase =
    window.supabase.createClient(
        MESSAGES_SUPABASE_URL,
        MESSAGES_SUPABASE_KEY
    );


/* =========================================
   STATE
========================================= */

let currentUser = null;

let currentRole = null;

let conversationUserId = null;

let realtimeChannel = null;


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialiseMessages
);


/* =========================================
   INITIALISE
========================================= */

async function initialiseMessages() {

    try {

        const {
            data: {
                session
            },
            error
        } =
            await messagesSupabase.auth.getSession();


        if (error) {

            console.error(
                "Session error:",
                error
            );

            showError(
                "Could not check your login session."
            );

            return;
        }


        if (
            !session ||
            !session.user
        ) {

            showError(
                "Your login session could not be found."
            );

            return;
        }


        currentUser =
            session.user;


        /*
            Load our profile
        */

        await loadCurrentProfile();


        /*
            Find the person
            we are chatting with
        */

        await loadConversationUser();


        /*
            Setup composer
        */

        setupComposer();


        /*
            Load messages
        */

        await loadMessages();


        /*
            Start realtime
        */

        subscribeToMessages();


        /*
            Initial scroll
        */

        scrollToBottom();


    } catch (error) {

        console.error(
            "Messages initialisation error:",
            error
        );

        showError(
            "Could not load Messages."
        );

    }

}


/* =========================================
   LOAD CURRENT PROFILE
========================================= */

async function loadCurrentProfile() {

    const {
        data,
        error
    } =
        await messagesSupabase
            .from("profiles")
            .select(`
                id,
                full_name,
                role,
                avatar_url
            `)
            .eq(
                "id",
                currentUser.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Profile error:",
            error
        );

        return;
    }


    if (!data) {
        return;
    }


    currentRole =
        data.role;


    /*
        We can also use the current
        user's profile information later
        if needed.
    */

}


/* =========================================
   FIND CONVERSATION USER
========================================= */

async function loadConversationUser() {

    /*
        ATHLETE → COACH
    */

    if (
        currentRole ===
        "athlete"
    ) {

        await loadCoachForAthlete();

        return;
    }


    /*
        COACH → ATHLETE
    */

    if (
        currentRole ===
        "coach"
    ) {

        await loadAthleteForCoach();

        return;
    }


    /*
        Fallback
    */

    await loadCoachForAthlete();

}


/* =========================================
   ATHLETE → COACH
========================================= */

async function loadCoachForAthlete() {

    const {
        data,
        error
    } =
        await messagesSupabase
            .from("coach_athletes")
            .select(`
                coach_id,
                athlete_id,
                created_at
            `)
            .eq(
                "athlete_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(1)
            .maybeSingle();


    if (error) {

        console.error(
            "Coach relationship error:",
            error
        );

        showNoConversation();

        return;
    }


    if (!data) {

        showNoConversation();

        return;
    }


    conversationUserId =
        data.coach_id;


    await loadProfileHeader(
        conversationUserId
    );

}


/* =========================================
   COACH → ATHLETE
========================================= */

async function loadAthleteForCoach() {

    const requestedAthleteId =
        new URLSearchParams(
            window.location.search
        ).get("athlete_id");


    let query =
        messagesSupabase
            .from("coach_athletes")
            .select(`
                coach_id,
                athlete_id,
                created_at
            `)
            .eq(
                "coach_id",
                currentUser.id
            );


    /*
        Open requested athlete
    */

    if (requestedAthleteId) {

        query =
            query.eq(
                "athlete_id",
                requestedAthleteId
            );

    } else {

        /*
            Otherwise use latest connection
        */

        query =
            query
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .limit(1);

    }


    const {
        data,
        error
    } =
        await query.maybeSingle();


    if (error) {

        console.error(
            "Athlete relationship error:",
            error
        );

        showNoConversation();

        return;
    }


    if (!data) {

        showNoConversation();

        return;
    }


    conversationUserId =
        data.athlete_id;


    await loadProfileHeader(
        conversationUserId
    );

}


/* =========================================
   LOAD OTHER PROFILE
========================================= */

async function loadProfileHeader(
    userId
) {

    const {
        data,
        error
    } =
        await messagesSupabase
            .from("profiles")
            .select(`
                id,
                full_name,
                role,
                avatar_url
            `)
            .eq(
                "id",
                userId
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Other profile error:",
            error
        );

        setProfileHeader(
            currentRole === "coach"
                ? "Athlete"
                : "Coach",
            null
        );

        return;
    }


    if (!data) {

        setProfileHeader(
            currentRole === "coach"
                ? "Athlete"
                : "Coach",
            null
        );

        return;
    }


    setProfileHeader(
        data.full_name ||
        (
            currentRole === "coach"
                ? "Athlete"
                : "Coach"
        ),
        data.avatar_url
    );

}


/* =========================================
   SET HEADER
========================================= */

function setProfileHeader(
    name,
    avatarUrl
) {

    const nameElement =
        document.querySelector(
            ".header-info h1"
        );


    const avatarElement =
        document.querySelector(
            ".header-avatar"
        );


    /*
        Name
    */

    if (nameElement) {

        nameElement.textContent =
            name || "Twete";

    }


    /*
        Avatar
    */

    if (!avatarElement) {
        return;
    }


    if (avatarUrl) {

        avatarElement.innerHTML = "";

        const image =
            document.createElement(
                "img"
            );

        image.src =
            avatarUrl;

        image.alt = "";

        image.referrerPolicy =
            "no-referrer";

        image.style.width =
            "100%";

        image.style.height =
            "100%";

        image.style.objectFit =
            "cover";

        avatarElement.appendChild(
            image
        );

    } else {

        avatarElement.textContent =
            (
                name ||
                "T"
            )
            .charAt(0)
            .toUpperCase();

    }

}


/* =========================================
   LOAD MESSAGES
========================================= */

async function loadMessages() {

    const list =
        document.getElementById(
            "messagesWindow"
        );


    if (!list) {
        return;
    }


    if (!conversationUserId) {

        showNoConversation();

        return;
    }


    const {
        data,
        error
    } =
        await messagesSupabase
            .from("messages")
            .select(`
                id,
                sender_id,
                receiver_id,
                message,
                created_at,
                read_at
            `)
            .or(
                `and(sender_id.eq.${currentUser.id},receiver_id.eq.${conversationUserId}),and(sender_id.eq.${conversationUserId},receiver_id.eq.${currentUser.id})`
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Message loading error:",
            error
        );

        showError(
            "Could not load your messages."
        );

        return;
    }


    renderMessages(
        data || []
    );


    await markMessagesRead(
        data || []
    );

}


/* =========================================
   RENDER MESSAGES
========================================= */

function renderMessages(
    messages
) {

    const list =
        document.getElementById(
            "messagesWindow"
        );


    if (!list) {
        return;
    }


    /*
        Remove old messages
    */

    list.innerHTML = "";


    /*
        Empty conversation
    */

    if (!messages.length) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "no-messages";

        empty.textContent =
            "No messages yet.";

        list.appendChild(
            empty
        );

        return;
    }


    /*
        Render messages
        in chronological order
    */

    messages.forEach(
        function (message) {

            const sent =
                String(
                    message.sender_id
                ) ===
                String(
                    currentUser.id
                );


            /*
                Row
            */

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                sent
                    ? "message-row sent"
                    : "message-row received";


            /*
                Bubble
            */

            const bubble =
                document.createElement(
                    "div"
                );

            bubble.className =
                "message-bubble";


            /*
                Text
            */

            const text =
                document.createElement(
                    "div"
                );

            text.className =
                "message-text";


            /*
                textContent is intentional.
                It prevents HTML injection.
            */

            text.textContent =
                message.message || "";


            /*
                Time
            */

            const meta =
                document.createElement(
                    "div"
                );

            meta.className =
                sent
                    ? "message-meta"
                    : "message-time";


            const time =
                document.createElement(
                    "span"
                );

            time.textContent =
                formatTime(
                    message.created_at
                );


            meta.appendChild(
                time
            );


            /*
                Read checks
                only on sent messages
            */

            if (sent) {

                const checks =
                    document.createElement(
                        "span"
                    );

                checks.className =
                    "message-checks";

                checks.textContent =
                    "✓✓";

                meta.appendChild(
                    checks
                );

            }


            /*
                Assemble
            */

            bubble.appendChild(
                text
            );

            bubble.appendChild(
                meta
            );

            row.appendChild(
                bubble
            );

            list.appendChild(
                row
            );

        }
    );


    /*
        IMPORTANT:
        Wait until browser has calculated
        the actual height before scrolling.
    */

    scrollToBottom();

}


/* =========================================
   SCROLL TO LATEST MESSAGE
========================================= */

function scrollToBottom() {

    const list =
        document.getElementById(
            "messagesWindow"
        );


    if (!list) {
        return;
    }


    /*
        First frame:
        browser calculates layout.
    */

    requestAnimationFrame(
        function () {

            /*
                Second frame:
                dimensions are now reliable.
            */

            requestAnimationFrame(
                function () {

                    list.scrollTop =
                        list.scrollHeight;

                }
            );

        }
    );

}


/* =========================================
   SEND MESSAGE
========================================= */

async function sendMessage() {

    const input =
        document.getElementById(
            "messageInput"
        );


    const button =
        document.querySelector(
            ".send-button"
        );


    if (!input) {
        return;
    }


    const text =
        input.value.trim();


    if (!text) {
        return;
    }


    if (!conversationUserId) {

        showError(
            "No conversation is available yet."
        );

        return;
    }


    if (button) {

        button.disabled =
            true;

    }


    try {

        const {
            error
        } =
            await messagesSupabase
                .from("messages")
                .insert({

                    sender_id:
                        currentUser.id,

                    receiver_id:
                        conversationUserId,

                    message:
                        text

                });


        if (error) {

            console.error(
                "Send message error:",
                error
            );

            showError(
                "Could not send message."
            );

            return;
        }


        /*
            Clear input
        */

        input.value = "";


        resizeComposer();


        /*
            Reload messages.

            This also scrolls to the
            newest message.
        */

        await loadMessages();


    } finally {

        if (button) {

            button.disabled =
                false;

        }

    }

}


/* =========================================
   REALTIME
========================================= */

function subscribeToMessages() {

    if (
        !currentUser ||
        !conversationUserId
    ) {

        return;
    }


    /*
        Remove old channel
    */

    if (realtimeChannel) {

        messagesSupabase
            .removeChannel(
                realtimeChannel
            );

    }


    realtimeChannel =
        messagesSupabase
            .channel(
                "twete-messages-" +
                currentUser.id
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages"
                },
                async function (
                    payload
                ) {

                    const message =
                        payload.new;


                    const belongs =
                        (
                            String(
                                message.sender_id
                            ) ===
                            String(
                                currentUser.id
                            ) &&
                            String(
                                message.receiver_id
                            ) ===
                            String(
                                conversationUserId
                            )
                        )
                        ||
                        (
                            String(
                                message.sender_id
                            ) ===
                            String(
                                conversationUserId
                            ) &&
                            String(
                                message.receiver_id
                            ) ===
                            String(
                                currentUser.id
                            )
                        );


                    if (!belongs) {
                        return;
                    }


                    /*
                        If another person sends
                        a message, reload it.

                        Our own send already reloads
                        immediately.
                    */

                    if (
                        String(
                            message.sender_id
                        ) !==
                        String(
                            currentUser.id
                        )
                    ) {

                        await loadMessages();

                    }

                }
            )
            .subscribe();

}


/* =========================================
   MARK MESSAGES READ
========================================= */

async function markMessagesRead(
    messages
) {

    if (!currentUser) {
        return;
    }


    const unreadIds =
        messages
            .filter(
                function (message) {

                    return (
                        String(
                            message.receiver_id
                        ) ===
                        String(
                            currentUser.id
                        ) &&
                        !message.read_at
                    );

                }
            )
            .map(
                function (message) {

                    return message.id;

                }
            );


    if (!unreadIds.length) {
        return;
    }


    const {
        error
    } =
        await messagesSupabase
            .from("messages")
            .update({

                read_at:
                    new Date().toISOString()

            })
            .in(
                "id",
                unreadIds
            );


    if (error) {

        console.error(
            "Mark read error:",
            error
        );

    }

}


/* =========================================
   COMPOSER
========================================= */

function setupComposer() {

    const input =
        document.getElementById(
            "messageInput"
        );


    const sendButton =
        document.querySelector(
            ".send-button"
        );


    const backButton =
        document.querySelector(
            ".back-button"
        );


    if (input) {

        input.addEventListener(
            "input",
            resizeComposer
        );


        input.addEventListener(
    "keydown",
    function (event) {

        /*
            Enter = new line

            The Send button is used
            to send the message.
        */

        if (event.key === "Enter") {

            return;

        }

    }
);

    }


    if (sendButton) {

        sendButton.addEventListener(
            "click",
            sendMessage
        );

    }


    if (backButton) {

        backButton.addEventListener(
            "click",
            goBack
        );

    }


    /*
        Attachment button is not connected
        yet. We will add it later.
    */

}


/* =========================================
   RESIZE COMPOSER
========================================= */

function resizeComposer() {

    const input =
        document.getElementById(
            "messageInput"
        );


    if (!input) {
        return;
    }


    input.style.height =
        "auto";


    input.style.height =
        Math.min(
            input.scrollHeight,
            130
        ) +
        "px";

}


/* =========================================
   NAVIGATION
========================================= */

function goBack() {

    window.location.href =
        "athlete.html";

}


/* =========================================
   EMPTY STATE
========================================= */

function showNoConversation() {

    const list =
        document.getElementById(
            "messagesWindow"
        );


    if (!list) {
        return;
    }


    list.innerHTML = "";


    const empty =
        document.createElement(
            "div"
        );

    empty.className =
        "no-messages";

    empty.textContent =
        "No conversation found yet.";


    list.appendChild(
        empty
    );

}


/* =========================================
   ERROR
========================================= */

function showError(
    message
) {

    const list =
        document.getElementById(
            "messagesWindow"
        );


    if (!list) {
        return;
    }


    list.innerHTML = "";


    const errorElement =
        document.createElement(
            "div"
        );

    errorElement.className =
        "no-messages";

    errorElement.textContent =
        message;


    list.appendChild(
        errorElement
    );

}


/* =========================================
   FORMAT TIME
========================================= */

function formatTime(
    value
) {

    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}
