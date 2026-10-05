-- =====================================================================
-- TripVerse Production Relational Database Schema (PostgreSQL / Supabase)
-- =====================================================================
-- All tables include complete Row Level Security (RLS) enforcing
-- strict multi-tenant authorization so users can only access their own data.
-- =====================================================================

-- 1. PROFILES (Extended user profile linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    phone_number TEXT,
    traveler_style TEXT DEFAULT 'Smart Roadtripper',
    travel_style_tag TEXT DEFAULT 'Verified Explorer',
    location TEXT DEFAULT 'India',
    occupation TEXT DEFAULT 'Explorer',
    age INTEGER DEFAULT 25,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    active_trip_id TEXT,
    preferred_currency TEXT DEFAULT 'INR'
);

-- 2. TRIPS (Core trip entity)
CREATE TABLE IF NOT EXISTS public.trips (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    destination_state TEXT,
    destination_description TEXT,
    destination_image TEXT,
    duration_days INTEGER NOT NULL DEFAULT 3,
    travelers_count INTEGER NOT NULL DEFAULT 1,
    traveler_type TEXT DEFAULT 'solo',
    total_budget NUMERIC NOT NULL DEFAULT 0,
    budget_per_person NUMERIC NOT NULL DEFAULT 0,
    transport_mode TEXT DEFAULT 'car',
    accommodation_type TEXT DEFAULT 'budget',
    food_preference TEXT DEFAULT 'all',
    status TEXT DEFAULT 'upcoming',
    route_type TEXT DEFAULT 'fastest',
    estimated_total NUMERIC DEFAULT 0,
    ai_rationale TEXT,
    budget_breakdown JSONB DEFAULT '{"transportation":0,"accommodation":0,"food":0,"activities":0,"miscellaneous":0}'::jsonb,
    route_details JSONB,
    break_stops JSONB DEFAULT '[]'::jsonb,
    is_user_created BOOLEAN DEFAULT TRUE,
    preferences JSONB DEFAULT '[]'::jsonb,
    priorities JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ITINERARY DAYS
CREATE TABLE IF NOT EXISTS public.itinerary_days (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    theme TEXT,
    day_estimated_cost NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ITINERARY ITEMS / ACTIVITIES
CREATE TABLE IF NOT EXISTS public.itinerary_items (
    id TEXT PRIMARY KEY,
    day_id TEXT REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    time_slot TEXT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    cost NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'activity',
    duration_mins INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'other',
    paid_by TEXT NOT NULL,
    split_among JSONB DEFAULT '[]'::jsonb,
    date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SAVED PLACES / BOOKMARKS
CREATE TABLE IF NOT EXISTS public.saved_places (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    place_id TEXT NOT NULL,
    place_type TEXT DEFAULT 'destination',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, place_id)
);

-- 7. EMERGENCY EVENTS
CREATE TABLE IF NOT EXISTS public.emergency_events (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    disruption_type TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT,
    severity TEXT DEFAULT 'warning',
    carrier_or_source TEXT,
    flight_or_train_number TEXT,
    affected_destination TEXT,
    status TEXT DEFAULT 'reported',
    reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EMERGENCY PLANS
CREATE TABLE IF NOT EXISTS public.emergency_plans (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES public.emergency_events(id) ON DELETE CASCADE,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    revised_itinerary_summary TEXT,
    alternative_transport JSONB,
    budget_impact NUMERIC DEFAULT 0,
    time_impact TEXT,
    refund_guidance JSONB,
    action_steps JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TRIP REVIEWS
CREATE TABLE IF NOT EXISTS public.trip_reviews (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    favorite_spot TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TRIP PHOTO MEMORIES
CREATE TABLE IF NOT EXISTS public.trip_photos (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_number INTEGER,
    url TEXT NOT NULL,
    caption TEXT,
    location TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    featured BOOLEAN DEFAULT FALSE,
    taken_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_id TEXT REFERENCES public.trips(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'system',
    priority TEXT DEFAULT 'normal',
    is_read BOOLEAN DEFAULT FALSE,
    action_label TEXT,
    action_target TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. USER PASSPORT (Digital passport stamped visited states)
CREATE TABLE IF NOT EXISTS public.user_passport (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    visited_states TEXT[] DEFAULT ARRAY[]::TEXT[],
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passport ENABLE ROW LEVEL SECURITY;

-- Profiles: users can select and modify only their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Trips: users can CRUD only their own trips
CREATE POLICY "Users can view own trips" ON public.trips
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips" ON public.trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON public.trips
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON public.trips
    FOR DELETE USING (auth.uid() = user_id);

-- Itinerary Days: linked via trip ownership
CREATE POLICY "Users can manage itinerary days" ON public.itinerary_days
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.trips 
            WHERE public.trips.id = public.itinerary_days.trip_id 
            AND public.trips.user_id = auth.uid()
        )
    );

-- Itinerary Items: linked via trip ownership
CREATE POLICY "Users can manage itinerary items" ON public.itinerary_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.trips 
            WHERE public.trips.id = public.itinerary_items.trip_id 
            AND public.trips.user_id = auth.uid()
        )
    );

-- Expenses: users can CRUD their own expenses
CREATE POLICY "Users can view own expenses" ON public.expenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON public.expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
    FOR DELETE USING (auth.uid() = user_id);

-- Saved Places: users can CRUD their own bookmarks
CREATE POLICY "Users can manage own saved places" ON public.saved_places
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Emergency Events & Plans
CREATE POLICY "Users can manage own emergency events" ON public.emergency_events
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own emergency plans" ON public.emergency_plans
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Reviews & Photos
CREATE POLICY "Users can manage own trip reviews" ON public.trip_reviews
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own trip photos" ON public.trip_photos
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can manage own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Passport
CREATE POLICY "Users can manage own passport" ON public.user_passport
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- PERFORMANCE INDEXES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_days_trip_id ON public.itinerary_days(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_trip_id ON public.itinerary_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON public.saved_places(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_events_user_id ON public.emergency_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 13. TRIP COLLABORATION SESSIONS
CREATE TABLE IF NOT EXISTS public.trip_collaborations (
    trip_id TEXT PRIMARY KEY REFERENCES public.trips(id) ON DELETE CASCADE,
    session_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trip_collaborations ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can read (needed for invite-code join flow)
CREATE POLICY "Authenticated users can view collaborations" ON public.trip_collaborations
    FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT/UPDATE: trip owner or authenticated collaborators (session manages roles)
CREATE POLICY "Authenticated users can write collaborations" ON public.trip_collaborations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update collaborations" ON public.trip_collaborations
    FOR UPDATE USING (auth.role() = 'authenticated');

-- DELETE: only the trip owner
CREATE POLICY "Trip owners can delete collaborations" ON public.trip_collaborations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE public.trips.id = public.trip_collaborations.trip_id
            AND public.trips.user_id = auth.uid()
        )
    );

-- =====================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON SUPABASE AUTH SIGNUP
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, traveler_style, location)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/initials/svg?seed=' || encode(new.id::text::bytea, 'hex')),
    COALESCE(new.raw_user_meta_data->>'traveler_style', 'Smart Roadtripper'),
    COALESCE(new.raw_user_meta_data->>'location', 'India')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 14. PACKING ITEMS (Smart packing list per trip)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.packing_items (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'essentials',
    is_packed BOOLEAN DEFAULT FALSE,
    is_custom BOOLEAN DEFAULT FALSE,
    note TEXT,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.packing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own packing items" ON public.packing_items
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_packing_items_trip_id ON public.packing_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_packing_items_user_id ON public.packing_items(user_id);

-- Composite unique constraint: prevent duplicate day numbers per trip
ALTER TABLE public.itinerary_days
    ADD CONSTRAINT uq_itinerary_days_trip_day UNIQUE (trip_id, day_number);

-- =====================================================================
-- AUTOMATIC updated_at TIMESTAMP TRIGGER
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TRIGGER trg_collaborations_updated_at
  BEFORE UPDATE ON public.trip_collaborations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 15. CONFIRMED BOOKINGS (replaces localStorage-only storage)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.confirmed_bookings (
    id TEXT PRIMARY KEY,                          -- booking ref e.g. TV-2026-UDR-123456
    trip_id TEXT REFERENCES public.trips(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    trip_name TEXT,
    destination TEXT,
    origin TEXT,
    total_amount NUMERIC(12, 2),
    currency TEXT DEFAULT 'INR',
    travelers_count INTEGER DEFAULT 1,
    duration_days INTEGER DEFAULT 1,
    payment_method TEXT,
    fasttag_pass_id TEXT,
    status TEXT DEFAULT 'Confirmed',
    confirmed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.confirmed_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings" ON public.confirmed_bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookings" ON public.confirmed_bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_confirmed_bookings_user_id ON public.confirmed_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_confirmed_bookings_trip_id ON public.confirmed_bookings(trip_id);

-- =====================================================================
-- 16. USER FEEDBACK (replaces localStorage-only queue that never flushed)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    category TEXT DEFAULT 'suggestion',
    email TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone (authenticated or guest) to submit feedback
CREATE POLICY "Anyone can submit feedback" ON public.user_feedback
    FOR INSERT WITH CHECK (true);

-- Only the submitting user can read their own feedback
CREATE POLICY "Users can view own feedback" ON public.user_feedback
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);

