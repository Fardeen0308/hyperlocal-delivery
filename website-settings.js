async function loadSettings() {

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/settings"
    );

    const settings = await response.json();

    document.getElementById("websiteName").value =
        settings.websiteName || "";

    document.getElementById("supportEmail").value =
        settings.supportEmail || "";

    document.getElementById("supportPhone").value =
        settings.supportPhone || "";

    document.getElementById("announcement").value =
        settings.announcement || "";
}

async function saveSettings() {

    const websiteName =
        document.getElementById("websiteName").value;

    const supportEmail =
        document.getElementById("supportEmail").value;

    const supportPhone =
        document.getElementById("supportPhone").value;

    const announcement =
        document.getElementById("announcement").value;

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/settings",
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                websiteName,
                supportEmail,
                supportPhone,
                announcement
            })
        }
    );

    const data = await response.json();

    alert(data.message);
}

loadSettings();