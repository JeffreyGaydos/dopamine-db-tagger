function SanitizeArtistName(raw) {
    let trimmed = raw.replaceAll(/^;|;$/g, "");
    let eachArtist = trimmed.split(";;");
    if(eachArtist.length === 1) {
        return trimmed;
    }
    if(eachArtist.length === 2) {
        eachArtist[eachArtist.length - 1] = "and " + eachArtist[eachArtist.length - 1];
        return eachArtist.join(" ");
    }
    if(eachArtist.length > 2) {
        eachArtist[eachArtist.length - 1] = "and " + eachArtist[eachArtist.length - 1];
        return eachArtist.join(", ");
    }
}