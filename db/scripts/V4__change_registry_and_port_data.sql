UPDATE registry
SET is_public = 1, secure=null, user_name=null, password=null, user_email=null
WHERE id = 1;

UPDATE config
SET value = '54421'
WHERE key = 'port';