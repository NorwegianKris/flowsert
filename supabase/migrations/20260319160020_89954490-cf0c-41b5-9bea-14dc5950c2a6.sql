
ALTER TABLE public.data_processing_acknowledgements
  DROP CONSTRAINT IF EXISTS data_processing_acknowledgements_personnel_id_fkey;
ALTER TABLE public.data_processing_acknowledgements
  ADD CONSTRAINT data_processing_acknowledgements_personnel_id_fkey
  FOREIGN KEY (personnel_id) REFERENCES public.personnel(id) ON DELETE CASCADE;

ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_personnel_id_fkey
  FOREIGN KEY (personnel_id) REFERENCES public.personnel(id) ON DELETE CASCADE;
