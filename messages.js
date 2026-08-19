/* =========================================
   TWETE CHAT
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

const backButton =
    document.getElementById("backButton");

const chatAvatar =
    document.getElementById("chatAvatar");

const chatAvatarLetter =
    document.getElementById("chatAvatarLetter");

const chatUserName =
    document.getElementById("chatUserName");

const chatUserStatus =
    document.getElementById("chatUserStatus");

const chatMessages =
    document.getElementById("chatMessages");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");
const attachmentButton =
    document.getElementById(
        "attachmentButton"
    );

const attachmentInput =
    document.getElementById(
        "attachmentInput"
    );

const attachmentPreview =
    document.getElementById(
        "attachmentPreview"
    );

let selectedAttachments = [];


/* =========================================
   STATE
========================================= */

let currentUser = null;
let currentProfile = null;
let chatUser = null;

let realtimeChannel = null;

let isSending = false;


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeChat
);


async function initializeChat() {

    setupInterface();

    const authenticated =
        await loadCurrentUser();

    if (!authenticated) {
        return;
    }

    const profileLoaded =
        await loadCurrentProfile();

    if (!profileLoaded) {
        return;
    }

    const chatUserFound =
        await findChatUser();

    if (!chatUserFound) {

        showChatState(
            "No conversation found."
        );

        return;
    }

    renderChatHeader();

    await loadMessages();

    await markMessagesAsRead();

    subscribeToMessages();

}


/* =========================================
   INTERFACE
========================================= */

function setupInterface() {

    backButton.addEventListener(
        "click",
        goBack
    );

    sendButton.addEventListener(
        "click",
        sendMessage
    );
   attachmentButton.addEventListener(
    "click",
    function () {

        attachmentInput.click();

    }
);
   attachmentInput.addEventListener(
    "change",
    handleAttachmentSelection
);

    messageInput.addEventListener(
        "input",
        autoResizeInput
    );
   messageInput.addEventListener(
    "focus",
    function () {

        setTimeout(
            function () {

                updateChatViewport();

                scrollToBottom(
                    false
                );

            },
            250
        );

    }
);

}

/* =========================================
   ATTACHMENT SELECTION
========================================= */

function handleAttachmentSelection(event) {

    const files =
        Array.from(
            event.target.files || []
        );


    if (!files.length) {
        return;
    }


    const availableSlots =
        4 - selectedAttachments.length;


    const filesToAdd =
        files.slice(
            0,
            availableSlots
        );


    selectedAttachments.push(
        ...filesToAdd
    );


    renderAttachmentPreview();


    attachmentInput.value =
        "";

}
/* =========================================
   ATTACHMENT PREVIEW
========================================= */

function renderAttachmentPreview() {

    attachmentPreview.innerHTML =
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
        function (
            file,
            index
        ) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "attachment-preview-item";


            if (
                file.type.startsWith(
                    "image/"
                )
            ) {

                const image =
                    document.createElement(
                        "img"
                    );


                const objectUrl =
                    URL.createObjectURL(
                        file
                    );


                image.src =
                    objectUrl;

                image.alt =
                    file.name;


                image.addEventListener(
                    "load",
                    function () {

                        URL.revokeObjectURL(
                            objectUrl
                        );

                    },
                    {
                        once: true
                    }
                );


                item.appendChild(
                    image
                );

            } else {

                const fileInfo =
                    document.createElement(
                        "div"
                    );


                fileInfo.className =
                    "attachment-file";


                const name =
                    document.createElement(
                        "span"
                    );


                name.className =
                    "attachment-file-name";


                name.textContent =
                    file.name;


                fileInfo.appendChild(
                    name
                );


                item.appendChild(
                    fileInfo
                );

            }


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


            attachmentPreview.appendChild(
                item
            );

        }
    );

}
/* =========================================
   REMOVE ATTACHMENT
========================================= */

function removeAttachment(index) {

    selectedAttachments.splice(
        index,
        1
    );


    renderAttachmentPreview();

}
/* =========================================
   BACK
========================================= */

