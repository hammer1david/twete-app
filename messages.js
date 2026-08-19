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
const messageActionBar =
    document.getElementById(
        "messageActionBar"
    );

const copyMessageButton =
    document.getElementById(
        "copyMessageButton"
    );

const deleteMessageButton =
    document.getElementById(
        "deleteMessageButton"
    );

const cancelMessageSelectionButton =
    document.getElementById(
        "cancelMessageSelectionButton"
    );

const chatPage =
    document.getElementById(
        "chatPage"
    );
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

const chatLoadingOverlay =
    document.getElementById(
        "chatLoadingOverlay"
    );


/* =========================================
   STATE
========================================= */

let currentUser = null;
let currentProfile = null;
let chatUser = null;

let realtimeChannel = null;

let isSending = false;
let chatPresenceInterval = null;
const renderingMessageIds=
   new Set();

const selectedMessages =
    new Map();

let messageLongPressTimer =
    null;

let isMessageSelectionMode =
    false;
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
hideChatLoading();
        return;
    }

    renderChatHeader();

    await loadMessages();

    await markMessagesAsRead();

    subscribeToMessages();
   
await startChatPresence();
   hideChatLoading();
}

document.addEventListener(
    "visibilitychange",
    function () {

        if (
            document.visibilityState ===
            "visible"
        ) {

            updateChatPresence(
                true
            );

        } else {

            updateChatPresence(
                false
            );

        }

    }
);
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
            .select(`
    id,
    sender_id,
    receiver_id,
    message,
    created_at,
    read_at,
    attachment_path,
    attachment_name,
    attachment_type,
    attachment_size,
    message_attachments (
        id,
        storage_path,
        file_name,
        file_type,
        file_size,
        position
    )
`)
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

data.forEach(function (message) {

    if (
        Array.isArray(message.message_attachments)
    ) {

        message.message_attachments.sort(
            function (a, b) {

                return (
                    (a.position || 0) -
                    (b.position || 0)
                );

            }
        );

    }

});
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
        Prevent duplicate messages that are
        already visible OR currently rendering.
    */

if (
   !message ||
   !message.id
   ) {
     return
   }


   
    if (
        document.querySelector(
            `[data-message-id="${message.id}"]`
        ) ||
       renderingMessageIds.has(
           message.id
          )
    ) {

        updateMessageReadState(message);
        return;
    }
renderingMessageIds.add(
   message.id
   );

    const isSent =
        message.sender_id === currentUser.id;


    const row =
        document.createElement("div");

    row.className =
        `message-row ${isSent ? "sent" : "received"}`;

    row.dataset.messageId =
        message.id;
row.addEventListener(
    "pointerdown",
    function () {

        clearTimeout(
            messageLongPressTimer
        );


        if (
            isMessageSelectionMode
        ) {
            return;
        }


        messageLongPressTimer =
            setTimeout(
                function () {

                    toggleMessageSelection(
                        message,
                        row
                    );

                },
                500
            );

    }
);


row.addEventListener(
    "pointerup",
    function () {

        clearTimeout(
            messageLongPressTimer
        );

    }
);


row.addEventListener(
    "pointercancel",
    function () {

        clearTimeout(
            messageLongPressTimer
        );

    }
);


row.addEventListener(
    "pointermove",
    function () {

        clearTimeout(
            messageLongPressTimer
        );

    }
);


row.addEventListener(
    "click",
    function (event) {

        if (
            !isMessageSelectionMode
        ) {
            return;
        }


        event.preventDefault();
        event.stopPropagation();


        toggleMessageSelection(
            message,
            row
        );

    }
);

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";


    /*
    ATTACHMENTS
*/

