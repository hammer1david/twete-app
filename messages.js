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


/*
    Maximum 4 attachments
*/

let selectedAttachments = [];


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


        await loadCurrentProfile();


        await loadConversationUser();


        setupComposer();


        await loadMessages();


        subscribeToMessages();


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


    if (requestedAthleteId) {

        query =
            query.eq(
                "athlete_id",
                requestedAthleteId
            );

    } else {

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


    if (nameElement) {

        nameElement.textContent =
            name || "Twete";

    }


    if (!avatarElement) {
        return;
    }


    if (avatarUrl) {

        avatarElement.innerHTML =
            "";

        const image =
            document.createElement(
                "img"
            );

        image.src =
            avatarUrl;

        image.alt =
            "";

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


    list.innerHTML =
        "";


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


    messages.forEach(
        function (message) {

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


    requestAnimationFrame(
        function () {

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


    /*
        At this stage attachments
        are only being previewed.

        Uploading them to Supabase
        comes in the next step.
    */

    if (
        !text &&
        selectedAttachments.length > 0
    ) {

        alert(
            "Attachment upload will be added next."
        );

        return;
    }


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


        input.value =
            "";

        resizeComposer();


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


    const attachmentButton =
        document.querySelector(
            ".attachment-button"
        );


    const attachmentInput =
        document.getElementById(
            "attachmentInput"
        );


    /*
        TEXT INPUT
    */

    if (input) {

        input.addEventListener(
            "input",
            resizeComposer
        );


        /*
            Enter = new line
        */

        input.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter"
                ) {

                    return;

                }

            }
        );

    }


    /*
        SEND
    */

    if (sendButton) {

        sendButton.addEventListener(
            "click",
            sendMessage
        );

    }


    /*
        BACK
    */

    if (backButton) {

        backButton.addEventListener(
            "click",
            goBack
        );

    }


    /*
        ATTACHMENT BUTTON
    */

    if (
        attachmentButton &&
        attachmentInput
    ) {

        attachmentButton.addEventListener(
            "click",
            function () {

                /*
                    If already 4 files are
                    selected, do not open
                    another selection dialog.
                */

                if (
                    selectedAttachments.length >= 4
                ) {

                    alert(
                        "You can attach a maximum of 4 files."
                    );

                    return;
                }


                attachmentInput.click();

            }
        );


        /*
            FILE SELECTION
        */

        attachmentInput.addEventListener(
            "change",
            function () {

                const files =
                    Array.from(
                        attachmentInput.files
                    );


                if (!files.length) {
                    return;
                }


                const remainingSlots =
                    4 -
                    selectedAttachments.length;


                const filesToAdd =
                    files.slice(
                        0,
                        remainingSlots
                    );


                selectedAttachments =
                    selectedAttachments.concat(
                        filesToAdd
                    );


                if (
                    files.length >
                    remainingSlots
                ) {

                    alert(
                        "You can attach a maximum of 4 files."
                    );

                }


                renderAttachmentPreview();


                /*
                    Reset input so the same
                    file can be selected again.
                */

                attachmentInput.value =
                    "";

            }
        );

    }

}


/* =========================================
   ATTACHMENT PREVIEW
========================================= */

function renderAttachmentPreview() {

    const preview =
        document.getElementById(
            "attachmentPreview"
        );


    const previewContent =
        document.getElementById(
            "attachmentPreviewContent"
        );


    if (
        !preview ||
        !previewContent
    ) {

        return;

    }


    previewContent.innerHTML =
        "";


    /*
        No attachments
    */

    if (
        selectedAttachments.length === 0
    ) {

        preview.hidden =
            true;

        return;

    }


    preview.hidden =
        false;


    selectedAttachments.forEach(
        function (
            file,
            index
        ) {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "attachment-item";


            /*
                IMAGE
            */

            if (
                file.type.startsWith(
                    "image/"
                )
            ) {

                const image =
                    document.createElement(
                        "img"
                    );

                image.className =
                    "attachment-preview-image";

                image.src =
                    URL.createObjectURL(
                        file
                    );

                image.alt =
                    file.name;


                item.appendChild(
                    image
                );

            }


            /*
                VIDEO
            */

            else if (
                file.type.startsWith(
                    "video/"
                )
            ) {

                const video =
                    document.createElement(
                        "video"
                    );

                video.className =
                    "attachment-preview-video";

                video.src =
                    URL.createObjectURL(
                        file
                    );

                video.muted =
                    true;

                video.playsInline =
                    true;


                item.appendChild(
                    video
                );

            }


            /*
                OTHER FILE
            */

            else {

                const icon =
                    document.createElement(
                        "div"
                    );

                icon.className =
                    "attachment-file-icon";

                icon.textContent =
                    "📄";


                item.appendChild(
                    icon );


                const fileName =
                    document.createElement(
                        "div"
                    );

                fileName.className =
                    "attachment-file-name";

                fileName.textContent =
                    file.name;


                item.appendChild(
                    fileName
                );

            }


            /*
                REMOVE BUTTON
            */

            const removeButton =
                document.createElement(
                    "button"
                );

            removeButton.type =
                "button";

            removeButton.className =
                "attachment-remove";

            removeButton.textContent =
                "×";

            removeButton.setAttribute(
                "aria-label",
                "Remove attachment"
            );


            removeButton.addEventListener(
                "click",
                function () {

                    removeAttachment(
                        index
                    );

                }
            );


            item.appendChild(
                removeButton
            );


            previewContent.appendChild(
                item
            );

        }
    );

}


/* =========================================
   REMOVE ONE ATTACHMENT
========================================= */

function removeAttachment(
    index
) {

    if (
        index < 0 ||
        index >=
        selectedAttachments.length
    ) {

        return;

    }


    selectedAttachments.splice(
        index,
        1
    );


    renderAttachmentPreview();

}


/* =========================================
   CLEAR ALL ATTACHMENTS
========================================= */

function clearAttachments() {

    selectedAttachments =
        [];


    const attachmentInput =
        document.getElementById(
            "attachmentInput"
        );


    if (attachmentInput) {

        attachmentInput.value =
            "";

    }


    renderAttachmentPreview();

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


    list.innerHTML =
        "";


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


    list.innerHTML =
        "";


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


/* =========================================
   MOBILE KEYBOARD / VISUAL VIEWPORT
========================================= */

function handleKeyboardResize() {

    if (!window.visualViewport) {
        return;
    }


    const chat =
        document.querySelector(
            ".chat"
        );


    if (!chat) {
        return;
    }


    const viewportHeight =
        window.visualViewport.height;


    chat.style.height =
        viewportHeight +
        "px";


    requestAnimationFrame(
        function () {

            scrollToBottom();

        }
    );

}


if (window.visualViewport) {

    window.visualViewport.addEventListener(
        "resize",
        handleKeyboardResize
    );


    window.visualViewport.addEventListener(
        "scroll",
        handleKeyboardResize
    );

}


window.addEventListener(
    "load",
    handleKeyboardResize
);