function goBack() {

    if (
        currentProfile &&
        currentProfile.role === "coach"
    ) {

        window.location.href =
            "coach.html";

        return;
    }

    window.location.href =
        "athlete.html";

}


/* =========================================
   CURRENT USER
========================================= */

async function loadCurrentUser() {

    const {
        data,
        error
    } =
        await supabaseClient.auth.getUser();


    if (
        error ||
        !data ||
        !data.user
    ) {

        window.location.href =
            "index.html";

        return false;
    }


    currentUser =
        data.user;

    return true;

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
            .single();


    if (
        error ||
        !data
    ) {

        console.error(
            "Profile error:",
            error
        );

        showChatState(
            "Profile could not be loaded."
        );

        return false;
    }


    currentProfile =
        data;

    return true;

}


/* =========================================
   FIND CHAT USER
========================================= */

async function findChatUser() {

    /*
        COACH

        A coach can open a specific athlete with:

        messages.html?athlete_id=USER_ID
    */

    if (
        currentProfile.role === "coach"
    ) {

        const params =
            new URLSearchParams(
                window.location.search
            );

        const requestedAthleteId =
            params.get("athlete_id");


        if (requestedAthleteId) {

            const {
                data: connection,
                error: connectionError
            } =
                await supabaseClient
                    .from("coach_athletes")
                    .select(
                        "athlete_id"
                    )
                    .eq(
                        "coach_id",
                        currentUser.id
                    )
                    .eq(
                        "athlete_id",
                        requestedAthleteId
                    )
                    .maybeSingle();


            if (
                connectionError ||
                !connection
            ) {

                console.error(
                    "Coach-athlete connection error:",
                    connectionError
                );

                return false;
            }


            return await loadChatUserProfile(
                requestedAthleteId
            );

        }


        /*
            If no athlete was supplied in the URL,
            use the first connected athlete for now.
        */

        const {
            data: connection,
            error: connectionError
        } =
            await supabaseClient
                .from("coach_athletes")
                .select(
                    "athlete_id"
                )
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
            connectionError ||
            !connection
        ) {

            console.error(
                "Athlete connection error:",
                connectionError
            );

            return false;
        }


        return await loadChatUserProfile(
            connection.athlete_id
        );

    }


    /*
        ATHLETE

        Athlete automatically gets
        their connected coach.
    */

    if (
        currentProfile.role === "athlete"
    ) {

        const {
            data: connection,
            error: connectionError
        } =
            await supabaseClient
                .from("coach_athletes")
                .select(
                    "coach_id"
                )
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
            connectionError ||
            !connection
        ) {

            console.error(
                "Coach connection error:",
                connectionError
            );

            return false;
        }


        return await loadChatUserProfile(
            connection.coach_id
        );

    }


    return false;

}


/* =========================================
   LOAD CHAT USER PROFILE
========================================= */

async function loadChatUserProfile(
    userId
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
                userId
            )
            .maybeSingle();


    if (
        error ||
        !data
    ) {

        console.error(
            "Chat user profile error:",
            error
        );

        return false;
    }


    chatUser =
        data;

    return true;

}


/* =========================================
   HEADER
========================================= */

function renderChatHeader() {

    const name =
        chatUser.full_name ||
        (
            chatUser.role === "coach"
                ? "Coach"
                : "Athlete"
        );


    chatUserName.textContent =
        name;


    chatUserStatus.textContent =
        chatUser.role === "coach"
            ? "Coach"
            : "Athlete";


    renderAvatar(
        name,
        chatUser.avatar_url
    );

}


/* =========================================
   AVATAR
========================================= */

function renderAvatar(
    name,
    avatarUrl
) {

    chatAvatar.innerHTML = "";


    if (avatarUrl) {

        const image =
            document.createElement("img");

        image.src =
            avatarUrl;

        image.alt =
            "";

        image.addEventListener(
            "error",
            function () {

                renderAvatarLetter(
                    name
                );

            },
            {
                once: true
            }
        );


        chatAvatar.appendChild(
            image
        );

        return;
    }


    renderAvatarLetter(
        name
    );

}


