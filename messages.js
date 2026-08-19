/* =========================================
   TWETE CHAT
========================================= */


/* =========================================
   SUPABASE
========================================= */

const SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSN";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================
   STATE
========================================= */

let currentUser = null;

let currentProfile = null;

let chatUser = null;

let realtimeChannel = null;

let sendingMessage = false;


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialiseChat
);


/* =========================================
   INITIALISE
========================================= */

async function initialiseChat() {

    setupInterface();

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "Session error:",
                error
            );

            showChatError(
                "Could not load your session."
            );

            return;
        }


        if (
            !data ||
            !data.session ||
            !data.session.user
        ) {

            console.error(
                "No active session."
            );

            showChatError(
                "Please log in first."
            );

            return;
        }


        currentUser =
            data.session.user;


        await loadCurrentProfile();


        await findChatUser();


        if (!chatUser) {

            showChatError(
                "No conversation found."
            );

            return;
        }


        updateHeader();


        await loadMessages();


        subscribeToMessages();


    } catch (error) {

        console.error(
            "Chat initialisation error:",
            error
        );

        showChatError(
            "Could not open chat."
        );

    }

}


/* =========================================
   INTERFACE
========================================= */

function setupInterface() {

    const sendButton =
        document.getElementById(
            "sendButton"
        );


    const input =
        document.getElementById(
            "messageInput"
        );


    const backButton =
        document.getElementById(
            "backButton"
        );


    if (sendButton) {

        sendButton.addEventListener(
            "click",
            sendMessage
        );

    }


    if (input) {

        input.addEventListener(
            "input",
            autoResizeInput
        );


        input.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    sendMessage();

                }

            }
        );

    }


    if (backButton) {

        backButton.addEventListener(
            "click",
            goBack
        );

    }

}


/* =========================================
   CURRENT PROFILE
========================================= */

async function loadCurrentProfile() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "id, full_name, role, avatar_url"
            )
            .eq(
                "id",
                currentUser.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Current profile error:",
            error
        );

        return;
    }


    currentProfile =
        data || null;

}


/* =========================================
   FIND CHAT USER
========================================= */

async function findChatUser() {

    /*
       Priority 1:
       User ID in the URL.

       Example:
       messages.html?user=USER_ID
    */

    const params =
        new URLSearchParams(
            window.location.search
        );


    const urlUserId =
        params.get("user");


    if (
        urlUserId &&
        urlUserId !== currentUser.id
    ) {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("profiles")
                .select(
                    "id, full_name, role, avatar_url"
                )
                .eq(
                    "id",
                    urlUserId
                )
                .maybeSingle();


        if (
            !error &&
            data
        ) {

            chatUser = data;

            return;

        }

    }


    /*
       Priority 2:
       Previously selected user.
    */

    const storedUserId =
        localStorage.getItem(
            "tweteChatUserId"
        );


    if (
        storedUserId &&
        storedUserId !== currentUser.id
    ) {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("profiles")
                .select(
                    "id, full_name, role, avatar_url"
                )
                .eq(
                    "id",
                    storedUserId
                )
                .maybeSingle();


        if (
            !error &&
            data
        ) {

            chatUser = data;

            return;

        }

    }


    /*
       Priority 3:
       Coach -> first connected athlete.
    */

    if (
        currentProfile &&
        currentProfile.role === "coach"
    ) {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("coach_athletes")
                .select(`
                    athlete_id,
                    created_at,
                    profiles:athlete_id (
                        id,
                        full_name,
                        role,
                        avatar_url
                    )
                `)
                .eq(
                    "coach_id",
                    currentUser.id
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                )
                .limit(1)
                .maybeSingle();


        if (
            !error &&
            data &&
            data.profiles
        ) {

            chatUser =
                data.profiles;

            return;

        }

    }


    /*
       Priority 4:
       Athlete -> connected coach.
    */

    if (
        currentProfile &&
        currentProfile.role === "athlete"
    ) {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("coach_athletes")
                .select(`
                    coach_id,
                    created_at,
                    profiles:coach_id (
                        id,
                        full_name,
                        role,
                        avatar_url
                    )
                `)
                .eq(
                    "athlete_id",
                    currentUser.id
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                )
                .limit(1)
                .maybeSingle();


        if (
            !error &&
            data &&
            data.profiles
        ) {

            chatUser =
                data.profiles;

        }

    }

}


