--Adding "color" to the tag table, stored in HEX values #AABBCC since that's how the default color picker works in HTML.
ALTER TABLE Tags
ADD COLUMN Color VARCHAR(7);