function renderAvatarLetter(
    name
) {

    chatAvatar.innerHTML = "";


    const span =
        document.createElement("span");


    span.textContent =
        (
            name &&
            name.trim()
        )
            ? name
                .trim()
                .charAt(0)
                .toUpperCase()
            : "T";


    chatAvatar.appendChild(
        span
    );

}


/* =========================================
   LOAD MESSAGES
========================================= */

async function loadMessages() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("messages")
            .select(
    "id, sender_id, receiver_id, message, created_at, read_at, attachment_path, attachment_name, attachment_type, attachment_size"
)
            .or(
                `and(sender_id.eq.${currentUser.id},receiver_id.eq.${chatUser.id}),and(sender_id.eq.${chatUser.id},receiver_id.eq.${currentUser.id})`
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Messages error:",
            error
        );

        showChatState(
            "Messages could not be loaded."
        );

        return;
    }


    chatMessages.innerHTML = "";


    for (
        const message of data
    ) {

        await renderMessage(
            message
        );

    }


    scrollToBottom(
        false
    );

}


/* =========================================
   RENDER MESSAGE
========================================= */
async function renderMessage(message) {

    /*
        Prevent duplicate messages
    */

    if (
        document.querySelector(
            `[data-message-id="${message.id}"]`
        )
    ) {

        updateMessageReadState(message);
        return;
    }


    const isSent =
        message.sender_id === currentUser.id;


    const row =
        document.createElement("div");

    row.className =
        `message-row ${isSent ? "sent" : "received"}`;

    row.dataset.messageId =
        message.id;


    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";


    /*
        ATTACHMENT
    */

    if (message.attachment_path) {

        const attachment =
            await createMessageAttachment(message);

        if (attachment) {

            bubble.appendChild(
                attachment
            );

        }

    }


    /*
        TEXT

        Only create the text element when
        the message actually contains text.
    */

    if (
        message.message &&
        message.message.trim()
    ) {

        const text =
            document.createElement("div");

        text.className =
            "message-text";

        text.textContent =
            message.message;

        bubble.appendChild(
            text
        );

    }


    /*
        MESSAGE META
    */

    const meta =
        document.createElement("div");

    meta.className =
        "message-meta";


    const time =
        document.createElement("span");

    time.className =
        "message-time";

    time.textContent =
        formatMessageTime(
            message.created_at
        );


    meta.appendChild(
        time
    );


    /*
        Read indicator
    */

    if (isSent) {

        const checks =
            document.createElement("span");

        checks.className =
            "message-checks";

        checks.textContent =
            message.read_at
                ? "✓✓"
                : "✓";

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

    chatMessages.appendChild(
        row
    );

}

/* =========================================
   MESSAGE ATTACHMENT
========================================= */

async function createMessageAttachment(
    message
) {

    if (!message.attachment_path) {
        return null;
    }


    /*
        Create temporary signed URL.

        The bucket stays private.
    */

    const {
        data,
        error
    } =
        await supabaseClient
            .storage
            .from("chat-attachments")
            .createSignedUrl(
                message.attachment_path,
                3600
            );


    if (
        error ||
        !data ||
        !data.signedUrl
    ) {

        console.error(
            "Attachment URL error:",
            error
        );

        return createBrokenAttachment(
            message
        );
    }


    const url =
        data.signedUrl;


    /*
        IMAGE
    */

    if (
        message.attachment_type &&
        message.attachment_type.startsWith(
            "image/"
        )
    ) {

        const image =
            document.createElement("img");

        image.className =
            "message-attachment-image";

        image.src =
            url;


       image.alt =
            message.attachment_name ||
            "Image";

        image.loading =
            "lazy";
       
       image.addEventListener(
    "load",
    function () {

        /*
            Only now does the browser know
            the real image height.

            Scroll again so image + text +
            timestamp are completely visible.
        */

        scrollToBottom(
            false
        );

    },
    {
        once: true
    }
);

        


        /*
            Clicking the image opens
            the full image.
        */

        image.addEventListener(
            "click",
            function () {

                window.open(
                    url,
                    "_blank",
                    "noopener,noreferrer"
                );

            }
        );


        return image;
    }


    /*
        VIDEO
    */

    if (
        message.attachment_type &&
        message.attachment_type.startsWith(
            "video/"
        )
    ) {

        const video =
            document.createElement("video");

        video.className =
            "message-attachment-video";

        video.src =
            url;

        video.controls =
            true;

        video.preload =
            "metadata";

       video.addEventListener(
    "loadedmetadata",
    function () {

        scrollToBottom(
            false
        );

    },
    {
        once: true
    }
);

        return video;
    }


    /*
        DOCUMENT / OTHER FILE
    */

    const file =
        document.createElement("a");

    file.className =
        "message-attachment-file";

    file.href =
        url;

    file.target =
        "_blank";

    file.rel =
        "noopener noreferrer";


    const icon =
        document.createElement("span");

    icon.className =
        "message-attachment-file-icon";

    icon.textContent =
        "↓";


    const information =
        document.createElement("span");

    information.className =
        "message-attachment-file-info";


    const name =
        document.createElement("span");

    name.className =
        "message-attachment-file-name";

    name.textContent =
        message.attachment_name ||
        "Attachment";


    const size =
        document.createElement("span");

    size.className =
        "message-attachment-file-size";

    size.textContent =
        formatFileSize(
            message.attachment_size
        );


    information.appendChild(
        name
    );

    information.appendChild(
        size
    );


    file.appendChild(
        icon
    );

    file.appendChild(
        information
    );


    return file;

}


/* =========================================
   BROKEN ATTACHMENT
========================================= */

function createBrokenAttachment(
    message
) {

    const element =
        document.createElement("div");

    element.className =
        "message-attachment-error";

    element.textContent =
        message.attachment_name ||
        "Attachment unavailable";

    return element;

}


/* =========================================
   FILE SIZE
========================================= */

function formatFileSize(bytes) {

    const size =
        Number(bytes);


    if (
        !size ||
        size < 1
    ) {
        return "";
    }


    if (
        size < 1024
    ) {

        return `${size} B`;

    }


    if (
        size < 1024 * 1024
    ) {

        return `${
            (
                size / 1024
            ).toFixed(1)
        } KB`;

    }


    return `${
        (
            size /
            (1024 * 1024)
        ).toFixed(1)
    } MB`;

}

/* =========================================
   SEND MESSAGE
========================================= */
async function sendMessage() {

    if (
        isSending ||
        !currentUser ||
        !chatUser
    ) {
        return;
    }


    const message =
        messageInput.value.trim();


    const attachment =
        selectedAttachments.length > 0
            ? selectedAttachments[0]
            : null;


    /*
        Nothing to send
    */

    if (
        !message &&
        !attachment
    ) {
        return;
    }


    isSending = true;
    sendButton.disabled = true;


    let attachmentData = {
        attachment_path: null,
        attachment_name: null,
        attachment_type: null,
        attachment_size: null
    };


    /*
        Upload attachment first
    */

    if (attachment) {

        const uploadResult =
            await uploadChatAttachment(
                attachment
            );


        if (!uploadResult) {

            isSending = false;
            sendButton.disabled = false;

            return;
        }


        attachmentData =
            uploadResult;
    }


    /*
        Create message
    */

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
                    message || null,

                attachment_path:
                    attachmentData.attachment_path,

                attachment_name:
                    attachmentData.attachment_name,

                attachment_type:
                    attachmentData.attachment_type,

                attachment_size:
                    attachmentData.attachment_size

            })
            .select(
                "id, sender_id, receiver_id, message, created_at, read_at, attachment_path, attachment_name, attachment_type, attachment_size"
            )
            .single();


    /*
        If message creation fails,
        remove the uploaded orphan file.
    */

    if (error) {

        console.error(
            "Send message error:",
            error
        );


        if (
            attachmentData.attachment_path
        ) {

            await supabaseClient
                .storage
                .from("chat-attachments")
                .remove([
                    attachmentData.attachment_path
                ]);

        }


        isSending = false;
        sendButton.disabled = false;

        return;
    }


    /*
        Clear composer only after success
    */

    messageInput.value = "";

    selectedAttachments = [];

    renderAttachmentPreview();

    resetInputHeight();


    isSending = false;
    sendButton.disabled = false;


    /*
        Render immediately.
        Realtime duplicate protection
        prevents duplicate messages.
    */

    await renderMessage(
    data
);


