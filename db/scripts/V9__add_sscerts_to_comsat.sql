create table satellite_new
(
	ID INTEGER
		primary key
		 autoincrement,
	name TEXT,
	domain TEXT,
	public_ip TEXT,
	cert TEXT,
	self_signed_certs TINYINT(1),
	created_at DATETIME not null,
	updated_at DATETIME not null
);

INSERT INTO satellite_new (ID, name, domain, public_ip, cert, self_signed_certs, created_at, updated_at)
  SELECT ID, name, domain, public_ip, cert, 0, created_at, updated_at
  FROM satellite;

DROP TABLE satellite;

ALTER TABLE satellite_new RENAME TO satellite;