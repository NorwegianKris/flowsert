-- Create personnel table to store worker data
CREATE TABLE public.personnel (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create availability table for worker availability dates
CREATE TABLE public.availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable', 'partial')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(personnel_id, date)
);

-- Enable RLS
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

-- Allow public read access for now (no auth yet)
CREATE POLICY "Allow public read access to personnel" 
ON public.personnel 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to personnel" 
ON public.personnel 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to personnel" 
ON public.personnel 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public read access to availability" 
ON public.availability 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to availability" 
ON public.availability 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to availability" 
ON public.availability 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete to availability" 
ON public.availability 
FOR DELETE 
USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_personnel_updated_at
BEFORE UPDATE ON public.personnel
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_availability_updated_at
BEFORE UPDATE ON public.availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert mock personnel data
INSERT INTO public.personnel (id, name, role, location, email, phone) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Erik Hansen', 'Senior Welder', 'Oslo, Norway', 'erik.hansen@company.no', '+47 912 34 567'),
  ('22222222-2222-2222-2222-222222222222', 'Maria Olsen', 'Electrical Technician', 'Stavanger, Norway', 'maria.olsen@company.no', '+47 923 45 678'),
  ('33333333-3333-3333-3333-333333333333', 'Anders Berg', 'Scaffolder', 'Bergen, Norway', 'anders.berg@company.no', '+47 934 56 789'),
  ('44444444-4444-4444-4444-444444444444', 'Ingrid Larsen', 'HSE Coordinator', 'Trondheim, Norway', 'ingrid.larsen@company.no', '+47 945 67 890'),
  ('55555555-5555-5555-5555-555555555555', 'Knut Pedersen', 'Crane Operator', 'Hammerfest, Norway', 'knut.pedersen@company.no', '+47 956 78 901');