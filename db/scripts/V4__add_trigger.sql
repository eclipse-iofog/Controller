CREATE TRIGGER after_element_instance_update AFTER UPDATE ON element_instance
WHEN old.volume_mappings <> new.volume_mappings OR old.root_host_access <> new.root_host_access
BEGIN
  UPDATE element_instance
  SET need_update = 1
  WHERE UUID == old.UUID;
END;
