# Adaptive VLESS Plan

## Goal

Let a user import one subscription and keep using the working VLESS path for
their current client/network, while the panel can publish safer variants and
avoid breaking clients that cannot parse experimental transports.

## Constraints

- A plain URI subscription cannot express a real server-side balancer or client
  feedback loop. Shadowrocket-style imports need conservative links.
- Structured profiles can express automatic testing:
  - sing-box: `urltest` / selector-style outbounds.
  - Clash Meta: `url-test` / `fallback` groups.
  - Xray JSON/HAPP: balancer + observatory.
- A profile can work for one ISP/client and fail for another, so health must be
  tracked per client family and, later, per observed network fingerprint.
- XHTTP/REALITY is useful as a backup path, but it is not safe to publish into
  every URI-list client until that client is known to support it.

## Current Safe Rules

- Plain URI / Shadowrocket subscriptions publish only broadly compatible Xray
  transports: `tcp`, `ws`, `grpc`.
- XHTTP and other advanced VLESS variants stay in structured formats where the
  client capabilities can be represented.
- MCP node queries must never return Xray private keys, agent tokens, SSH
  secrets, or nested extra-inbound private keys.

## Implementation Roadmap

1. Compatibility gate
   - Detect subscription format and user-agent.
   - Publish only client-compatible inbounds for that format.
   - Keep advanced variants in sing-box / Clash / Xray JSON profiles.

2. Variant registry
   - Store generated VLESS variants per node: transport, port, REALITY target,
     fingerprint, flow, and compatibility tags.
   - Mark variants as `stable`, `candidate`, `quarantined`, or `disabled`.

3. Client-aware subscription output
   - Shadowrocket/plain URI: ordered stable links only.
   - sing-box: `urltest` group over compatible VLESS variants.
   - Clash: `url-test` or `fallback` group.
   - HAPP/Xray JSON: balancer + observatory.

4. Feedback and diagnostics
   - Add a lightweight endpoint/tool that can record `success`, `timeout`,
     `parse_error`, and `blocked` for a variant.
   - Key results by user, client family, and coarse network fingerprint.
   - Use this data to reorder or quarantine variants without affecting other
     clients.

5. Controlled mutation
   - Never rewrite a working main VLESS profile blindly.
   - Create candidate inbounds on extra ports first.
   - Promote candidates only after successful checks from at least one target
     client family.

6. Amnezia track
   - Add AmneziaWG 2.0 as a separate protocol family, not as a VLESS tweak.
   - Generate and store AmneziaWG client configs separately because it requires
     protocol-specific keys and parameters.

