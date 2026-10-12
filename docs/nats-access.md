# NATS access for applications and microservices

Policy fields (`NatsAccountRule`, `NatsUserRule`) are in [nats-rules.md](nats-rules.md). This document is what Controller does with those rules when an application or microservice is created, updated, or deleted.

You declare `natsConfig` on the application and on each microservice. Controller creates the operator, the account, and the user, signs the JWTs, stores the credentials, mounts them into the container, and pushes the account JWT to every NATS server that must accept the connection. There is no `nsc` step, no hand-copied `.creds` file, and no per-node resolver edit.

```yaml
apiVersion: iofog.org/v3
kind: Application
metadata:
  name: orders
spec:
  natsConfig:
    natsAccess: true
    natsRule: orders-account    # NatsAccountRule name; omit for default-account
  microservices:
    - name: checkout
      natsConfig:
        natsAccess: true
        natsRule: checkout-user  # NatsUserRule name; omit for default-user
```

`natsAccess` and `natsRule` belong under `natsConfig`. A top-level `natsAccess` is rejected.

A microservice can enable NATS only when its application already has `natsAccess: true`.

---

## Who signs what

Controller keeps one operator for the deployment. Each application with NATS gets one account. Each microservice with NATS gets one user inside that account. The same chain is what `nsc` builds by hand.

| Object | Name | Key | Who signs the JWT | Where the secret lives |
|---|---|---|---|---|
| Operator | `{controllerName}-operator` | Created once | The operator signs its own JWT | Seed secret `nats-operator-seed`. Not mounted into workloads. |
| Account | Application name (`orders`) | One keypair per application | Operator | Seed secret `nats-account-seed-{application}`. Not mounted into workloads. |
| User | Microservice name (`checkout`) | One keypair per user | Account | Creds secret `nats-creds-{application}-{microservice}`. This is what the container receives. |

Account and user names are slugified in secret names and in the creds file path. The JWT `name` claim stays the application name or the microservice name.

A creds file is the user JWT plus the user seed (`fmtCreds`). The secret data key is `{account}/{user}.creds`, for example `orders/checkout.creds`.

Limits and permissions inside the JWT come from the bound rule. See [nats-rules.md](nats-rules.md). When no rule name is set, the application uses `default-account` and the microservice uses `default-user`.

---

## What the microservice receives

Enabling `natsAccess` on a microservice does all of the following in one transaction:

1. Check the application account exists and signs it with the operator. If application spec.natsConfig.natsAccess is `false` you would get an error. 
2. Creates the user, signs the user JWT with the account seed, and writes the creds secret.
3. Creates a volume mount for that secret and links it to the agent that runs the microservice. A new link sets the agent `volumeMounts` change flag.
4. Adds a read-only volume mapping on the microservice:

| Mapping field | Value |
|---|---|
| `type` | `volumeMount` |
| `hostDestination` | creds secret name |
| `containerDestination` | `/etc/nats/creds` |
| `accessMode` | `ro` |

5. Sets two environment variables on the microservice:

| Variable | Value |
|---|---|
| `NATS_CREDS_PATH` | `/etc/nats/creds/{account}/{user}.creds` |
| `NATS_SERVER_URL` | Where this container should connect |

`NATS_SERVER_URL` depends on where NATS is running:

| Agent has a local NATS | Container network | URL |
|---|---|---|
| Yes | host network | `nats://localhost:{serverPort}` |
| Yes | bridge network | `nats://nats.default.svc.bridge.local:{serverPort}` |
| No | either | `nats://{hubHost}:{hubServerPort}` |

The default port is `4222`. If the agent has no local NATS and no hub exists, enabling NATS fails with a validation error.

The agent then pulls the microservice spec (`microserviceList` or `microserviceConfig`) and the linked volume mount. The workload connects with the file at `NATS_CREDS_PATH`. It does not receive the account seed or the operator seed.

---

## How account JWTs reach NATS servers

Clients present a user JWT. The server must already hold the account JWT, signed by the operator it trusts. Controller fills a full resolver directory. Server config is:

```
operator: <operator JWT>
system_account: <SYS account public key>
resolver: {
  type: full
  dir: /home/runner/nats/jwt
  allow_delete: false
  interval: 2m
}
```

