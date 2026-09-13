CREATE TABLE IF NOT EXISTS Tags
(
    TagName TEXT,
    CreatedDate DATE DEFAULT(CURRENT_TIMESTAMP),
    Color VARCHAR(7),
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
    Color,
    TrackID,
    IsArtistTag
)
AS
SELECT TA.TagName, TAG.Color, T.TrackID, 1 AS IsArtistTag FROM TaggedArtists TA
JOIN Track T ON T.Artists LIKE CONCAT('%;', TA.ArtistName, ';%')
JOIN Tags TAG ON TAG.TagName = TA.TagName
UNION
SELECT TT.TagName, TAG.Color, TT.TrackID, 0 AS IsArtistTag FROM TaggedTracks TT
JOIN Tags TAG ON TAG.TagName = TT.TagName
;

CREATE TABLE IF NOT EXISTS DBTaggerInfo (
    InfoName TEXT,
    InfoValue TEXT
);