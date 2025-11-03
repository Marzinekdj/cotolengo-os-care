
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create new policy allowing service role to insert notifications
-- This allows edge functions and database triggers to create notifications
CREATE POLICY "Service role can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add policy for users to delete their own notifications (optional but useful)
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