Each file in that directory is `{accountPublicKey}.jwt`.

| NATS role | Bundle contents | How it is delivered |
|---|---|---|
| Server (including the hub) | System account, every application with `natsAccess`, and the controller relay account when NATS is enabled | ConfigMap `iofog-nats-jwt-bundle`, mounted on the NATS microservice at `/tmp/nats/jwt` |
| Leaf | That fog's leaf system account, plus application accounts that have a microservice on this fog | A per-fog ConfigMap, same mount |

A leaf also receives a creds ConfigMap of `leaf-{fogName}` users, one per application account on that fog, mounted at `/etc/nats/creds`. Those users use the `default-leaf-user` rule and are how the leaf authenticates upstream. They are not workload users.

After an account JWT changes, Controller enqueues a NATS reconcile. The workers that get a new bundle are:

- every NATS server (non-leaf), and
- every agent that runs a microservice of the affected application.

The NATS process rereads the resolver directory on its interval. User creds do not go into this bundle. They go only to the workload, as a secret mount.

---

## Application

### Create with `natsAccess: true`

The application row is stored with `natsAccess` and the resolved rule id. After the transaction commits, Controller:

1. Creates the account if it does not exist (operator signs the account JWT).
2. Re-signs that JWT with the current account rule. Existing user revocations on the JWT are kept.
3. For each microservice in the application that has `natsAccess`, ensures the user and the creds mount.
4. Enqueues resolver distribution for the servers and for agents that run this application's microservices.

Creating the application with microservices in the same YAML still requires the application `natsAccess` before any microservice `natsAccess`. Microservice create checks the application flag and fails closed when it is off.

### Change `natsRule`

The account key does not change. Controller re-signs the account JWT with the new rule and keeps revocations. It then walks every microservice in the application:

- `natsAccess: true` — re-issue the user JWT if that user's rule binding changed, and make sure the creds mount is still in place.
- `natsAccess` off, but a user or creds mount still exists — revoke that user and detach the mount.

Servers and agents that host this application receive the new account JWT through the resolver bundle.

### Turn `natsAccess` on

Same path as create: ensure the account, sign it, attach creds for microservices that already asked for NATS, push the account JWT.

### Turn `natsAccess` off

Every microservice user in the application is revoked and its creds mount is removed. The account row, its seed secret, and any remaining user creds secrets are deleted. Resolver reconcile drops that account JWT from the bundles (`account-deleted`).

### Delete the application

Microservices are deleted first. Each microservice user is revoked (its public key is added to the account JWT, then the user and creds secret are removed). After the microservices are gone, `deleteAccountForApplication` removes any users still on the account (including MQTT and extra users), deletes the account seed, and deletes the account. Resolver reconcile removes the account from the servers.

System applications cannot be deleted through the user application API.

---

## Microservice

### Create or enable `natsAccess`