/* =========================================
   HEADER
========================================= */

function updateHeader() {

    if (!chatUser) {
        return;
    }


    const name =
        document.getElementById(
            "profileName"
        );


    const role =
        document.getElementById(
            "profileRole"
        );


    const avatar =
        document.getElementById(
            "profileAvatar"
        );


    if (name) {

        name.textContent =
            chatUser.full_name ||
            (
                chatUser.role === "athlete"
                    ? "Athlete"
                    : "Coach"
            );

    }


    if (role) {

        role.textContent =
            chatUser.role === "athlete"
                ? "Athlete"
                : "Coach";

    }


    if (!avatar) {
        return;
    }


    avatar.innerHTML =
        "";


    if (chatUser.avatar_url) {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            chatUser.avatar_url;


        image.alt =
            "";


        image.referrerPolicy =
            "no-referrer";


        avatar.appendChild(
            image
        );

    } else {

        avatar.textContent =
            (
                chatUser.full_name ||
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
            "messagesList"
        );


    if (
        !list ||
        !currentUser ||
        !chatUser
    ) {

        return;
    }


    const otherUserId =
        chatUser.id;


    const {
        data,
        error
    } =
        await supabaseClient
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
                `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
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

        showChatError(
            "Could not load messages."
        );

        return;
    }


    list.innerHTML =
        "";


    if (
        !data ||
        data.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "messages-loading";


        empty.textContent =
            "No messages yet.";


        list.appendChild(
            empty
        );


        return;
    }


    data.forEach(
        function (message) {

            list.appendChild(
                createMessageElement(
                    message
                )
            );

        }
    );


    scrollToBottom();


    await markMessagesRead(
        data
    );

}


/* =========================================
   CREATE MESSAGE
========================================= */

function createMessageElement(
    message
) {

    const sent =
        String(
            message.sender_id
        ) ===
        String(
            currentUser.id
        );


    const row =
        document.createElement(
            "div"
        );


    row.className =
        sent
            ? "message-row sent"
            : "message-row received";


    row.dataset.messageId =
        message.id;


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    const text =
        document.createElement(
            "div"
        );


    text.className =
        "message-text";


    text.textContent =
        message.message || "";


    bubble.appendChild(
        text
    );


    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "message-meta";


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


    bubble.appendChild(
        meta
    );


    row.appendChild(
        bubble
    );


    return row;

}


/* =========================================
   SEND MESSAGE
========================================= */

async function sendMessage() {

    if (sendingMessage) {
        return;
    }


    const input =
        document.getElementById(
            "messageInput"
        );


    const button =
        document.getElementById(
            "sendButton"
        );


    if (
        !input ||
        !currentUser ||
        !chatUser
    ) {

        return;
    }


    const text =
        input.value.trim();


    if (!text) {
        return;
    }


    sendingMessage =
        true;


    if (button) {

        button.disabled =
            true;

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("messages")
                .insert({

                    sender_id:
                        currentUser.id,

                    receiver_id:
                        chatUser.id,

                    message:
                        text

                })
                .select(`
                    id,
                    sender_id,
                    receiver_id,
                    message,
                    created_at,
                    read_at
                `)
                .single();


        if (error) {

            console.error(
                "Send message error:",
                error
            );

            return;
        }


        input.value =
            "";


        autoResizeInput();


        /*
           Realtime may deliver this message too.
           Add it here immediately and let the
           realtime handler ignore duplicates.
        */

        addMessageIfMissing(
            data
        );


        scrollToBottom();


    } catch (error) {

        console.error(
            "Send message exception:",
            error
        );

    } finally {

        sendingMessage =
            false;


        if (button) {

            button.disabled =
                false;

        }

        input.focus();

    }

}


/* =========================================
   REALTIME
========================================= */

function subscribeToMessages() {

    if (
        !currentUser ||
        !chatUser
    ) {

        return;
    }


    if (realtimeChannel) {

        supabaseClient.removeChannel(
            realtimeChannel
        );

    }


    const userA =
        currentUser.id;


    const userB =
        chatUser.id;


    realtimeChannel =
        supabaseClient
            .channel(
                "twete-chat-" +
                userA +
                "-" +
                userB
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages"
                },
                function (payload) {

                    const message =
                        payload.new;


                    const belongsToChat =
                        (
                            String(
                                message.sender_id
                            ) === String(userA) &&
                            String(
                                message.receiver_id
                            ) === String(userB)
                        )
                        ||
                        (
                            String(
                                message.sender_id
                            ) === String(userB) &&
                            String(
                                message.receiver_id
                            ) === String(userA)
                        );


                    if (
                        !belongsToChat
                    ) {

                        return;

                    }


                    addMessageIfMissing(
                        message
                    );


                    scrollToBottom();


                    if (
                        String(
                            message.receiver_id
                        ) === String(
                            currentUser.id
                        )
                    ) {

                        markSingleMessageRead(
                            message.id
                        );

                    }

                }
            )
            .subscribe(
                function (status) {

                    console.log(
                        "Chat realtime:",
                        status
                    );

                }
            );

}


/* =========================================
   ADD MESSAGE WITHOUT DUPLICATE
========================================= */

function addMessageIfMissing(
    message
) {

    const list =
        document.getElementById(
            "messagesList"
        );


    if (!list || !message) {
        return;
    }


    const existing =
        list.querySelector(
            `[data-message-id="${message.id}"]`
        );


    if (existing) {
        return;
    }


    const empty =
        list.querySelector(
            ".messages-loading"
        );


    if (
        empty &&
        (
            empty.textContent ===
            "No messages yet."
        )
    ) {

        empty.remove();

    }


    list.appendChild(
        createMessageElement(
            message
        )
    );

}


/* =========================================
   MARK READ
========================================= */

async function markMessagesRead(
    messages
) {

    if (
        !messages ||
        !messages.length
    ) {

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
                        )
                        &&
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
        await supabaseClient
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
            "Mark messages read error:",
            error
        );

    }

}


/* =========================================
   MARK SINGLE MESSAGE READ
========================================= */

async function markSingleMessageRead(
    messageId
) {

    const {
        error
    } =
        await supabaseClient
            .from("messages")
            .update({
                read_at:
                    new Date().toISOString()
            })
            .eq(
                "id",
                messageId
            )
            .is(
                "read_at",
                null
            );


    if (error) {

        console.error(
            "Mark message read error:",
            error
        );

    }

}


/* =========================================
   SCROLL
========================================= */

function scrollToBottom() {

    const list =
        document.getElementById(
            "messagesList"
        );


    if (!list) {
        return;
    }


    requestAnimationFrame(
        function () {

            list.scrollTop =
                list.scrollHeight;

        }
    );

}


/* =========================================
   AUTO RESIZE
========================================= */

function autoResizeInput() {

    const input =
        document.getElementById(
            "messageInput"
        );


    if (!input) {
        return;
    }


    input.style.height =
        "auto";


    const maxHeight =
        130;


    input.style.height =
        Math.min(
            input.scrollHeight,
            maxHeight
        ) + "px";

}


/* =========================================
   TIME
========================================= */

function formatTime(
    timestamp
) {

    if (!timestamp) {
        return "";
    }


    const date =
        new Date(
            timestamp
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


/* =========================================
   ERROR
========================================= */

function showChatError(
    message
) {

    const list =
        document.getElementById(
            "messagesList"
        );


    if (!list) {
        return;
    }


    list.innerHTML =
        "";


    const error =
        document.createElement(
            "div"
        );


    error.className =
        "messages-loading";


    error.textContent =
        message;


    list.appendChild(
        error
    );

}


/* =========================================
   BACK
========================================= */

function goBack() {

    if (
        window.history.length > 1
    ) {

        window.history.back();

        return;

    }


    window.location.href =
        "index.html";

}


/* =========================================
   CLEANUP
========================================= */

window.addEventListener(
    "beforeunload",
    function () {

        if (realtimeChannel) {

            supabaseClient.removeChannel(
                realtimeChannel
            );

        }

    }
);
