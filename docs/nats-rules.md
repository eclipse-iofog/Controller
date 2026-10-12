# NatsAccountRule and NatsUserRule


| Kind | Binds to | Signed into |
|---|---|---|
| `NatsAccountRule` | Application `spec.natsConfig.natsRule` | Account JWT (`limits`, `default_permissions`, imports/exports) |
| `NatsUserRule` | Microservice `spec.natsConfig.natsRule` | User JWT (permissions, limits, connection constraints) |

The static server block in [NATS `authorization`](https://docs.nats.io/reference/config/authorization/) (`username`, `password`, `token`, `users`, `timeout`, `auth_callout`) is a different mechanism. Controller does not emit that block from these kinds. Overlap is called out per field below.

`apiVersion` is not validated for these two kinds. `metadata.name` is the rule name (1–255 characters). `metadata` and `spec` are required.

---

## Upload

Multipart file field names:

| Action | Method and path | Form field |
|---|---|---|
| Create account rule | `POST /api/v3/nats/account-rules/yaml` | `natsAccountRule` |
| Update account rule | `PATCH /api/v3/nats/account-rules/yaml/{ruleName}` | `natsAccountRule` |
| Create user rule | `POST /api/v3/nats/user-rules/yaml` | `natsUserRule` |
| Update user rule | `PATCH /api/v3/nats/user-rules/yaml/{ruleName}` | `natsUserRule` |

On update, `metadata.name` must equal `{ruleName}`. JSON equivalents are `POST` and `PATCH` on `/api/v3/nats/account-rules` and `/api/v3/nats/user-rules` (no `kind` wrapper; body is the payload, including `name`).

Create returns **201**. Update returns **200** immediately and reissues affected JWTs in the background. Delete returns **204**, rebinds consumers to the default rule, and reissues in the background.

Reserved names are immutable (create, update, and delete return **400**):

| Kind | Reserved names | Role |
|---|---|---|
| Account | `default-system-account` | System account |
| Account | `default-account` | Application default when `natsRule` is omitted |
| Account | `controller-account` | Controller relay account |
| User | `default-user` | Microservice default. `STANDARD` + `WEBSOCKET`, not bearer, limits `-1` |
| User | `default-mqtt-user` | MQTT bearer user. `MQTT` + `STANDARD` |
| User | `default-leaf-user` | Leaf connection. `LEAFNODE` + `WEBSOCKET` |
| User | `controller-user` | Pub/sub only `controller.relay.v1.>` |

Strings that land in a JWT must be Latin-1 (ASCII is safe). A character above U+00FF on `description`, subjects, tags, imports/exports, `src`, `times`, or `timesLocation` is a **400**.

---

## How to attach a rule

```yaml
apiVersion: iofog.org/v3
kind: Application
metadata:
  name: orders
spec:
  natsConfig:
    natsAccess: true
    natsRule: orders-account   # NatsAccountRule metadata.name; default default-account
```

```yaml
apiVersion: iofog.org/v3
kind: Application
metadata:
  name: orders
spec:
  natsConfig:
    natsAccess: true
    natsRule: orders-account   # NatsAccountRule metadata.name; default default-account
  microservices:
    - name: checkout
      natsConfig:
        natsAccess: true
        natsRule: checkout-user # NatsUserRule metadata.name; default default-user

    
```

```yaml
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: checkout  # or orders/checkout
spec:
  application: orders  # when it is omitted metadata.name should be in an appName/microserviceName form
  natsConfig:
    natsAccess: true
    natsRule: checkout-user    # NatsUserRule metadata.name; default default-user
```

Microservice YAML also accepts `natsEnabled` as an alias of `natsConfig.natsAccess`.

---

## NatsAccountRule


```yaml
apiVersion: iofog.org/v3
kind: NatsAccountRule
metadata:
  name: orders-account
spec:
  description: Orders application account
  infoUrl: https://example.com/orders

  # Account limits. -1 = unlimited. Same meaning as nsc edit account.
  maxConnections: -1            # --conns          JWT limits.conn
  maxLeafNodeConnections: -1    # --leaf-conns     JWT limits.leaf
  maxSubscriptions: -1          # --subscriptions  JWT limits.subs
  maxData: -1                   # --data           JWT limits.data (bytes)
  maxMsgPayload: 1m             # --payload        JWT limits.payload (bytes)
  maxImports: -1                # --imports        count limit, not the import list
  maxExports: -1                # --exports        count limit, not the export list
  exportsAllowWildcards: true   # --wildcard-exports (nsc default true)
  disallowBearer: false         # --disallow-bearer

  # JetStream. -1 unlimited, 0 disables that store. nsc --js-* flags.
  memStorage: -1                # --js-mem-storage
  diskStorage: 10g              # --js-disk-storage
  streams: -1                   # --js-streams
  consumer: -1                  # --js-consumer
  maxAckPending: -1             # --js-max-ack-pending
  memMaxStreamBytes: -1         # --js-max-mem-stream
  diskMaxStreamBytes: -1        # --js-max-disk-stream
  maxBytesRequired: false       # --js-max-bytes-required

  # Optional per-tier JetStream map. nsc --js-tier / tiered_limits.
  # tieredLimits:
  #   "0":
  #     mem_storage: -1
  #     disk_storage: -1

  # Default permissions for users in this account who do not set their own.
  # nsc add/edit account --allow-pub / --deny-pub / --allow-sub / --deny-sub.
  pubAllow:
    - "orders.>"
  pubDeny:
    - "orders.secret"
  subAllow:
    - "orders.>"
  subDeny: []

  # Reply-subject publish permission. nsc --allow-pub-response / --response-ttl.
  # respTtl is nanoseconds (5s = 5000000000). Omit both to leave response perms unset.
  respMax: 1
  respTtl: 5000000000

  exports:
    - name: orders-stream  # A human-readable name for this export.
      subject: "orders.>"  # The subject being exported.
      type: stream         # The type of export, either ‘stream’ or ‘service’.
      description: Order events  # description
      info_url: https://example.com/orders  # URL to find extra info.
      # token_req: false   # Indicates if an activation token is required for imports.
      # account_token_position: 2 # If set, references the position of an account token in a wildcard subject (public exports only).
  imports:
    - name: billing-stream  # A human-readable name for this import.
      subject: "billing.>"  # The subject being imported from the exporting account. 
      type: stream # The type of import, either ‘stream’ or ‘service’.
      account: billing-account-public-key  # The public account key from which this subject is imported.
      local_subject: "billing.>"  # The local subject name to map the imported subject to, potentially using wildcard references.
      # token: '' # An activation token enabling the import. May be optional.
```

Accepted account aliases (do not mix with the camelCase fields above for the same value):
```yaml
spec:
  info_url: https://example.com/orders
  limits:
    conn: -1
    leaf: -1
    data: -1
    payload: -1
    subs: -1
    imports: -1
    exports: -1
    wildcards: true
    disallow_bearer: false
    mem_storage: -1
    disk_storage: -1
    streams: -1
    consumer: -1
    max_ack_pending: -1
    mem_max_stream_bytes: -1
    disk_max_stream_bytes: -1
    max_bytes_required: false
  default_permissions:
    pub:
      allow: ["orders.>"]
      deny: ["orders.secret"]
    sub:
      allow: ["orders.>"]
      deny: []
    resp:
      max: 1
      ttl: 5000000000
  tiered_limits: {}
```

Byte fields accept an integer, `-1`, or a 1024-based suffix string: `1k`, `100m`, `1g`, `1t` (single letter only; `10mb` is rejected). Fields: `maxData`, `maxMsgPayload`, `memStorage`, `diskStorage`, `memMaxStreamBytes`, `diskMaxStreamBytes`.

Setting any JetStream field causes the signer to copy the whole JetStream limit group. Set the group together and use `-1` for the ones you want unlimited.

---

##  NatsUserRule

```yaml
apiVersion: iofog.org/v3
kind: NatsUserRule
metadata:
  name: checkout-user
spec:
  description: Checkout service user

  # User limits. -1 = unlimited. nsc edit user --subs / --data / --payload.
  maxSubscriptions: -1          # --subs
  maxData: -1                   # --data (bytes)
  maxPayload: 1m                # --payload (bytes)

  # nsc add user --bearer. No connect challenge. Used for MQTT.
  bearerToken: false

  # User JWT proxy_required. Connection must carry a PROXY protocol header.
  proxyRequired: false

  # nsc edit user --conn-type. Exact tokens:
  # STANDARD, WEBSOCKET, LEAFNODE, LEAFNODE_WS, MQTT, MQTT_WS, IN_PROCESS
  allowedConnectionTypes:
    - STANDARD
    - WEBSOCKET

  # nsc --source-network. Client IP or CIDR.
  src:
    - "10.0.0.0/8"

  # nsc edit user --time "hh:mm:ss-hh:mm:ss" and --locale.
  times:
    - start: "09:00:00"
      end: "17:00:00"
  timesLocation: America/New_York

  # nsc --allow-pub / --deny-pub / --allow-sub / --deny-sub.
  # There is no single allow-pubsub key; set both lists.
  # Queue subscribe (nsc): "<subject> <queue>" in one string.
  pubAllow:
    - "orders.>"
  pubDeny:
    - "orders.secret"
  subAllow:
    - "orders.>"
    - "orders.work workers"
  subDeny: []

  # nsc --allow-pub-response[=N] and --response-ttl.
  # respTtl is nanoseconds. 5s in nsc is 5000000000 here.
  respMax: 100 # The maximum number of responses allowed.
  respTtl: 5000000000 # The time-to-live for responses, in nanoseconds.

  # nsc --tag
  tags:
    - checkout
    - prod
```

Accepted user aliases:

```yaml
spec:
  subs: -1                      # maxSubscriptions
  payload: 1048576              # maxPayload
  bearer_token: false
  proxy_required: false
  allowed_connection_types:
    - STANDARD
  times_location: UTC           # also accepted as locale
  pub:
    allow: ["orders.>"]
    deny: []
  sub:
    allow: ["orders.>"]
    deny: []
  resp:
    max: 1
    ttl: 5000000000
```

`maxData` has no `data:` alias on a user rule. Use `maxData`.

---

## NatsAccountRule fields


| YAML field | Type | nsc | JWT | Meaning |
|---|---|---|---|---|
| `metadata.name` | string | `--name` is the account name, not this | — | Policy name. The account name is the application name, assigned when the account is created. |
| `description` | string | `--description` | `description` | Human-readable account description. |
| `infoUrl` | string | `--info-url` | `info_url` | Link for more information. Alias `info_url`. |
| `maxConnections` | int ≥ -1 | `--conns` | `limits.conn` | Max simultaneous client connections. `-1` unlimited. Alias `limits.conn`. |
| `maxLeafNodeConnections` | int ≥ -1 | `--leaf-conns` | `limits.leaf` | Max leafnode connections. `-1` unlimited. Alias `limits.leaf`. |
| `maxData` | bytes | `--data` | `limits.data` | Max bytes the account may carry. `-1` unlimited. Alias `limits.data`. |
| `maxMsgPayload` | bytes | `--payload` | `limits.payload` | Max message payload. `-1` unlimited. Alias `limits.payload`. |
| `maxSubscriptions` | int ≥ -1 | `--subscriptions` | `limits.subs` | Max subscriptions. `-1` unlimited. Alias `limits.subs`. |
| `maxImports` | int ≥ -1 | `--imports` | `limits.imports` | Max number of imports. Distinct from the `imports` list. Alias `limits.imports`. |
| `maxExports` | int ≥ -1 | `--exports` | `limits.exports` | Max number of exports. Distinct from the `exports` list. Alias `limits.exports`. |
| `exportsAllowWildcards` | bool | `--wildcard-exports` (default true) | `limits.wildcards` | Whether export subjects may contain `*` or `>`. Alias `limits.wildcards`. |
| `disallowBearer` | bool | `--disallow-bearer` | `limits.disallow_bearer` | Reject user JWTs that are bearer tokens. Alias `limits.disallow_bearer`. |
| `pubAllow` | string[] | `--allow-pub`, and the pub half of `--allow-pubsub` | `default_permissions.pub.allow` | Subjects users may publish when they have no tighter user allow list. Alias `default_permissions.pub.allow`. |
| `pubDeny` | string[] | `--deny-pub`, and the pub half of `--deny-pubsub` | `default_permissions.pub.deny` | Subjects users may not publish. Deny matches win. Alias `default_permissions.pub.deny`. |
| `subAllow` | string[] | `--allow-sub`, and the sub half of `--allow-pubsub` | `default_permissions.sub.allow` | Subjects users may subscribe. Queue form is `"<subject> <queue>"`. Alias `default_permissions.sub.allow`. |
| `subDeny` | string[] | `--deny-sub`, and the sub half of `--deny-pubsub` | `default_permissions.sub.deny` | Subjects users may not subscribe. Alias `default_permissions.sub.deny`. |
| `respMax` | int ≥ 0 | `--allow-pub-response[=N]` (nsc default 1 when the flag is present) | `default_permissions.resp.max` | How many messages a client may publish to a reply subject. Alias `default_permissions.resp.max`. |
| `respTtl` | int nanoseconds ≥ 0 | `--response-ttl` (`5s`, `2m`, `1h`) | `default_permissions.resp.ttl` | How long that reply permission lasts, in nanoseconds. `5s` = `5000000000`. Alias `default_permissions.resp.ttl`. |
| `memStorage` | bytes | `--js-mem-storage` | `limits.mem_storage` | JetStream max memory. `-1` unlimited, `0` disabled. Alias `limits.mem_storage`. |
| `diskStorage` | bytes | `--js-disk-storage` | `limits.disk_storage` | JetStream max disk. `-1` unlimited, `0` disabled. Alias `limits.disk_storage`. |
| `streams` | int ≥ -1 | `--js-streams` | `limits.streams` | Max streams. `-1` unlimited. Alias `limits.streams`. |
| `consumer` | int ≥ -1 | `--js-consumer` | `limits.consumer` | Max consumers. `-1` unlimited. Alias `limits.consumer`. |
| `maxAckPending` | int ≥ -1 | `--js-max-ack-pending` | `limits.max_ack_pending` | Max pending acks for a consumer. Alias `limits.max_ack_pending`. |
| `memMaxStreamBytes` | bytes | `--js-max-mem-stream` | `limits.mem_max_stream_bytes` | Max size of one memory stream. `-1` unlimited, `0` disabled. Alias `limits.mem_max_stream_bytes`. |
| `diskMaxStreamBytes` | bytes | `--js-max-disk-stream` | `limits.disk_max_stream_bytes` | Max size of one disk stream. `-1` unlimited, `0` disabled. Alias `limits.disk_max_stream_bytes`. |
| `maxBytesRequired` | bool | `--js-max-bytes-required` | `limits.max_bytes_required` | Require `max_bytes` when a stream is created. Alias `limits.max_bytes_required`. |
| `tieredLimits` | object | `--js-tier` / `--rm-js-tier` | `limits.tiered_limits` | Map of replication tier to JetStream limits. Tier `0` is the global tier in nsc. Alias `tiered_limits`. |
| `imports` | object[] | `nsc add import` (not an account flag) | `imports` | Stream or service imports from another account. |
| `exports` | object[] | `nsc add export` (not an account flag) | `exports` | Stream or service exports to other accounts. |

Import object:

| Field | Meaning |
|---|---|
| `name` | Import name. |
| `subject` | Remote subject. |
| `type` | `stream` or `service`. |
| `account` | Exporting account public key. |
| `token` | Activation token when the export requires one. |
| `local_subject` | Local subject alias. |
| `share` | Share the connection with other accounts. |

Export object:

| Field | Meaning |
|---|---|
| `name` | Export name. |
| `subject` | Exported subject. Wildcards allowed only when `exportsAllowWildcards` is true. |
| `type` | `stream` or `service`. |
| `description` | Text shown to importers. |
| `info_url` | Link for importers. |
| `token_req` | Importer must present an activation token. |
| `response_type` | Service only: `Singleton`, `Stream`, or `Chunked`. This is what nsc `edit export --response-type` enables so `--allow-pub-response=N` can return more than one message across accounts. |
| `account_token_position` | Subject token index used for account-scoped monitoring exports (1-based token position). |

Subject syntax, for allow and deny lists: `*` is one token, `>` is the remainder of the subject. A deny match overrides an allow match.

`responsePermissions: { maxMsgs, expires }` is accepted by the JSON schema and stored. Account JWT signing uses `respMax` and `respTtl`. Put reply limits there.

nsc account flags Controller does not accept on this kind: `--public-key`, `--start`, `--expiry`, `--sk` (signing keys), `--tag`, `--js-enable`, `--js-disable`, `--trace-context-sampling`, `--trace-context-subject`, `--rm`, `--rm-response-perms`, `--rm-sk`, `--rm-tag`. Account lifetime and signing keys are issued by Controller, not by the rule.

---

## NatsUserRule fields


| YAML field | Type | nsc | JWT | Meaning |
|---|---|---|---|---|
| `metadata.name` | string | `--name` is the user name, not this | — | Policy name. The NATS user name comes from the microservice (or from `POST /api/v3/nats/.../users`). |
| `description` | string | — | — | Controller-only note. Not a user JWT claim. |
| `maxSubscriptions` | int ≥ -1 | `edit user --subs` | `subs` | Max subscriptions for this user. `-1` unlimited. Alias `subs`. |
| `maxData` | bytes | `edit user --data` | `data` | Max data in bytes. `-1` unlimited. |
| `maxPayload` | bytes | `edit user --payload` | `payload` | Max message payload. `-1` unlimited. Alias `payload`. |
| `bearerToken` | bool | `--bearer` | `bearer_token` | No cryptographic connect challenge. The JWT itself is the credential. Required for the MQTT bearer pattern (`default-mqtt-user`). Alias `bearer_token`. |
| `proxyRequired` | bool | — (server `authorization.proxy_required` is global) | `proxy_required` | This user must connect through a PROXY protocol header. Alias `proxy_required`. |
| `allowedConnectionTypes` | enum[] | `edit user --conn-type` | `allowed_connection_types` | Allowed connection types. Tokens: `STANDARD`, `WEBSOCKET`, `LEAFNODE`, `LEAFNODE_WS`, `MQTT`, `MQTT_WS`, `IN_PROCESS`. Alias `allowed_connection_types`. |
| `src` | string[] | `--source-network` | `src` | Allowed client source addresses or CIDRs. |
| `times` | `{start,end}[]` | `edit user --time hh:mm:ss-hh:mm:ss` | `times` | Daily windows when the user may connect. `start` and `end` are `hh:mm:ss`. |
| `timesLocation` | string | `edit user --locale` | `times_location` | Time zone used to interpret `times` (IANA name, e.g. `UTC`). Aliases `times_location` and `locale`. |
| `pubAllow` | string[] | `--allow-pub` | `pub.allow` | Publish allow list. Alias `pub.allow`. |
| `pubDeny` | string[] | `--deny-pub` | `pub.deny` | Publish deny list. Alias `pub.deny`. |
| `subAllow` | string[] | `--allow-sub` | `sub.allow` | Subscribe allow list. Queue form: `"subject queue"`. Alias `sub.allow`. |
| `subDeny` | string[] | `--deny-sub` | `sub.deny` | Subscribe deny list. Alias `sub.deny`. |
| `respMax` | int ≥ 0 | `--allow-pub-response[=N]` | `resp.max` | Max publishes to a reply subject (service responders). nsc defaults to 1 when the flag is set with no count. Alias `resp.max`. |
| `respTtl` | int nanoseconds ≥ 0 | `--response-ttl` | `resp.ttl` | Lifetime of that reply permission, in nanoseconds, measured from when the request was received. Alias `resp.ttl`. |
| `tags` | string[] | `--tag` | `tags` | Arbitrary tags stored on the user JWT. |

`--allow-pubsub` and `--deny-pubsub` are nsc convenience flags. In YAML, write the same subjects into both the pub list and the sub list.

Omit `pubAllow` / `subAllow` to leave them unset. A present allow list restricts the user to those subjects (minus denies). A deny match always blocks, including when it also matches an allow.

nsc user flags Controller does not accept on this kind: `--account`, `--public-key`, `--start`, `--expiry`, `--rm`, `--rm-response-perms`, `--rm-conn-type`, `--rm-source-network`, `--rm-tag`, `--rm-time`. The user is placed in the application account automatically. User expiry is `expiresIn` on user create (`7d`, `12h`, `30m`), not a rule field. To clear a permission, PATCH the rule with the new lists; there is no `--rm` flag.

---


## Default(Reserved) Account and User Rules 

Default (reserved) account and user rules are pre-defined rule-set shipped with Controller, some of the used for platform internal usage or make it easy for users to directly use for their applications and microservices. 

### Default System Account Rule

When new Edgelet node is deployed default-system-account rule is used for nats instance system account.

```yaml
apiVersion: datasance.com/v3
kind: NatsAccountRule
metadata:
  name: default-system-account
spec:
  description: Default system account rule
  maxConnections: -1
  maxLeafNodeConnections: -1
  maxData: -1
  maxExports: -1
  maxImports: -1
  maxMsgPayload: -1
  maxSubscriptions: -1
  exportsAllowWildcards: true
  exports:
    - name: account-monitoring-streams
      subject: $SYS.ACCOUNT.*.>
      type: stream
      account_token_position: 3
      description: Account specific monitoring stream
      info_url: https://docs.nats.io/nats-server/configuration/sys_accounts
    - name: account-monitoring-services
      subject: $SYS.REQ.ACCOUNT.*.*
      type: service
      response_type: Stream
      account_token_position: 4
      description: >-
        Request account specific monitoring services for: SUBSZ, CONNZ, LEAFZ,
        JSZ and INFO
      info_url: https://docs.nats.io/nats-server/configuration/sys_accounts

```

### Default Account Rule

It is pred-defined account rule that platform user can choose when deploying an application in the case user don't need to customize any account rule. Also in the case that Application spec.natsConfig.natsAccess is `true` but spec.natsConfig.natsRule is omitted Controller automatically assigns this account rule for an application.

```yaml
apiVersion: datasance.com/v3
kind: NatsAccountRule
metadata:
  name: default-account
spec:
  description: Default application account rule
  maxConnections: -1
  maxLeafNodeConnections: -1
  maxData: -1
  maxExports: -1
  maxImports: -1
  maxMsgPayload: -1
  maxSubscriptions: -1
  exportsAllowWildcards: true
  memStorage: -1
  diskStorage: -1
  streams: -1
  consumer: -1
  maxAckPending: -1
  memMaxStreamBytes: -1
  diskMaxStreamBytes: -1

```

### Controller Account Rule

Pre-defined account rule which is used by Controller when creating internal account for cross-Controller communication accross replicas/instances. 

```yaml
apiVersion: datasance.com/v3
kind: NatsAccountRule
metadata:
  name: controller-account
spec:
  description: Controller WebSocket relay account with standard app limits, no exports
  maxConnections: -1
  maxLeafNodeConnections: -1
  maxData: -1
  maxExports: -1
  maxImports: -1
  maxMsgPayload: -1
  maxSubscriptions: -1
  exportsAllowWildcards: true
  memStorage: -1
  diskStorage: -1
  streams: -1
  consumer: -1
  maxAckPending: -1
  memMaxStreamBytes: -1
  diskMaxStreamBytes: -1

```


### Default User Rule

It is pred-defined user rule that platform users can choose when deploying a microservice in the case user don't need to customize any user rule. Also in the case that Microservice spec.natsConfig.natsAccess is `true` but spec.natsConfig.natsRule is omitted Controller automatically assigns this user rule for an application.

```yaml
apiVersion: datasance.com/v3
kind: NatsUserRule
metadata:
  name: default-user
spec:
  description: Default microservice user rule
  maxSubscriptions: -1
  maxPayload: -1
  maxData: -1
  bearerToken: false
  allowedConnectionTypes:
    - STANDARD
    - WEBSOCKET


```

### Default Leaf User Rule

Default leaf node user rule for remote connection from leaf to server, the leaf-user is automatically created per application account per nats instances. 

```yaml
apiVersion: datasance.com/v3
kind: NatsUserRule
metadata:
  name: default-leaf-user
spec:
  description: Default leaf node user rule for remote connection from leaf to server
  maxSubscriptions: -1
  maxPayload: -1
  maxData: -1
  bearerToken: false
  allowedConnectionTypes:
    - LEAFNODE
    - WEBSOCKET

```

### Default MQTT User Rule

Pre-defined user rule for mqtt access. 

```yaml
apiVersion: datasance.com/v3
kind: NatsUserRule
metadata:
  name: default-mqtt-user
spec:
  description: Default MQTT bearer user rule
  maxSubscriptions: -1
  maxPayload: -1
  maxData: -1
  bearerToken: true
  allowedConnectionTypes:
    - MQTT
    - STANDARD

```

### Default MQTT User Rule

Pre-defined user rule which is used by Controller when creating internal user for cross-Controller communication accross replicas/instances. 

```yaml
apiVersion: datasance.com/v3
kind: NatsUserRule
metadata:
  name: controller-user
spec:
  description: >-
    Controller WebSocket relay user with standard app limits, scoped to
    controller.relay.v1.>
  maxSubscriptions: -1
  maxPayload: -1
  maxData: -1
  bearerToken: false
  allowedConnectionTypes:
    - STANDARD
  pubAllow:
    - controller.relay.v1.>
  subAllow:
    - controller.relay.v1.>


```


### Example rules
```yaml
apiVersion: datasance.com/v3
kind: NatsAccountRule
metadata:
  name: production-monitoring-export
spec:
  description: >-
    Production site account - export live alerts (service) and event journal
    (JetStream stream)
  maxConnections: -1
  maxLeafNodeConnections: -1
  maxData: -1
  maxExports: -1
  maxImports: -1
  maxMsgPayload: -1
  maxSubscriptions: -1
  exportsAllowWildcards: true
  memStorage: -1
  diskStorage: -1
  streams: -1
  consumer: -1
  maxAckPending: -1
  memMaxStreamBytes: -1
  diskMaxStreamBytes: -1
  exports:
    - description: Cross-account live anomaly notifications
      name: live-alerts
      subject: notify.alerts.>
      type: stream
    - description: JetStream journal replay path - stream JOURNAL_PRODUCTION
      name: event-journal
      subject: journal.events.>
      type: stream
    - description: Read-only fleet telemetry fan-in for ops dashboard sparklines
      name: fleet-telemetry
      subject: telemetry.machine.>
      type: stream
```

```yaml
apiVersion: datasance.com/v3
kind: NatsAccountRule
metadata:
  name: operations-center-import
spec:
  description: >-
    Operations center account - import live alerts and event journal from
    production site
  maxConnections: -1
  maxLeafNodeConnections: -1
  maxData: -1
  maxExports: -1
  maxImports: -1
  maxMsgPayload: -1
  maxSubscriptions: -1
  exportsAllowWildcards: true
  memStorage: -1
  diskStorage: -1
  streams: -1
  consumer: -1
  maxAckPending: -1
  memMaxStreamBytes: -1
  diskMaxStreamBytes: -1
  imports:
    - account: AA265OHYI3DSWNSBCG2NRRYK57QHVQAQ2ON7YAKH643GNE6O6SFVXILS
      description: Imported live anomaly notifications
      local_subject: notify.alerts.>
      name: live-alerts
      subject: notify.alerts.>
      type: stream
    - account: AA265OHYI3DSWNSBCG2NRRYK57QHVQAQ2ON7YAKH643GNE6O6SFVXILS
      description: Imported JetStream journal - JOURNAL_PRODUCTION
      local_subject: journal.events.>
      name: event-journal
      subject: journal.events.>
      type: stream
    - account: AA265OHYI3DSWNSBCG2NRRYK57QHVQAQ2ON7YAKH643GNE6O6SFVXILS
      description: Imported machine telemetry for fleet sparklines and status badges
      local_subject: telemetry.machine.>
      name: fleet-telemetry
      subject: telemetry.machine.>
      type: stream

```