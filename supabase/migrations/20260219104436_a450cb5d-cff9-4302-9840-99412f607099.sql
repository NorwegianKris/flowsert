
-- Table: worker_groups
CREATE TABLE public.worker_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

-- Table: personnel_worker_groups (junction)
CREATE TABLE public.personnel_worker_groups (
  personnel_id uuid NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  worker_group_id uuid NOT NULL REFERENCES public.worker_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (personnel_id, worker_group_id)
);

-- Indexes
CREATE INDEX worker_groups_business_id_idx ON public.worker_groups (business_id);
CREATE INDEX personnel_worker_groups_worker_group_id_idx ON public.personnel_worker_groups (worker_group_id);
CREATE INDEX personnel_worker_groups_personnel_id_idx ON public.personnel_worker_groups (personnel_id);

-- updated_at trigger for worker_groups
CREATE TRIGGER update_worker_groups_updated_at
  BEFORE UPDATE ON public.worker_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: worker_groups
ALTER TABLE public.worker_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select worker groups"
  ON public.worker_groups FOR SELECT
  USING (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert worker groups"
  ON public.worker_groups FOR INSERT
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update worker groups"
  ON public.worker_groups FOR UPDATE
  USING (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete worker groups"
  ON public.worker_groups FOR DELETE
  USING (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- RLS: personnel_worker_groups
ALTER TABLE public.personnel_worker_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select personnel worker groups"
  ON public.personnel_worker_groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM worker_groups wg
    WHERE wg.id = personnel_worker_groups.worker_group_id
      AND wg.business_id = get_user_business_id(auth.uid())
      AND has_role(auth.uid(), 'admin')
  ));

CREATE POLICY "Admins can insert personnel worker groups"
  ON public.personnel_worker_groups FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM worker_groups wg
    WHERE wg.id = personnel_worker_groups.worker_group_id
      AND wg.business_id = get_user_business_id(auth.uid())
      AND has_role(auth.uid(), 'admin')
  ));

CREATE POLICY "Admins can delete personnel worker groups"
  ON public.personnel_worker_groups FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM worker_groups wg
    WHERE wg.id = personnel_worker_groups.worker_group_id
      AND wg.business_id = get_user_business_id(auth.uid())
      AND has_role(auth.uid(), 'admin')
  ));
