-- Enable Row Level Security (RLS) is good practice, but for this migration to perform 
-- exactly like the Google Sheet (public read/write), we will create permissive policies.

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write users" ON public.users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
    id INTEGER PRIMARY KEY,
    text TEXT NOT NULL,
    section TEXT NOT NULL,
    options JSONB, -- Stores the array of options ["Yes", "No"]
    correct_answer TEXT, -- Nullable, updated by Admin
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read questions" ON public.questions
    FOR SELECT
    USING (true);

-- Only Admin should technically write, but for now we allow public 
-- (Client logic handles the auth check via password locally, securing the write is a v2 step)
CREATE POLICY "Allow public write questions" ON public.questions
    FOR INSERT
    WITH CHECK (true);
    
CREATE POLICY "Allow public update questions" ON public.questions
    FOR UPDATE
    USING (true);

-- 3. ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT REFERENCES public.users(email),
    question_id INTEGER REFERENCES public.questions(id),
    answer TEXT, 
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_email, question_id) -- One answer per question per user
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write answers" ON public.answers
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. SETTINGS TABLE (Global Lock, etc.)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write settings" ON public.settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- INITIAL SEED DATA
INSERT INTO public.settings (key, value) VALUES ('is_locked', 'false') ON CONFLICT DO NOTHING;
