/* =========================================
   TWETE MESSAGE ATTACHMENTS
   Works on top of the existing messages.js
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


    /*
       Wait until messages.js has finished loading.
       Then wrap the existing sendMessage function.
    */

    setTimeout(
        wrapSendMessage,
        100
    );

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
   REMOVE ATTACHMENT
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
   WRAP EXISTING SEND
========================================= */

function wrapSendMessage() {

    if (
        typeof window.sendMessage !==
        "function"
    ) {

        setTimeout(
            wrapSendMessage,
            200
        );

        return;

    }


    /*
       Prevent wrapping more than once.
    */

    if (
        window.sendMessage.__attachmentWrapped
    ) {

        return;

    }


    const originalSendMessage =
        window.sendMessage;


    async function sendMessageWithAttachment() {

        /*
           If no attachment is selected,
           use the original working function.
        */

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
   SEND ATTACHMENT MESSAGE
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
        !window.currentUser &&
        typeof currentUser ===
        "undefined"
    ) {

        alert(
            "Your login session is not ready yet."
        );

        return;

    }


    /*
       messages.js keeps these variables
       globally available.
    */

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
            "No conversation is selected."
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


        /*
           Upload file
        */

        const {
            error:
                uploadError
        } =
            await supabaseClient
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


        /*
           Insert message
        */

        const {
            error:
                messageError
        } =
            await supabaseClient
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
                        text ||
                        "",

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


            /*
               Remove uploaded file if
               message creation failed.
            */

            await supabaseClient
                .storage
                .from(
                    "message-attachments"
                )
                .remove([
                    path
                ]);


            alert(
                "The attachment was uploaded, but the message could not be sent."
            );

            return;

        }


        /*
           Clear composer
        */

        if (input) {

            input.value =
                "";

        }


        removeSelectedAttachment();


        /*
           Reload existing messages
           using the original function.
        */

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
            "Could not send the attachment."
        );


    } finally {

        if (button) {

            button.disabled =
                false;

        }

    }

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
