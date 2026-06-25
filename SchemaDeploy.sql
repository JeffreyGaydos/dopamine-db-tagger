CREATE TABLE IF NOT EXISTS Tags
(
    TagName TEXT,
    CreatedDate DATE DEFAULT(CURRENT_TIMESTAMP),
    PRIMARY KEY(TagName)
);


CREATE TABLE IF NOT EXISTS TaggedTracks
(
    TagName TEXT,
    TrackID INTEGER,
    CreatedDate DATE DEFAULT(CURRENT_TIMESTAMP),
    FOREIGN KEY(TagName) REFERENCES Tags(TagName)
);

CREATE TABLE IF NOT EXISTS TaggedArtists
(
    TagName TEXT,
    ArtistName TEXT,
    CreatedDate DATE DEFAULT(CURRENT_TIMESTAMP),
    FOREIGN KEY(TagName) REFERENCES Tags(TagName)
);

CREATE VIEW IF NOT EXISTS TaggedAll
(
    TagName,
    TrackID
)
AS
SELECT TA.TagName, T.TrackID FROM TaggedArtists TA
JOIN Track T ON T.Artists LIKE CONCAT('%;', TA.ArtistName, ';%')
UNION
SELECT TagName, TrackID FROM TaggedTracks