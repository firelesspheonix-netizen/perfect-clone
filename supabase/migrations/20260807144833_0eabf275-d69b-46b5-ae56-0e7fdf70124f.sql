CREATE TABLE public.generation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  characters JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  image_data TEXT NOT NULL,
  prompt TEXT NOT NULL,
  settings JSONB NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_history TO anon, authenticated;
GRANT ALL ON public.generation_history TO service_role;
ALTER TABLE public.generation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to generation_history" ON public.generation_history FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'studio-assets');
CREATE POLICY "Allow uploads" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'studio-assets');
CREATE POLICY "Allow deletes" ON storage.objects FOR DELETE TO public USING (bucket_id = 'studio-assets');

CREATE TABLE public.character_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  face_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.character_presets TO anon, authenticated;
GRANT ALL ON public.character_presets TO service_role;
ALTER TABLE public.character_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to character_presets" ON public.character_presets FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.pose_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pose_presets TO anon, authenticated;
GRANT ALL ON public.pose_presets TO service_role;
ALTER TABLE public.pose_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to pose_presets" ON public.pose_presets FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.clothing_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clothing_presets TO anon, authenticated;
GRANT ALL ON public.clothing_presets TO service_role;
ALTER TABLE public.clothing_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to clothing_presets" ON public.clothing_presets FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.background_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.background_presets TO anon, authenticated;
GRANT ALL ON public.background_presets TO service_role;
ALTER TABLE public.background_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to background_presets" ON public.background_presets FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.settings_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  characters JSONB NOT NULL,
  settings JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings_presets TO anon, authenticated;
GRANT ALL ON public.settings_presets TO service_role;
ALTER TABLE public.settings_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to settings_presets" ON public.settings_presets FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.face_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_presets TO anon, authenticated;
GRANT ALL ON public.face_presets TO service_role;
ALTER TABLE public.face_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to face_presets" ON public.face_presets FOR ALL TO public USING (true) WITH CHECK (true);