/*
    Scroll only after the complete
    message structure exists.
*/

scrollToBottom(
    false
);

}

/* =========================================
   UPLOAD CHAT ATTACHMENT
========================================= */

async function uploadChatAttachment(file) {

    if (
        !file ||
        !currentUser
    ) {
        return null;
    }


    /*
        Maximum file size: 20 MB
    */

    const MAX_FILE_SIZE =
        20 * 1024 * 1024;


    if (
        file.size >
        MAX_FILE_SIZE
    ) {

        alert(
            "The file is too large. Maximum size is 20 MB."
        );

        return null;
    }


    /*
        Create our own safe file name.

        This is important for camera photos too,
        because we do not rely on the original
        device filename.
    */

    const extension =
        getFileExtension(
            file.name
        );


    const uniqueId =
        crypto.randomUUID();


    const safeFileName =
        extension
            ? `${uniqueId}.${extension}`
            : uniqueId;


    /*
        First folder = sender UUID.

        This matches our Supabase
        Storage security policy.
    */

    const storagePath =
        `${currentUser.id}/${safeFileName}`;


    const {
        error
    } =
        await supabaseClient
            .storage
            .from(
                "chat-attachments"
            )
            .upload(
                storagePath,
                file,
                {
                    cacheControl: "3600",
                    upsert: false,

                    contentType:
                        file.type ||
                        undefined
                }
            );


    if (error) {

        console.error(
            "Attachment upload error:",
            error
        );

        alert(
            "The attachment could not be uploaded."
        );

        return null;
    }


    return {

        attachment_path:
            storagePath,

        attachment_name:
            file.name ||
            "Attachment",

        attachment_type:
            file.type ||
            "application/octet-stream",

        attachment_size:
            file.size

    };

}


