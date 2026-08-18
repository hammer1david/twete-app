
/* =========================================
   TWETE MESSAGE ATTACHMENTS
   IMPORTANT:
   This file does NOT change coach connection.
========================================= */

let selectedAttachment = null;


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialiseAttachments
);


/* =========================================
   INITIALISE
========================================= */

function initialiseAttachments() {

    const input =
        document.getElementById(
            "attachmentInput"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "change",
        handleAttachmentSelection
    );


    setTimeout(
        setupAttachmentFunctions,
        300
    );

}


/* =========================================
   SETUP
========================================= */

function setupAttachmentFunctions() {

    wrapSendMessage();

    wrapLoadMessages();

}


/* =========================================
   FILE SELECTED
========================================= */

function handleAttachmentSelection(
    event
) {

    const input =
        event.target;


    if (
        !input.files ||
        !input.files.length
    ) {

        selectedAttachment =
            null;

        removeAttachmentPreview();

        return;

    }


    const file =
        input.files[0];


    const maxSize =
        50 * 1024 * 1024;


    if (
        file.size >
        maxSize
    ) {

        alert(
            "This file is too large. Maximum size is 50 MB."
        );


        input.value =
            "";


        selectedAttachment =
            null;


        removeAttachmentPreview();

        return;

    }


    selectedAttachment =
        file;


    showAttachmentPreview(
        file
    );

}


/* =========================================
   PREVIEW
========================================= */

function showAttachmentPreview(
    file
) {

    removeAttachmentPreview();


    const composer =
        document.querySelector(
            ".message-composer"
        );


    if (!composer) {
        return;
    }


    const preview =
        document.createElement(
            "div"
        );


    preview.id =
        "attachmentPreview";


    preview.className =
        "attachment-preview";


    preview.innerHTML = `

        <div class="attachment-preview-icon">

            ${getFileIcon(
                file.type
            )}

        </div>


        <div class="attachment-preview-info">

            <div class="attachment-preview-name">

                ${escapeAttachmentHtml(
                    file.name
                )}

            </div>


            <div class="attachment-preview-size">

                ${formatFileSize(
                    file.size
                )}

            </div>

        </div>


        <button
            type="button"
            class="attachment-preview-remove"
            aria-label="Remove attachment"
        >

            ×

        </button>

    `;


    preview
        .querySelector(
            ".attachment-preview-remove"
        )
        .addEventListener(
            "click",
            removeSelectedAttachment
        );


    composer
        .parentNode
        .insertBefore(
            preview,
            composer
        );

}


/* =========================================
   REMOVE
========================================= */

function removeSelectedAttachment() {

    selectedAttachment =
        null;


    const input =
        document.getElementById(
            "attachmentInput"
        );


    if (input) {

        input.value =
            "";

    }


    removeAttachmentPreview();

}


function removeAttachmentPreview() {

    const preview =
        document.getElementById(
            "attachmentPreview"
        );


    if (preview) {

        preview.remove();

    }

}


/* =========================================
   WRAP SEND MESSAGE
========================================= */

function wrapSendMessage() {

    if (
        typeof window.sendMessage !==
        "function"
    ) {

        setTimeout(
            wrapSendMessage,
            300
        );

        return;

    }


    if (
        window.sendMessage
            .__attachmentWrapped
    ) {

        return;

    }


    const originalSendMessage =
        window.sendMessage;


    async function sendMessageWithAttachment() {

        if (
            !selectedAttachment
        ) {

            return originalSendMessage();

        }


        await sendAttachmentMessage();

    }


    sendMessageWithAttachment
        .__attachmentWrapped =
        true;


    window.sendMessage =
        sendMessageWithAttachment;

}


/* =========================================
   SEND ATTACHMENT
========================================= */

