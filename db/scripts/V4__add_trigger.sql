/********************************************************************************
 * Copyright (c) 2018 Edgeworx, Inc.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/

CREATE TRIGGER after_element_instance_update AFTER UPDATE ON element_instance
WHEN old.volume_mappings <> new.volume_mappings OR old.root_host_access <> new.root_host_access
BEGIN
  UPDATE element_instance
  SET need_update = 1
  WHERE UUID == old.UUID;
END;