Requires the application flag. Controller runs the mount steps in [What the microservice receives](#what-the-microservice-receives). The user JWT is signed by the account seed. `isBearer` is false. There is no expiry on a microservice user.

The microservice row stores `natsAccountId`, `natsUserId`, and `natsCredsSecretName`.

### Change `natsRule`

The account stays the same. The old user key is not reused:

1. The current user public key is written into the account JWT `revocations` map, with the current time. The operator re-signs the account JWT.
2. A new user keypair is created. The new user JWT is signed by the account and carries the new rule.
3. The same creds secret is overwritten with the new creds file.
4. Resolver reconcile pushes the updated account JWT so servers honor the revocation.

The container keeps the same `NATS_CREDS_PATH`. The file contents change. The agent receives the updated secret through the volume mount and the updated microservice spec through change tracking.

If the rule id did not change, Controller does not mint a new user key. A later edit of the rule document itself reissues every user bound to that rule, including microservices that inherit `default-user` when `default-user` is the rule being edited. That path also revokes the previous public key and writes a new creds file.

### Turn `natsAccess` off

The volume mapping and the `NATS_CREDS_PATH` / `NATS_SERVER_URL` variables are removed. The volume mount is unlinked from the agent. The user is revoked: public key added to the account JWT, creds secret deleted, user row deleted. The account itself stays, so other microservices in the application keep working. The new account JWT is pushed to the resolver.

### Delete the microservice

The microservice's foreign keys to the NATS user are cleared, then the user is revoked the same way as disabling `natsAccess`. Deleting the microservice does not delete the application account.

### Move the microservice to another agent

The creds volume mount is linked to the new agent when NATS is ensured again. `NATS_SERVER_URL` is recomputed for the new agent (local NATS or hub).

---

## Users that are not microservices

Some clients are not a container Controller deploys: an MQTT device, a laptop, a CI job. Those users are created on the application account with an API call. Controller still signs them and stores a creds secret. It does not mount that secret into a microservice.

The application must already have an account. `POST` ensures the account if `natsAccess` was turned on. Fetch the file with the creds endpoint and give it to the client. Delete the user when it should stop connecting.

### NATS user

`POST /api/v3/nats/accounts/{appName}/users`

```json
{
  "name": "laptop",
  "natsRule": "checkout-user",
  "expiresIn": "7d"
}
```

| Field | Meaning |
|---|---|
| `name` | User name inside the application account. Required. |
| `natsRule` | `NatsUserRule` name. Omitted means `default-user`. |
| `expiresIn` | Optional lifetime: `<number>h`, `<number>d`, or `<number>m`. Omitted means the JWT has no `exp`. Hours max `26280`, days max `1095`, months max `36` (treated as 30-day months). |

The user is not a bearer. Connection types and subject limits come from the rule.

`GET /api/v3/nats/accounts/{appName}/users/{userName}/creds` returns `{ "credsBase64": "..." }`. Decode that to the `.creds` file.

`DELETE /api/v3/nats/accounts/{appName}/users/{userName}` revokes the public key on the account JWT, deletes the creds secret, and pushes the account JWT. The call is rejected while the user is still linked to a microservice that exists. Disable `natsAccess` or delete that microservice first. System-account users and leaf-system users cannot be deleted here.

`GET /api/v3/nats/accounts/{appName}/users` lists users on the account, including microservice users (`microserviceUuid` is set) and these extra users (`microserviceUuid` is null).

### MQTT bearer user

`POST /api/v3/nats/accounts/{appName}/mqtt-bearer`

```json
{
  "name": "sensor-7",
  "expiresIn": "30d"
}
```

Same body as a NATS user. The default rule is `default-mqtt-user` (`bearerToken: true`, connection types `MQTT` and `STANDARD`). The signed JWT also sets `bearer_token: true` and `allowed_connection_types: ["MQTT"]`, so the client authenticates with the JWT and does not answer a connect challenge.

The response includes the user `jwt`. The creds file is in the same secret layout (`nats-creds-{application}-{userName}`) and is fetched with the same creds endpoint.

`DELETE /api/v3/nats/accounts/{appName}/mqtt-bearer/{userName}` revokes that user the same way as deleting a NATS user.

Creating the same name again returns the existing user. It does not rotate the key. To rotate, delete and create again.

---

## What you do not do by hand

| Manual NATS | Controller |
|---|---|
| `nsc add operator`, store the operator seed, configure every server | One operator, seed kept in a Controller secret, operator JWT rendered into each NATS server config |
| `nsc add account` per application, push the account JWT to a resolver | `natsConfig.natsAccess` on the application; account JWT written into the resolver bundle and mounted on servers and leafs |
| `nsc add user`, copy a `.creds` file into each container, set the path yourself | `natsConfig.natsAccess` on the microservice; creds secret, volume mount, `NATS_CREDS_PATH`, and `NATS_SERVER_URL` |
| Edit the user and re-copy creds when policy changes | Change `natsRule` on the application or microservice, or edit the rule; Controller re-signs, revokes the old user key when the user policy changes, and overwrites the creds file |
| Remember to revoke a deleted client | Delete the microservice, turn `natsAccess` off, or `DELETE` the extra user; the public key is revoked on the account JWT and the servers receive that JWT |

Rule documents and their fields stay in [nats-rules.md](nats-rules.md). This flow only binds those documents to applications and microservices and distributes the result.
