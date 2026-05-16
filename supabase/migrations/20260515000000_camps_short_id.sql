ALTER TABLE camps ADD COLUMN short_id text UNIQUE;

UPDATE camps
SET short_id = lower(substring(md5(id::text || random()::text) for 8))
WHERE short_id IS NULL;

ALTER TABLE camps ALTER COLUMN short_id SET NOT NULL;

CREATE UNIQUE INDEX camps_short_id_idx ON camps (short_id);