if (
    Array.isArray(message.message_attachments) &&
    message.message_attachments.length > 0
) {

    const mediaAttachments =
    message.message_attachments.filter(
        function (item) {

            return (
                item.file_type &&
                (
                    item.file_type.startsWith(
                        "image/"
                    ) ||
                    item.file_type.startsWith(
                        "video/"
                    )
                )
            );

        }
    );


    const otherAttachments =
        message.message_attachments.filter(
            function (item) {

                return !(
    item.file_type &&
    (
        item.file_type.startsWith(
            "image/"
        ) ||
        item.file_type.startsWith(
            "video/"
        )
    )
);

            }
        );


    /*
        IMAGE GRID
    */

    if (
        mediaAttachments.length > 0
    ) {

        const imageGrid =
            document.createElement(
                "div"
            );

        imageGrid.className =
            "message-image-grid";

        imageGrid.dataset.count =
            String(
                mediaAttachments.length
            );


        for (
            const attachmentData of
            mediaAttachments
        ) {

            const attachment =
                await createMessageAttachment({
                    attachment_path:
                        attachmentData.storage_path,

                    attachment_name:
                        attachmentData.file_name,

                    attachment_type:
                        attachmentData.file_type,

                    attachment_size:
                        attachmentData.file_size
                });


            if (attachment) {

                imageGrid.appendChild(
                    attachment
                );

            }

        }


        bubble.appendChild(
            imageGrid
        );

    }


    /*
        DOCUMENTS / VIDEOS
    */

    for (
        const attachmentData of
        otherAttachments
    ) {

        const attachment =
            await createMessageAttachment({
                attachment_path:
                    attachmentData.storage_path,

                attachment_name:
                    attachmentData.file_name,

                attachment_type:
                    attachmentData.file_type,

                attachment_size:
                    attachmentData.file_size
            });


        if (attachment) {

            bubble.appendChild(
                attachment
            );

        }

    }

} else if (
    message.attachment_path
) {

    const attachment =
        await createMessageAttachment(
            message
        );


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

   renderingMessageIds.delete(
      message.id
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


    const attachments =
        selectedAttachments.slice(
            0,
            4
        );


    if (
        !message &&
        attachments.length === 0
    ) {
        return;
    }


    isSending = true;
    sendButton.disabled = true;


    const uploadedAttachments = [];


    /*
        Upload all attachments first
    */

    for (
        let index = 0;
        index < attachments.length;
        index++
    ) {

        const file =
            attachments[index];


        const uploadResult =
            await uploadChatAttachment(
                file
            );


        if (!uploadResult) {

            /*
                Cleanup already uploaded files
                if one upload fails.
            */

            if (
                uploadedAttachments.length > 0
            ) {

                await supabaseClient
                    .storage
                    .from("chat-attachments")
                    .remove(
                        uploadedAttachments.map(
                            function (item) {
                                return item.attachment_path;
                            }
                        )
                    );

            }


            isSending = false;
            sendButton.disabled = false;

            return;
        }


        uploadedAttachments.push({
            ...uploadResult,
            position:
                index
        });

    }


    /*
        Create the message first.

        We keep the first attachment in the
        old columns temporarily for backwards
        compatibility.
    */

    const firstAttachment =
        uploadedAttachments.length > 0
            ? uploadedAttachments[0]
            : null;


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
                    firstAttachment
                        ? firstAttachment.attachment_path
                        : null,

                attachment_name:
                    firstAttachment
                        ? firstAttachment.attachment_name
                        : null,

                attachment_type:
                    firstAttachment
                        ? firstAttachment.attachment_type
                        : null,

                attachment_size:
                    firstAttachment
                        ? firstAttachment.attachment_size
                        : null

            })
            .select(
                "id, sender_id, receiver_id, message, created_at, read_at, attachment_path, attachment_name, attachment_type, attachment_size"
            )
            .single();


    if (error) {

        console.error(
            "Send message error:",
            error
        );


        if (
            uploadedAttachments.length > 0
        ) {

            await supabaseClient
                .storage
                .from("chat-attachments")
                .remove(
                    uploadedAttachments.map(
                        function (item) {
                            return item.attachment_path;
                        }
                    )
                );

        }


        isSending = false;
        sendButton.disabled = false;

        return;
    }


    /*
        Save attachment rows
    */

    if (
        uploadedAttachments.length > 0
    ) {

        const attachmentRows =
            uploadedAttachments.map(
                function (item) {

                    return {

                        message_id:
                            data.id,

                        storage_path:
                            item.attachment_path,

                        file_name:
                            item.attachment_name,

                        file_type:
                            item.attachment_type,

                        file_size:
                            item.attachment_size,

                        position:
                            item.position

                    };

                }
            );


        const {
            data: savedAttachments,
            error: attachmentError
        } =
            await supabaseClient
                .from("message_attachments")
                .insert(
                    attachmentRows
                )
                .select(
                    "id, storage_path, file_name, file_type, file_size, position"
                );


        if (attachmentError) {

            console.error(
                "Save message attachments error:",
                attachmentError
            );


            /*
                Remove message and files
                if attachment DB save fails.
            */

            await supabaseClient
                .from("messages")
                .delete()
                .eq(
                    "id",
                    data.id
                );


            await supabaseClient
                .storage
                .from("chat-attachments")
                .remove(
                    uploadedAttachments.map(
                        function (item) {
                            return item.attachment_path;
                        }
                    )
                );


            isSending = false;
            sendButton.disabled = false;

            return;
        }


        data.message_attachments =
            savedAttachments.sort(
                function (a, b) {

                    return (
                        (a.position || 0) -
                        (b.position || 0)
                    );

                }
            );

    } else {

        data.message_attachments = [];

    }


    /*
        Clear composer
    */

    messageInput.value = "";

    selectedAttachments = [];

    renderAttachmentPreview();

    resetInputHeight();


    isSending = false;
    sendButton.disabled = false;


    /*
        Render immediately
    */

    await renderMessage(
        data
    );


    scrollToBottom(
        false
    );


    /*
        Push notification
    */

    sendChatPush(
        data
    );

}

