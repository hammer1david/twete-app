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
   
   /* =========================================
   ATTACHMENTS
========================================= */

const attachmentButton =
    document.querySelector(
        ".attachment-button"
    );

const attachmentInput =
    document.getElementById(
        "attachmentInput"
    );

const attachmentPreview =
    document.getElementById(
        "attachmentPreview"
    );

const attachmentPreviewContent =
    document.getElementById(
        "attachmentPreviewContent"
    );


/*
    Open file picker
*/

if (
    attachmentButton &&
    attachmentInput
) {

    attachmentButton.addEventListener(
        "click",
        function () {

            attachmentInput.click();

        }
    );


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


            /*
                Maximum 4 attachments
            */

            const remainingSlots =
                4 -
                selectedAttachments.length;


            if (remainingSlots <= 0) {

                alert(
                    "You can attach a maximum of 4 files."
                );

                attachmentInput.value =
                    "";

                return;
            }


            /*
                Only take files that
                fit into the remaining slots.
            */

            const filesToAdd =
                files.slice(
                    0,
                    remainingSlots
                );


            selectedAttachments =
                selectedAttachments.concat(
                    filesToAdd
                );


            /*
                If user selected more
                than allowed
            */

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
                file can be selected again
                later if necessary.
            */

            attachmentInput.value =
                "";

        }
    );

}


/* =========================================
   RENDER ATTACHMENTS
========================================= */

function renderAttachmentPreview() {

    if (
        !attachmentPreview ||
        !attachmentPreviewContent
    ) {
        return;
    }


    attachmentPreviewContent.innerHTML =
        "";


    if (
        selectedAttachments.length === 0
    ) {

        attachmentPreview.hidden =
            true;

        return;
    }


    attachmentPreview.hidden =
        false;


    selectedAttachments.forEach(
        function (file, index) {

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
                Remove button
            */

            const remove =
                document.createElement(
                    "button"
                );

            remove.type =
                "button";

            remove.className =
                "attachment-remove";

            remove.textContent =
                "×";

            remove.setAttribute(
                "aria-label",
                "Remove attachment"
            );


            remove.addEventListener(
                "click",
                function () {

                    removeAttachment(
                        index
                    );

                }
            );


            item.appendChild(
                remove
            );


            attachmentPreviewContent.appendChild(
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
   REMOVE ALL ATTACHMENTS
========================================= */

function clearAttachments() {

    selectedAttachments =
        [];


    if (attachmentInput) {

        attachmentInput.value =
            "";

    }


    renderAttachmentPreview();

}

/* =========================================
   SHOW ATTACHMENT PREVIEW
========================================= */

function showAttachmentPreview(
    file
) {

    if (
        !attachmentPreview ||
        !attachmentPreviewContent
    ) {
        return;
    }


    attachmentPreviewContent.innerHTML =
        "";


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


        attachmentPreviewContent.appendChild(
            image
        );

        addFileInformation(
            file
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


        attachmentPreviewContent.appendChild(
            video
        );

        addFileInformation(
            file
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


        attachmentPreviewContent.appendChild(
            icon
        );

        addFileInformation(
            file
        );

    }


    attachmentPreview.hidden =
        false;

}


/* =========================================
   FILE INFORMATION
========================================= */

function addFileInformation(
    file
) {

    const information =
        document.createElement(
            "div"
        );

    information.className =
        "attachment-file-info";


    const name =
        document.createElement(
            "div"
        );

    name.className =
        "attachment-file-name";

    name.textContent =
        file.name;


    const type =
        document.createElement(
            "div"
        );

    type.className =
        "attachment-file-type";

    type.textContent =
        formatFileSize(
            file.size
        );


    information.appendChild(
        name
    );

    information.appendChild(
        type
    );


    attachmentPreviewContent.appendChild(
        information
    );

}


/* =========================================
   REMOVE ATTACHMENT
========================================= */

function removeAttachment() {

    selectedAttachment =
        null;


    if (attachmentInput) {

        attachmentInput.value =
            "";

    }


    if (attachmentPreviewContent) {

        attachmentPreviewContent.innerHTML =
            "";

    }


    if (attachmentPreview) {

        attachmentPreview.hidden =
            true;

    }

}


/* =========================================
   FILE SIZE
========================================= */

function formatFileSize(
    bytes
) {

    if (
        !bytes ||
        bytes <= 0
    ) {

        return "File";

    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    const size =
        bytes /
        Math.pow(
            1024,
            index
        );


    return (
        size.toFixed(
            index === 0
                ? 0
                : 1
        ) +
        " " +
        units[
            Math.min(
                index,
                units.length - 1
            )
        ]
    );

}

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
/* =========================================
   MOBILE KEYBOARD / VISUAL VIEWPORT
========================================= */

function handleKeyboardResize() {

    if (!window.visualViewport) {
        return;
    }

    const chat =
        document.querySelector(".chat");

    if (!chat) {
        return;
    }

    const viewportHeight =
        window.visualViewport.height;

    chat.style.height =
        viewportHeight + "px";


    /*
        Keep the latest message visible
        when the keyboard opens.
    */

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


/*
    Initial calculation
*/

window.addEventListener(
    "load",
    handleKeyboardResize
);
