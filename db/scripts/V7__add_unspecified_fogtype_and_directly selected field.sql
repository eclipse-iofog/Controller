ALTER TABLE iofog_type ADD COLUMN DirectlySelection INTEGER DEFAULT 0;

INSERT INTO iofog_type VALUES (0, 'Unspecified', 'iointegrator0.png',
                                  'Unspecified device. Fog Type will be selected on provision',
                                  0, 0, 1, 3, 0, 0, 0, 2, 1);