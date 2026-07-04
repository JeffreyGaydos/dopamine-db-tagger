window.addEventListener("DOMContentLoaded", () => {
    DisplayArtistDropdowns(JSON.parse(document.querySelector("#response").innerHTML));
    Landing_AddHandlers();
});

function DisplayArtistDropdowns(json, max=-1) {
    const inTaggingBase = "./tagging/";
    const outputElement = document.querySelector('#artist-list');
    if(json.length == 0) {
        const warningElement = document.createElement("DIV");
        warningElement.classList.add("error");
        warningElement.innerHTML += `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-diamond" viewBox="0 0 16 16">
  <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
</svg> No Artists Found. It's likely you have not setup your configs correctly. Please navigate to the <a href="/ui/setup.html">Setup Page</a> to modify configs and install the database schema.`;
        outputElement.appendChild(warningElement);
    }
    let i = 0;
    json.forEach(ag => {
        if(i < max || max === -1) {
            const detail = document.createElement("DETAILS");
            const summary = document.createElement("SUMMARY");
            const artistLink = document.createElement("A");
            artistLink.href = inTaggingBase + ag.Tracks[0].TrackID;
            artistLink.innerHTML = SanitizeArtistName(ag.ArtistsRaw);
            const trackList = document.createElement("UL");
            ag.Tracks.forEach(t => {
                const track = document.createElement("LI");
                const trackLink = document.createElement("A");
                trackLink.href = inTaggingBase + t.TrackID;
                trackLink.innerText = t.TitleRaw;
                track.appendChild(trackLink);
                trackList.appendChild(track);
            });
            summary.appendChild(artistLink);
            detail.appendChild(summary);
            detail.appendChild(trackList);
            outputElement.appendChild(detail);
            i++;
        }
    });
}

function Landing_AddHandlers() {
    document.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const queryString = document.querySelector("#start-track").value;
        if(queryString == "") return;
        console.log(`Searching for track "${queryString}" (${encodeURIComponent(queryString)})`);
            fetch(`http://localhost:8080/api/search/tracks/${encodeURIComponent(queryString)}`).then((f) => {
                f.json().then(r => {
                    const srBox = document.querySelector("#search-results-box");
                    srBox.innerHTML = ""; //clear existing results

                    if(r.length === 0) {
                        const errorMessage = document.createElement("P");
                        errorMessage.innerText = "No Results. This search looks for exact matches by TrackID, Title, or FileName, then substrings on Title or Path, but not mispellings";
                        srBox.appendChild(errorMessage);
                    }
                    r.forEach(sr => {
                        const link = document.createElement("A");
                        link.innerText = `${sr.TitleRaw}`;
                        link.href = `http://localhost:8080/ui/tagging/${sr.TrackID}`;
                        
                        const li = document.createElement("LI");
                        li.appendChild(link);
                        li.innerHTML += ` (${SanitizeArtistName(sr.ArtistsRaw == "" ? "Unknown Artist" : sr.ArtistsRaw)})`;
                        srBox.appendChild(li);
                    })
                }, (e) => {
                    console.log(e);
                    document.querySelector("#search-results-box").innerHTML += `<div class="error"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-diamond" viewBox="0 0 16 16">
        <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
        <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
        </svg> Error during search: "${e}". It's likely you have not setup your configs correctly. Please navigate to the <a href="/ui/setup.html">Setup Page</a> to modify configs and install the database schema.</div>`;
                });
            });
    });
}