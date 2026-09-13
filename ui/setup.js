let installVersion = 0.0;

window.addEventListener("DOMContentLoaded", () => {
    UpdateInstallationDetails();
    PopulateExistingConfigs();
    document.querySelector("#install").addEventListener("click", () => {
        fetch(`http://localhost:8080/api/setup/install/${installVersion}`).then((f) => {
            f.json().then(r => {
                console.log(r);
                if(r === true) {
                    alert("Installed successfully");
                    UpdateInstallationDetails();
                    AddErrorBox(undefined);
                } else if (r === false) {
                    AddErrorBox("Installation failed. Version could not be found in config or was the same as the current version.");
                } else {
                    if(confirm(`Warning(s):\n${r}\n\nConfirm to proceed with the installation anyways`)) {
                        fetch(`http://localhost:8080/api/setup/install/${installVersion}/force`).then((f2) => {
                            f2.json().then(r2 => {
                                console.log(r2);
                                if(r2 === true) {
                                    alert("Installed successfully");
                                    AddErrorBox(undefined);
                                    UpdateInstallationDetails();
                                } else {
                                    alert("Error while installing. Check the server's logs");
                                    UpdateInstallationDetails();
                                }
                            }, (e) => {
                                AddErrorBox(`Could not install as forced. Got error: ${e}`);
                                UpdateInstallationDetails();
                            });
                        }, (e) => {
                            AddErrorBox(`Could not install as forced. Got error: ${e}`);
                            UpdateInstallationDetails();
                        });
                    } else {
                        alert("Installation cancelled.");
                        AddErrorBox(undefined);
                        UpdateInstallationDetails();
                    }
                }
            }, (e) => {
                AddErrorBox(`Could not install. Got error: ${e}`);
                UpdateInstallationDetails();
            });
        }, (e) => {
            AddErrorBox(`Could not install. Got error: ${e}`);
            UpdateInstallationDetails();
        });
    });

    document.querySelector("#uninstall").addEventListener("click", () => {
        if(confirm("Please confirm: All tags currently on any artists or tracks will be removed. Exported playlists will not be deleted.")) {
            fetch(`http://localhost:8080/api/setup/uninstall`).then((f) => {
                alert("Uninstalled successfully");
                UpdateInstallationDetails();
                AddErrorBox(undefined);
            }, (e) => {
                AddErrorBox(`Could not uninstall. Got error: ${e}`);
            });
        }
    });

    document.querySelector("#version-selection").addEventListener("change", (e) => {
        installVersion = e.target.value;
    });

    document.querySelector("#db-config-info").addEventListener("click", () => {
        document.querySelector("#config-db-path").value = "C:/Users/{username}/AppData/Roaming/Dopamine/Dopamine.db";
    });

    document.querySelector("#mf-config-info").addEventListener("click", () => {
        document.querySelector("#config-mf-path").value = "C:/Users/{Username}/Music";
    });

    document.querySelector("#config-change").addEventListener("click", (e) => {
        e.preventDefault();
        SetConfigs();
    });
});

function UpdateInstallationDetails() {
    document.querySelector("#installed-info").style.display = "none";
    document.querySelector("#uninstalled-info").style.display = "none";
    fetch(`http://localhost:8080/api/setup/status`).then((f) => {
        f.json().then(r => {
            console.log(r);
            if(r.installed) {
                document.querySelector("#installed-info").style.display = "inline";
                document.querySelector("#uninstall").removeAttribute("disabled");
            }
            else {
                document.querySelector("#uninstalled-info").style.display = "inline";
                document.querySelector("#uninstall").setAttribute("disabled", null);
                document.querySelector("#uninstall").setAttribute("title", "Cannot uninstall again; already uninstalled");
            }

            document.querySelectorAll(".existing-version").forEach(e => {
                e.innerText = r.existingVersion;
            });
            document.querySelectorAll(".new-version").forEach(e => {
                e.innerText = r.presentVersion;
            });

            document.querySelector("#version-selection").innerHTML = ""; //remove any placeholder values
            for(let i = 0; i < r.allVersions.length; i++) {
                if(r.allVersions[i] == "0.0") continue;
                document.querySelector("#version-selection").appendChild(CreateVersionSelectionOption(r.allVersions[i], r.presentVersion, r.existingVersion));
            }
            
            const selectedOptionIndex = document.querySelector("#version-selection").selectedIndex;
            installVersion = document.querySelector(`#version-selection option:nth-child(${selectedOptionIndex + 1})`).value;
        });
    });
}

function CreateVersionSelectionOption(versionString, presentVersion, existingVersion) {
    var op = document.createElement("OPTION");
    op.innerText = `Version ${versionString}${(versionString == presentVersion ? " (Latest)" : "")}`;
    op.value = versionString;
    if(versionString == existingVersion) {
        op.setAttribute("disabled", null);
        op.setAttribute("title", "This version is already installed");
    }
    return op;
}

function PopulateExistingConfigs() {
    fetch(`http://localhost:8080/api/setup/configs/get`).then((f) => {
        f.json().then(r => {
            document.querySelector("#config-db-path").value = r.DatabaseLocation;
            document.querySelector("#config-mf-path").value = r.BaseFolderPath;
        });
    });
}

function SetConfigs() {
    const dbPath = document.querySelector("#config-db-path").value;
    const mfPath = document.querySelector("#config-mf-path").value;
    fetch(`http://localhost:8080/api/setup/configs/set/${encodeURIComponent(dbPath)}/${encodeURIComponent(mfPath)}`).then((f) => {
        f.json().then(r => {
            if(r) {
                alert("Saved configs successfully");
                navigation.reload();
            }
            else {
                alert("Error saving configs...");
            }            
        });
    });
}

function AddErrorBox(errorMessage) {
    const errorBox = document.querySelector(".error");
    if(errorMessage) {
        errorBox.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-diamond" viewBox="0 0 16 16">
        <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
        <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
        </svg> ${errorMessage}. Check that your configs are correct`;
    } else {
        errorBox.innerHTML = "";
    }
}