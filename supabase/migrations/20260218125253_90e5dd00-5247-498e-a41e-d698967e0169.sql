
-- Add CHECK constraints to project_messages for data integrity
ALTER TABLE public.project_messages
ADD CONSTRAINT project_messages_sender_role_check
CHECK (sender_role IN ('admin', 'worker'));

ALTER TABLE public.project_messages
ADD CONSTRAINT project_messages_content_not_empty
CHECK (length(trim(content)) > 0);

ALTER TABLE public.project_messages
ADD CONSTRAINT project_messages_sender_name_not_empty
CHECK (length(trim(sender_name)) > 0);