async function sendAttachmentMessage() {

    const input =
        document.getElementById(
            "messageInput"
        );


    const button =
        document.getElementById(
            "sendButton"
        );


    if (
        typeof messagesSupabase ===
        "undefined"
    ) {

        alert(
            "Messaging connection is not ready yet."
        );

        return;

    }


    const user =
        typeof currentUser !==
        "undefined"
            ?
            currentUser
            :
            null;


    const receiver =
        typeof conversationUserId !==
        "undefined"
            ?
            conversationUserId
            :
            null;


    if (
        !user ||
        !receiver
    ) {

        alert(
            "No coach connection is available yet."
        );

        return;

    }


    const file =
        selectedAttachment;


    if (!file) {
        return;
    }


    if (button) {

        button.disabled =
            true;

    }


    try {

        const messageId =
            crypto.randomUUID();


        const extension =
            getFileExtension(
                file.name
            );


        const path =
            user.id +
            "/" +
            messageId +
            (
                extension
                    ?
                    "." +
                    extension
                    :
                    ""
            );


        const {
            error:
                uploadError
        } =
            await messagesSupabase
                .storage
                .from(
                    "message-attachments"
                )
                .upload(
                    path,
                    file,
                    {

                        cacheControl:
                            "3600",

                        contentType:
                            file.type ||
                            "application/octet-stream",

                        upsert:
                            false

                    }
                );


        if (uploadError) {

            console.error(
                "Attachment upload error:",
                uploadError
            );

            alert(
                "Could not upload the attachment."
            );

            return;

        }


        const text =
            input
                ?
                input.value.trim()
                :
                "";


        const {
            error:
                messageError
        } =
            await messagesSupabase
                .from(
                    "messages"
                )
                .insert({

                    id:
                        messageId,

                    sender_id:
                        user.id,

                    receiver_id:
                        receiver,

                    message:
                        text,

                    attachment_path:
                        path,

                    attachment_name:
                        file.name,

                    attachment_type:
                        file.type ||
                        "application/octet-stream",

                    attachment_size:
                        file.size

                });


        if (messageError) {

            console.error(
                "Message insert error:",
                messageError
            );


            await messagesSupabase
                .storage
                .from(
                    "message-attachments"
                )
                .remove([
                    path
                ]);


            alert(
                "Message error: " +
                (
                    messageError?.message ||
                    messageError?.details ||
                    messageError?.hint ||
                    "Unknown error"
                )
            );

            return;

        }


        if (input) {

            input.value =
                "";

        }


        removeSelectedAttachment();


        if (
            typeof window.loadMessages ===
            "function"
        ) {

            await window.loadMessages();

        }


    } catch (error) {

        console.error(
            "Attachment send error:",
            error
        );


        alert(
            "Attachment error: " +
            (
                error?.message ||
                error?.details ||
                error?.hint ||
                "Unknown error"
            )
        );


    } finally {

        if (button) {

            button.disabled =
                false;

        }

    }

}


/* =========================================
   WRAP LOAD MESSAGES
========================================= */

function wrapLoadMessages() {

    if (
        typeof window.loadMessages !==
        "function"
    ) {

        setTimeout(
            wrapLoadMessages,
            300
        );

        return;

    }


    if (
        window.loadMessages
            .__attachmentWrapped
    ) {

        return;

    }


    const originalLoadMessages =
        window.loadMessages;


    async function loadMessagesWithAttachments() {

        await originalLoadMessages();

        await renderAttachmentMessages();

    }


    loadMessagesWithAttachments
        .__attachmentWrapped =
        true;


    window.loadMessages =
        loadMessagesWithAttachments;

}


/* =========================================
   RENDER ATTACHMENTS + DOWNLOAD
========================================= */

