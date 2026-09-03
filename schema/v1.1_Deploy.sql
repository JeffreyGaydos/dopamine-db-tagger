--Adding "color" to the tag table, stored in HEX values #AABBCC since that's how the default color picker works in HTML.
ALTER TABLE Tags
ADD COLUMN Color VARCHAR(7);

DROP VIEW IF EXISTS TaggedAll;
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