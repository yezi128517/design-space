-- Design works the site curates by hand and from award winners' own pages: one row per work, with the
-- link back to its source and, where the source publishes one, its film. Images are proxied, never copied.
CREATE TABLE showcase_works (
  id            text PRIMARY KEY,
  title         text NOT NULL,
  designer      text,
  category      text NOT NULL CHECK (category IN ('产品', '交互', '平面', '空间', '服务', '影像')),
  award         text,
  year          integer,
  source_name   text NOT NULL,
  url           text NOT NULL UNIQUE,
  video_url     text,
  image_url     text,
  summary       text,
  published_at  timestamptz,
  visible       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);