/* =========================================
   FILE EXTENSION
========================================= */

function getFileExtension(fileName) {

    if (
        !fileName ||
        !fileName.includes(".")
    ) {
        return "";
    }


    const extension =
        fileName
            .split(".")
            .pop()
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            );


    return extension;

}

/* =========================================
   REALTIME
========================================= */

function subscribeToMessages() {

    if (realtimeChannel) {

        supabaseClient.removeChannel(
            realtimeChannel
        );

    }


    realtimeChannel =
        supabaseClient
            .channel(
                `twete-chat-${currentUser.id}-${chatUser.id}`
            )


            /*
                New messages received by us
            */

            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter:
                        `receiver_id=eq.${currentUser.id}`
                },
                async function (
                    payload
                ) {

                    const message =
                        payload.new;


                    if (
                        message.sender_id !==
                        chatUser.id
                    ) {

                        return;
                    }


                    renderMessage(
                        message
                    );


                    scrollToBottom(
                        true
                    );


                    await markMessageAsRead(
                        message.id
                    );

                }
            )


            /*
                Messages sent by us.

                Useful when another tab/device
                sends the message.
            */

            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter:
                        `sender_id=eq.${currentUser.id}`
                },
                function (
                    payload
                ) {

                    const message =
                        payload.new;


                    if (
                        message.receiver_id !==
                        chatUser.id
                    ) {

                        return;
                    }


                    renderMessage(
                        message
                    );


                    scrollToBottom(
                        true
                    );

                }
            )


            /*
                Read status changes
            */

            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "messages",
                    filter:
                        `sender_id=eq.${currentUser.id}`
                },
                function (
                    payload
                ) {

                    if (
                        payload.new.receiver_id !==
                        chatUser.id
                    ) {

                        return;
                    }


                    updateMessageReadState(
                        payload.new
                    );

                }
            )


            .subscribe();

}


/* =========================================
   MARK ALL RECEIVED AS READ
========================================= */

