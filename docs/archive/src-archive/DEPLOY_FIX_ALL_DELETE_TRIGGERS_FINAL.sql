-- =====================================================
-- 🚨 FINAL FIX: All DELETE Triggers for Activity Logs
-- 📅 Created: 2025-11-09
-- 🎯 Purpose: Fix ALL DELETE triggers, not just projects
-- =====================================================
--
-- ROOT CAUSE:
-- Wenn ein Projekt gelöscht wird:
-- 1. CASCADE löscht timeline_nodes, shots, characters
-- 2. DEREN DELETE-Trigger versuchen Activity Logs zu erstellen
-- 3. Aber project_id existiert nicht mehr → FK Error!
--
-- LÖSUNG:
-- Skip DELETE logging für ALLE Tabellen (projects, timeline_nodes, shots, characters)
-- CASCADE deletion entfernt alle Logs automatisch
-- =====================================================

-- 1. PROJECTS: Skip DELETE (bereits in vorheriger Migration)
CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action VARCHAR(10);
  v_changes JSONB;
BEGIN
  v_user_id := auth.uid();
  
  -- ⚠️ Skip DELETE
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  
  IF (TG_OP = 'INSERT') THEN
    v_action := 'CREATE';
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
  END IF;
  
  IF (TG_OP = 'UPDATE') THEN
    v_changes := jsonb_build_object(
      'old', jsonb_build_object('title', OLD.title, 'genre', OLD.genre),
      'new', jsonb_build_object('title', NEW.title, 'genre', NEW.genre)
    );
  ELSE
    v_changes := jsonb_build_object('title', NEW.title, 'type', NEW.type);
  END IF;
  
  INSERT INTO activity_logs (user_id, project_id, action, entity_type, entity_id, details)
  VALUES (v_user_id, NEW.id, v_action, 'Project', NEW.id, v_changes);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TIMELINE NODES: Skip DELETE
CREATE OR REPLACE FUNCTION log_timeline_node_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action VARCHAR(10);
  v_entity_type VARCHAR(50);
  v_changes JSONB;
BEGIN
  v_user_id := auth.uid();
  
  -- ⚠️ Skip DELETE (CASCADE will delete logs anyway)
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  
  IF (TG_OP = 'INSERT') THEN
    v_action := 'CREATE';
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
  END IF;
  
  v_entity_type := CASE 
    WHEN COALESCE(NEW.level, OLD.level) = 1 THEN 'Act'
    WHEN COALESCE(NEW.level, OLD.level) = 2 THEN 'Sequence'
    WHEN COALESCE(NEW.level, OLD.level) = 3 THEN 'Scene'
    ELSE 'Node'
  END;
  
  IF (TG_OP = 'UPDATE') THEN
    v_changes := jsonb_build_object(
      'old', jsonb_build_object('title', OLD.title, 'description', OLD.description),
      'new', jsonb_build_object('title', NEW.title, 'description', NEW.description)
    );
  ELSE
    v_changes := jsonb_build_object('title', NEW.title, 'level', NEW.level);
  END IF;
  
  INSERT INTO activity_logs (user_id, project_id, action, entity_type, entity_id, details)
  VALUES (v_user_id, COALESCE(NEW.project_id, OLD.project_id), v_action, v_entity_type, COALESCE(NEW.id, OLD.id), v_changes);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. SHOTS: Skip DELETE
CREATE OR REPLACE FUNCTION log_shot_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action VARCHAR(10);
  v_changes JSONB;
  v_project_id UUID;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id, auth.uid());
  
  -- ⚠️ Skip DELETE (CASCADE will delete logs anyway)
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  
  IF (TG_OP = 'INSERT') THEN
    v_action := 'CREATE';
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
  END IF;
  
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  
  IF (TG_OP = 'UPDATE') THEN
    v_changes := jsonb_build_object(
      'old', jsonb_build_object('shot_number', OLD.shot_number, 'description', OLD.description, 'camera_angle', OLD.camera_angle),
      'new', jsonb_build_object('shot_number', NEW.shot_number, 'description', NEW.description, 'camera_angle', NEW.camera_angle)
    );
  ELSE
    v_changes := jsonb_build_object('shot_number', NEW.shot_number, 'description', NEW.description);
  END IF;
  
  INSERT INTO activity_logs (user_id, project_id, action, entity_type, entity_id, details)
  VALUES (v_user_id, v_project_id, v_action, 'Shot', COALESCE(NEW.id, OLD.id), v_changes);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CHARACTERS: Skip DELETE
CREATE OR REPLACE FUNCTION log_character_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action VARCHAR(10);
  v_changes JSONB;
  v_project_id UUID;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id, auth.uid());
  
  -- ⚠️ Skip DELETE (CASCADE will delete logs anyway)
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  
  IF (TG_OP = 'INSERT') THEN
    v_action := 'CREATE';
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
  END IF;
  
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  
  IF (TG_OP = 'UPDATE') THEN
    v_changes := jsonb_build_object(
      'old', jsonb_build_object('name', OLD.name, 'description', OLD.description),
      'new', jsonb_build_object('name', NEW.name, 'description', NEW.description)
    );
  ELSE
    v_changes := jsonb_build_object('name', NEW.name, 'description', NEW.description);
  END IF;
  
  INSERT INTO activity_logs (user_id, project_id, action, entity_type, entity_id, details)
  VALUES (v_user_id, v_project_id, v_action, 'Character', COALESCE(NEW.id, OLD.id), v_changes);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ FINAL FIX DEPLOYED!';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Alle DELETE Trigger aktualisiert:';
  RAISE NOTICE '  1. log_project_changes() - Skip DELETE';
  RAISE NOTICE '  2. log_timeline_node_changes() - Skip DELETE';
  RAISE NOTICE '  3. log_shot_changes() - Skip DELETE';
  RAISE NOTICE '  4. log_character_changes() - Skip DELETE';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Warum: CASCADE löscht Child-Records → deren DELETE-Trigger';
  RAISE NOTICE '         würden FK-Fehler verursachen (Projekt existiert nicht mehr)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Activity Logs werden durch CASCADE automatisch gelöscht!';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test jetzt: Projekt löschen sollte funktionieren!';
  RAISE NOTICE '';
END $$;
