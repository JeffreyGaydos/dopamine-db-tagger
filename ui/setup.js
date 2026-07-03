window.addEventListener("DOMContentLoaded", () => {
    UpdateInstalledInfoBox();
    document.querySelector("#install").addEventListener("click", () => {
        //TODO check for the presence of tables
        if(confirm("You sure about that?")) {
            fetch(`http://localhost:8080/api/setup/install`).then((f) => {
                alert("Installed successfully");
                UpdateInstalledInfoBox();
            });
        }
    });

    document.querySelector("#uninstall").addEventListener("click", () => {
        if(confirm("Please confirm: All tags currently on any artists or tracks will be removed. Exported playlists will not be deleted.")) {
            fetch(`http://localhost:8080/api/setup/uninstall`).then((f) => {
                alert("Uninstalled successfully");
                UpdateInstalledInfoBox();
            });
        }
    });
});

function UpdateInstalledInfoBox() {
    document.querySelector("#installed-info").style.display = "none";
    document.querySelector("#uninstalled-info").style.display = "none";
    fetch(`http://localhost:8080/api/setup/status`).then((f) => {
        f.json().then(r => {
            if(r.installed) {
                document.querySelector("#installed-info").style.display = "inline";
            }
            else {
                document.querySelector("#uninstalled-info").style.display = "inline";
            }
        });        
    });
}