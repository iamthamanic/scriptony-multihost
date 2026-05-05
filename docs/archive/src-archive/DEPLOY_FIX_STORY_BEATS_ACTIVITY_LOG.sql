-- =====================================================
-- 🔧 FIX: Story Beats Activity Log Trigger
-- =====================================================
-- Problem: Der Trigger log_story_beats_activity() fügt
--          activity_logs ohne entity_type und entity_id ein
-- Fix:     entity_type='StoryBeat' und entity_id hinzufügen
-- =====================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS story_beats_activity_log ON public.story_beats;

-- Recreate the function with entity_type and entity_id
CREATE OR REPLACE FUNCTION log_story_beats_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_user_id UUID;
  v_action TEXT;
  v_details JSONB;
BEGIN
  -- Determine project_id and user_id
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
    v_user_id := OLD.user_id;
  ELSE
    v_project_id := NEW.project_id;
    v_user_id := NEW.user_id;
  END IF;

  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'beat_created';
    v_details := jsonb_build_object(
      'beat_id', NEW.id,
      'label', NEW.label,
      'template_abbr', NEW.template_abbr,
      'from_container_id', NEW.from_container_id,
      'to_container_id', NEW.to_container_id,
      'pct_from', NEW.pct_from,
      'pct_to', NEW.pct_to
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'beat_updated';
    v_details := jsonb_build_object(
      'beat_id', NEW.id,
      'label', NEW.label,
      'template_abbr', NEW.template_abbr,
      'changes', jsonb_build_object(
        'label', CASE WHEN OLD.label IS DISTINCT FROM NEW.label THEN jsonb_build_object('old', OLD.label, 'new', NEW.label) ELSE NULL END,
        'from_container_id', CASE WHEN OLD.from_container_id IS DISTINCT FROM NEW.from_container_id THEN jsonb_build_object('old', OLD.from_container_id, 'new', NEW.from_container_id) ELSE NULL END,
        'to_container_id', CASE WHEN OLD.to_container_id IS DISTINCT FROM NEW.to_container_id THEN jsonb_build_object('old', OLD.to_container_id, 'new', NEW.to_container_id) ELSE NULL END,
        'pct_from', CASE WHEN OLD.pct_from IS DISTINCT FROM NEW.pct_from THEN jsonb_build_object('old', OLD.pct_from, 'new', NEW.pct_from) ELSE NULL END,
        'pct_to', CASE WHEN OLD.pct_to IS DISTINCT FROM NEW.pct_to THEN jsonb_build_object('old', OLD.pct_to, 'new', NEW.pct_to) ELSE NULL END
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'beat_deleted';
    v_details := jsonb_build_object(
      'beat_id', OLD.id,
      'label', OLD.label,
      'template_abbr', OLD.template_abbr
    );
  END IF;

  -- Insert activity log WITH entity_type and entity_id
  INSERT INTO public.activity_logs (
    project_id,
    user_id,
    entity_type,
    entity_id,
    action,
    details
  ) VALUES (
    v_project_id,
    v_user_id,
    'StoryBeat',
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_details
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER story_beats_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.story_beats
  FOR EACH ROW
  EXECUTE FUNCTION log_story_beats_activity();

-- =====================================================
-- VERIFY
-- =====================================================
-- Test: Insert a beat and check the activity_log
-- SELECT * FROM activity_logs WHERE entity_type = 'StoryBeat' ORDER BY created_at DESC LIMIT 1;
