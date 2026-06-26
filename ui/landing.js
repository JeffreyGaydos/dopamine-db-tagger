window.addEventListener("DOMContentLoaded", () => {
    DisplayArtistDropdowns(JSON.parse(document.querySelector("#response").innerHTML));
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