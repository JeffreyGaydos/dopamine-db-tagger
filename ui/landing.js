window.addEventListener("DOMContentLoaded", () => {
    DisplayArtistDropdowns(JSON.parse(document.querySelector("#response").innerHTML));
    Landing_AddHandlers();
});

function DisplayArtistDropdowns(json, max=-1) {
    const inTaggingBase = "./tagging/";
    const outputElement = document.querySelector('#artist-list');
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
        console.log(`Searching for track "${queryString}" (${encodeURI(queryString)})`);
        fetch(`http://localhost:8080/api/search/tracks/${encodeURI(queryString)}`).then((f) => {
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
            });
        });
    });
}