/* =========================================
   SEND CHAT PUSH
========================================= */

async function sendChatPush(messageData) {

    if (
        !chatUser ||
        !messageData
    ) {
        return;
    }


    let body =
        "You have a new message.";


    if (
        messageData.message &&
        messageData.message.trim()
    ) {

        body =
            messageData.message.trim();

    } else if (
        messageData.attachment_type &&
        messageData.attachment_type.startsWith(
            "image/"
        )
    ) {

        body =
            "Sent you a photo.";

    } else if (
        messageData.attachment_type &&
        messageData.attachment_type.startsWith(
            "video/"
        )
    ) {

        body =
            "Sent you a video.";

    } else if (
        messageData.attachment_path
    ) {

        body =
            "Sent you a file.";

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .functions
                .invoke(
                    "send-push-v2",
                    {
                        body: {

                            recipient_id:
                                chatUser.id,

                            title:
                                currentProfile?.full_name
                                || "Twete",

                            body:
                                body,

                            url:
                                currentProfile?.role === "coach"
                                    ? "/messages.html"
                                    : `/messages.html?athlete_id=${currentUser.id}`

                        }
                    }
                );


        if (error) {

            console.error(
                "Chat push error:",
                error
            );

        }

    } catch (error) {

        /*
            Push failure must never stop
            the actual chat message.
        */

        console.error(
            "Chat push exception:",
            error
        );

    }

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
   CHAT PRESENCE
========================================= */

async function updateChatPresence(
    isActive
) {

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
            .from("chat_presence")
            .upsert(
                {
                    user_id:
                        currentUser.id,

                    chat_partner_id:
                        chatUser.id,

                    is_active:
                        isActive,

                    last_seen:
                        new Date()
                            .toISOString()
                },
                {
                    onConflict:
                        "user_id"
                }
            );


    if (error) {

        console.error(
            "Chat presence error:",
            error
        );

    }

}


/* =========================================
   START CHAT PRESENCE
========================================= */

async function startChatPresence() {

    await updateChatPresence(
        true
    );


    if (chatPresenceInterval) {

        clearInterval(
            chatPresenceInterval
        );

    }


    chatPresenceInterval =
        setInterval(
            function () {

                if (
                    document.visibilityState ===
                    "visible"
                ) {

                    updateChatPresence(
                        true
                    );

                }

            },
            15000
        );

}


/* =========================================
   STOP CHAT PRESENCE
========================================= */

function stopChatPresence() {

    if (chatPresenceInterval) {

        clearInterval(
            chatPresenceInterval
        );

        chatPresenceInterval =
            null;

    }


    updateChatPresence(
        false
    );

}

/* =========================================
   LOAD ONE MESSAGE WITH ATTACHMENTS
========================================= */

async function loadMessageWithAttachments(
    messageId
) {

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
                read_at,
                attachment_path,
                attachment_name,
                attachment_type,
                attachment_size,
                message_attachments (
                    id,
                    storage_path,
                    file_name,
                    file_type,
                    file_size,
                    position
                )
            `)
            .eq(
                "id",
                messageId
            )
            .maybeSingle();


    if (
        error ||
        !data
    ) {

        console.error(
            "Load realtime message error:",
            error
        );

        return null;
    }


    if (
        Array.isArray(
            data.message_attachments
        )
    ) {

        data.message_attachments.sort(
            function (a, b) {

                return (
                    (a.position || 0) -
                    (b.position || 0)
                );

            }
        );

    }


    return data;

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

                    const basicMessage =
    payload.new;


if (
    basicMessage.sender_id !==
    chatUser.id
) {
    return;
}


const message =
    await loadMessageWithAttachments(
        basicMessage.id
    );


if (!message) {
    return;
}


await renderMessage(
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
                async function (
                    payload
                ) {

                    const basicMessage =
    payload.new;


if (
    basicMessage.receiver_id !==
    chatUser.id
) {
    return;
}


const message =
    await loadMessageWithAttachments(
        basicMessage.id
    );


if (!message) {
    return;
}


await renderMessage(
    message
);


scrollToBottom(
    true
);
                }
            )

/*
    Deleted messages
*/

.on(
    "postgres_changes",
    {
        event: "DELETE",
        schema: "public",
        table: "messages"
    },
    function (
        payload
    ) {

        const deletedMessage =
            payload.old;


        if (
            !deletedMessage ||
            !deletedMessage.id
        ) {
            return;
        }


        const row =
            document.querySelector(
                `[data-message-id="${deletedMessage.id}"]`
            );


        if (row) {

            row.remove();

        }


        if (
            selectedMessageId ===
            deletedMessage.id
        ) {

            clearMessageSelection();

        }

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


        stopChatPresence();

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

/* =========================================
   CHAT PRESENCE
========================================= */

async function updateChatPresence(
    isActive
) {

    if (
        !currentUser ||
        !chatUser
    ) {
        return;
    }


    try {

        await supabaseClient
            .from("chat_presence")
            .upsert(
                {
                    user_id:
                        currentUser.id,

                    chat_partner_id:
                        chatUser.id,

                    is_active:
                        isActive,

                    last_seen:
                        new Date()
                            .toISOString()
                },
                {
                    onConflict:
                        "user_id"
                }
            );

    } catch (error) {

        console.error(
            "Chat presence error:",
            error
        );

    }

}


/* =========================================
   START CHAT PRESENCE
========================================= */

async function startChatPresence() {

    await updateChatPresence(
        true
    );


    if (chatPresenceInterval) {

        clearInterval(
            chatPresenceInterval
        );

    }


    chatPresenceInterval =
        setInterval(
            function () {

                if (
                    document.visibilityState ===
                    "visible"
                ) {

                    updateChatPresence(
                        true
                    );

                }

            },
            15000
        );

}


/* =========================================
   STOP CHAT PRESENCE
========================================= */

function stopChatPresence() {

    if (chatPresenceInterval) {

        clearInterval(
            chatPresenceInterval
        );

        chatPresenceInterval =
            null;

    }


    updateChatPresence(
        false
    );

}


function hideChatLoading() {

    if (chatPage) {

        chatPage.classList.remove(
            "chat-loading"
        );

    }


    if (chatLoadingOverlay) {

        chatLoadingOverlay.classList.add(
            "hidden"
        );

    }

}

/* =========================================
   MESSAGE SELECTION
========================================= */

function toggleMessageSelection(
    message,
    row
) {

    if (
        !message ||
        !message.id ||
        !row
    ) {
        return;
    }


    const messageId =
        message.id;


    /*
        Remove when already selected
    */

    if (
        selectedMessages.has(
            messageId
        )
    ) {

        selectedMessages.delete(
            messageId
        );

        row.classList.remove(
            "message-selected"
        );

    } else {

        /*
            Add message
        */

        selectedMessages.set(
            messageId,
            message
        );

        row.classList.add(
            "message-selected"
        );

    }


    /*
        Selection mode is active as long
        as at least one message is selected.
    */

    isMessageSelectionMode =
        selectedMessages.size > 0;


    if (messageActionBar) {

        messageActionBar.hidden =
            !isMessageSelectionMode;

    }


    /*
        Delete is shown only when every
        selected message belongs to us.
    */

    if (deleteMessageButton) {

        const allMessagesAreOwn =
            selectedMessages.size > 0 &&
            Array.from(
                selectedMessages.values()
            )
                .every(
                    function (item) {

                        return (
                            item.sender_id ===
                            currentUser.id
                        );

                    }
                );


        deleteMessageButton.hidden =
            !allMessagesAreOwn;

    }


    /*
        Copy is available when at least
        one selected message contains text.
    */

    if (copyMessageButton) {

        const hasText =
            Array.from(
                selectedMessages.values()
            )
                .some(
                    function (item) {

                        return (
                            item.message &&
                            item.message.trim()
                        );

                    }
                );


        copyMessageButton.disabled =
            !hasText;

    }


    /*
        If the last selected message
        was removed, close selection mode.
    */

    if (
        selectedMessages.size === 0
    ) {

        clearMessageSelection();

    }

}
    


function clearMessageSelection() {

    selectedMessages.clear();

    isMessageSelectionMode =
        false;


    document
        .querySelectorAll(
            ".message-row.message-selected"
        )
        .forEach(
            function (row) {

                row.classList.remove(
                    "message-selected"
                );

            }
        );


    if (messageActionBar) {

        messageActionBar.hidden =
            true;

    }


    if (deleteMessageButton) {

        deleteMessageButton.hidden =
            true;

    }

}

cancelMessageSelectionButton
    ?.addEventListener(
        "click",
        clearMessageSelection
    );

copyMessageButton
    ?.addEventListener(
        "click",
        async function () {

            if (
                !selectedMessageData ||
                !selectedMessageData.message
            ) {
                return;
            }


            const text =
                selectedMessageData.message.trim();


            if (!text) {
                return;
            }


            try {

                await navigator.clipboard.writeText(
                    text
                );


                clearMessageSelection();

            } catch (error) {

                console.error(
                    "Copy message error:",
                    error
                );

            }

        }
    );


deleteMessageButton
    ?.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();
            event.stopPropagation();

            await deleteSelectedMessage();

        }
    );

/* =========================================
   DELETE SELECTED MESSAGE
========================================= */

async function deleteSelectedMessage() {

    if (
        !selectedMessageData ||
        !currentUser
    ) {
        return;
    }


    /*
        Only allow deleting our own message
    */

    if (
        selectedMessageData.sender_id !==
        currentUser.id
    ) {
        return;
    }


    const messageId =
        selectedMessageData.id;


    /*
        Collect storage files before deleting
        the database message.
    */

    const storagePaths = [];


    if (
        Array.isArray(
            selectedMessageData.message_attachments
        )
    ) {

        selectedMessageData
            .message_attachments
            .forEach(
                function (attachment) {

                    if (
                        attachment.storage_path
                    ) {

                        storagePaths.push(
                            attachment.storage_path
                        );

                    }

                }
            );

    }


    /*
        Fallback for old messages
    */

    if (
        selectedMessageData.attachment_path &&
        !storagePaths.includes(
            selectedMessageData.attachment_path
        )
    ) {

        storagePaths.push(
            selectedMessageData.attachment_path
        );

    }


   /*
    Delete message first.

    message_attachments rows are removed
    automatically by ON DELETE CASCADE.
*/

 const {
    data: deletedMessages,
    error
} =
    await supabaseClient
        .from("messages")
        .delete()
        .eq(
            "id",
            messageId
        )
        .eq(
            "sender_id",
            currentUser.id
        )
        .select(
            "id"
        );


if (error) {

    console.error(
        "Delete message error:",
        error
    );

    return;
}
if (
    !deletedMessages ||
    deletedMessages.length === 0
) {

    console.error(
        "Delete message failed: no row deleted.",
        {
            messageId:
                messageId,

            currentUserId:
                currentUser.id,

            senderId:
                selectedMessageData.sender_id
        }
    );

    return;
}

/*
    Remove attachment files afterwards.

    A storage cleanup error must not prevent
    the message itself from being deleted.
*/

if (
    storagePaths.length > 0
) {

    const {
        error: storageError
    } =
        await supabaseClient
            .storage
            .from(
                "chat-attachments"
            )
            .remove(
                storagePaths
            );


    if (storageError) {

        console.error(
            "Delete attachment files error:",
            storageError
        );

    }

}

    /*
        Remove message immediately
        from the current chat.
    */

    const row =
        document.querySelector(
            `[data-message-id="${messageId}"]`
        );


    if (row) {

        row.remove();

    }


    clearMessageSelection();

}