async function markMessagesAsRead() {

    if (
        !currentUser ||
        !chatUser
    ) {

        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("messages")
            .update({
                read_at:
                    new Date()
                        .toISOString()
            })
            .eq(
                "sender_id",
                chatUser.id
            )
            .eq(
                "receiver_id",
                currentUser.id
            )
            .is(
                "read_at",
                null
            );


    if (error) {

        console.error(
            "Mark messages read error:",
            error
        );

    }

}


/* =========================================
   MARK ONE MESSAGE AS READ
========================================= */

async function markMessageAsRead(
    messageId
) {

    const {
        error
    } =
        await supabaseClient
            .from("messages")
            .update({
                read_at:
                    new Date()
                        .toISOString()
            })
            .eq(
                "id",
                messageId
            )
            .eq(
                "receiver_id",
                currentUser.id
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
   UPDATE READ INDICATOR
========================================= */

function updateMessageReadState(
    message
) {

    if (
        !message ||
        message.sender_id !==
        currentUser.id
    ) {

        return;
    }


    const row =
        document.querySelector(
            `[data-message-id="${message.id}"]`
        );


    if (!row) {
        return;
    }


    const checks =
        row.querySelector(
            ".message-checks"
        );


    if (!checks) {
        return;
    }


    checks.textContent =
        message.read_at
            ? "✓✓"
            : "✓";

}


/* =========================================
   MESSAGE TIME
========================================= */

function formatMessageTime(
    timestamp
) {

    if (!timestamp) {
        return "";
    }


    const date =
        new Date(
            timestamp
        );


    return date.toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =========================================
   INPUT AUTO RESIZE
========================================= */

function autoResizeInput() {

    messageInput.style.height =
        "auto";


    const newHeight =
        Math.min(
            messageInput.scrollHeight,
            130
        );


    messageInput.style.height =
        `${newHeight}px`;


    messageInput.style.overflowY =
        messageInput.scrollHeight > 130
            ? "auto"
            : "hidden";

}


function resetInputHeight() {

    messageInput.style.height =
        "";

    messageInput.style.overflowY =
        "hidden";

}


/* =========================================
   SCROLL
========================================= */

function scrollToBottom(
    smooth = true
) {

    requestAnimationFrame(
        function () {

            chatMessages.scrollTo({
                top:
                    chatMessages.scrollHeight,

                behavior:
                    smooth
                        ? "smooth"
                        : "auto"
            });

        }
    );

}


/* =========================================
   CHAT STATE
========================================= */

function showChatState(
    text
) {

    chatMessages.innerHTML =
        "";


    const state =
        document.createElement("div");


    state.style.margin =
        "auto";

    state.style.padding =
        "24px";

    state.style.textAlign =
        "center";

    state.style.color =
        "rgba(255,255,255,0.5)";

    state.style.fontSize =
        "14px";


    state.textContent =
        text;


    chatMessages.appendChild(
        state
    );

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
/* =========================================
   MOBILE KEYBOARD / VISUAL VIEWPORT
========================================= */

function updateChatViewport() {

    const chatPage =
        document.querySelector(
            ".chat-page"
        );


    if (!chatPage) {
        return;
    }


    /*
        On mobile devices the software keyboard
        changes the visible viewport height.

        visualViewport.height gives us the
        actually visible area above the keyboard.
    */

    if (window.visualViewport) {

        chatPage.style.height =
            `${window.visualViewport.height}px`;

    } else {

        /*
            Fallback for browsers without
            Visual Viewport support.
        */

        chatPage.style.height =
            `${window.innerHeight}px`;

    }


    /*
        Keep the latest message visible when
        the keyboard opens or closes.
    */

    requestAnimationFrame(
        function () {

            scrollToBottom(
                false
            );

        }
    );

}


/* =========================================
   VIEWPORT EVENTS
========================================= */

if (window.visualViewport) {

    window.visualViewport.addEventListener(
        "resize",
        updateChatViewport
    );


    window.visualViewport.addEventListener(
        "scroll",
        updateChatViewport
    );

}


window.addEventListener(
    "resize",
    updateChatViewport
);


window.addEventListener(
    "orientationchange",
    updateChatViewport
);


/* =========================================
   INITIAL VIEWPORT
========================================= */

window.addEventListener(
    "load",
    updateChatViewport
);
