# AmneziaWG 2.0 Support

C3 CELERITY supports `amneziawg` as a first-class node type alongside
`hysteria`, `xray`, and `virtual`.

The protocol parameters follow AmneziaWG 2.0 behavior from the official
Amnezia documentation and the self-hosted AWG2 logic in
`amnezia-vpn/amnezia-client` (`AwgInstaller::generateAwgParameters`).

## What Is Deployed

Auto setup installs:

- `amneziawg-go` from the official `amnezia-vpn/amneziawg-go` GitHub source.
- `awg` and `awg-quick` from the official `amnezia-vpn/amneziawg-tools` release.
- A systemd unit `awg-quick@.service`.
- `/etc/amnezia/amneziawg/<interface>.conf`, defaulting to `/etc/amnezia/amneziawg/awg0.conf`.
  A compatibility symlink is kept at `/etc/wireguard/<interface>.conf`.
- IPv4 forwarding plus awg-quick `PostUp`/`PreDown` NAT rules for the client pool.

The service runs with:

```ini
Environment=WG_QUICK_USERSPACE_IMPLEMENTATION=/usr/local/bin/amneziawg-go
ExecStart=/usr/local/bin/awg-quick up /etc/amnezia/amneziawg/%i.conf
ExecStop=/usr/local/bin/awg-quick down /etc/amnezia/amneziawg/%i.conf
ExecReload=/bin/bash -lc '/usr/local/bin/awg syncconf %i <(/usr/local/bin/awg-quick strip /etc/amnezia/amneziawg/%i.conf)'
```

## Config Model

Node settings live in `HyNode.amneziawg`:

- Interface/network: `interfaceName`, `serverAddress`, `clientCidr`, `endpointHost`.
- Client defaults: `dns`, `allowedIPs`, `mtu`, `persistentKeepalive`.
- Keys: node `privateKey` is stored with `select:false`; `publicKey` is safe to display.
- AmneziaWG 2.0 obfuscation fields: `Jc`, `Jmin`, `Jmax`, `S1`-`S4`, `H1`-`H4`, `I1`-`I5`.
- New nodes generate AWG2-style `H1`-`H4` ranges and `S1`-`S4` junk sizes.
  Legacy placeholder values (`H1=1`, `H2=2`, `H3=3`, `H4=4`, `S*=0`) are
  replaced during setup/sync.
- Peer flag: `AdvancedSecurity = true` by default.

User peer material lives in `HyUser.amneziawg`:

- `privateKey` and `presharedKey` are stored with `select:false`.
- `publicKey` and `address` are safe operational fields.
- Missing peer material is generated lazily and then persisted.

## Subscriptions

AmneziaWG is not emitted into URI, Clash, sing-box, V2Ray, or Xray JSON formats
because there is no broadly compatible `amneziawg://` URI standard.

Use:

```text
/api/files/<token>?format=amneziawg
```

If a user has one AmneziaWG node, the response is a plain `.conf` body. If a
user has multiple AmneziaWG nodes, the response is a text bundle with one named
config block per node.

The browser subscription page also renders per-node AmneziaWG QR codes. Those
QR payloads contain the native `.conf` text itself, not the generic subscription
URL, so AmneziaWG/AmneziaVPN clients can import the tunnel by scanning the code.

The default client route is IPv4 full-tunnel (`0.0.0.0/0`). Add IPv6 routes only
when the server interface and forwarding are explicitly configured for IPv6.

## Parallel Protocols On One Server

The unique node constraint is still `(ip, type)`, so one host can have:

- one Hysteria node,
- one Xray node,
- one AmneziaWG node,
- any number of virtual nodes.

Use distinct public ports for real protocols. AmneziaWG opens only its UDP
listen port in the firewall during setup.