async function renderAttachmentMessages() {

    if (
        typeof messagesSupabase ===
        "undefined"
    ) {

        return;

    }


    if (
        typeof currentUser ===
        "undefined" ||
        typeof conversationUserId ===
        "undefined"
    ) {

        return;

    }


    if (
        !currentUser ||
        !conversationUserId
    ) {

        return;

    }


    const list =
        document.getElementById(
            "messagesList"
        );


    if (!list) {
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
                attachment_path,
                attachment_name,
                attachment_type,
                attachment_size
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
            "Attachment message loading error:",
            error
        );

        return;

    }


    if (
        !data ||
        !data.length
    ) {

        return;

    }


    const rows =
        list.querySelectorAll(
            ".message-row"
        );


    for (
        let i = 0;
        i < data.length;
        i++
    ) {

        const message =
            data[i];


        if (
            !message.attachment_path
        ) {

            continue;

        }


        const row =
            rows[i];


        if (!row) {

            continue;

        }


        const bubble =
            row.querySelector(
                ".message-bubble"
            );


        if (!bubble) {

            continue;

        }


        if (
            bubble.querySelector(
                ".message-attachment-rendered"
            )
        ) {

            continue;

        }


        const {
            data:
                signedData,
            error:
                signedError
        } =
            await messagesSupabase
                .storage
                .from(
                    "message-attachments"
                )
                .createSignedUrl(
    message.attachment_path,
    3600,
    {
        download:
            message.attachment_name ||
            true
    }
);


        if (
            signedError ||
            !signedData
        ) {

            console.error(
                "Signed URL error:",
                signedError
            );

            continue;

        }


        const url =
            signedData.signedUrl;


        const attachment =
            document.createElement(
                "div"
            );


        attachment.className =
            "message-attachment-rendered";


        const downloadName =
            message.attachment_name ||
            "attachment";


        const safeUrl =
            escapeAttachmentHtml(
                url
            );


        const safeName =
            escapeAttachmentHtml(
                downloadName
            );


        /*
           IMAGE
        */

        if (
            message.attachment_type &&
            message.attachment_type
                .startsWith(
                    "image/"
                )
        ) {

            attachment.innerHTML = `

                <a
                    href="${safeUrl}"
                    target="_blank"
                    rel="noopener"
                >

                    <img
                        class="message-attachment-image"
                        src="${safeUrl}"
                        alt="${safeName}"
                    >

                </a>


                <a
                    class="message-attachment-download"
                    href="${safeUrl}"
                    download="${safeName}"
                >

                    ⬇ Download

                </a>

            `;

        }


        /*
           VIDEO
        */

        else if (
            message.attachment_type &&
            message.attachment_type
                .startsWith(
                    "video/"
                )
        ) {

            attachment.innerHTML = `

                <video
                    class="message-attachment-video"
                    controls
                    preload="metadata"
                >

                    <source
                        src="${safeUrl}"
                        type="${escapeAttachmentHtml(
                            message.attachment_type
                        )}"
                    >

                    Your browser does not support video.

                </video>


                <a
                    class="message-attachment-download"
                    href="${safeUrl}"
                    download="${safeName}"
                >

                    ⬇ Download

                </a>

            `;

        }


        /*
           DOCUMENT
        */

        else {

            attachment.innerHTML = `

                <a
                    class="message-attachment-file"
                    href="${safeUrl}"
                    target="_blank"
                    rel="noopener"
                >

                    <span
                        class="message-attachment-icon"
                    >

                        📄

                    </span>


                    <span
                        class="message-attachment-info"
                    >

                        <span
                            class="message-attachment-name"
                        >

                            ${safeName}

                        </span>


                        <span
                            class="message-attachment-size"
                        >

                            ${formatFileSize(
                                message.attachment_size
                            )}

                        </span>

                    </span>

                </a>


                <a
                    class="message-attachment-download"
                    href="${safeUrl}"
                    download="${safeName}"
                >

                    ⬇ Download

                </a>

            `;

        }


        bubble.prepend(
            attachment
        );

    }


    scrollToBottomAfterAttachment();

}


/* =========================================
   SCROLL
========================================= */

function scrollToBottomAfterAttachment() {

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
   FILE ICON
========================================= */

function getFileIcon(
    type
) {

    if (
        type &&
        type.startsWith(
            "image/"
        )
    ) {

        return "🖼️";

    }


    if (
        type &&
        type.startsWith(
            "video/"
        )
    ) {

        return "🎥";

    }


    if (
        type ===
        "application/pdf"
    ) {

        return "📕";

    }


    if (
        type &&
        (
            type.includes(
                "word"
            ) ||
            type.includes(
                "document"
            )
        )
    ) {

        return "📘";

    }


    if (
        type &&
        (
            type.includes(
                "excel"
            ) ||
            type.includes(
                "spreadsheet"
            )
        )
    ) {

        return "📗";

    }


    return "📎";

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

        return "0 B";

    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];


    const index =
        Math.floor(
            Math.log(
                bytes
            ) /
            Math.log(
                1024
            )
        );


    const safeIndex =
        Math.min(
            index,
            units.length - 1
        );


    const value =
        bytes /
        Math.pow(
            1024,
            safeIndex
        );


    return (
        value < 10
            ?
            value.toFixed(1)
            :
            Math.round(
                value
            )
    ) +
    " " +
    units[
        safeIndex
    ];

}


/* =========================================
   EXTENSION
========================================= */

function getFileExtension(
    fileName
) {

    const parts =
        String(
            fileName
        )
        .split(".");


    if (
        parts.length <= 1
    ) {

        return "";

    }


    return parts
        .pop()
        .toLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ""
        );

}


/* =========================================
   ESCAPE
========================================= */

function escapeAttachmentHtml(
    value
) {

    return String(
        value ||
        ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}
