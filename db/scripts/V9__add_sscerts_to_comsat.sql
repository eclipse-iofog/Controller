DROP TABLE satellite;

create table satellite
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