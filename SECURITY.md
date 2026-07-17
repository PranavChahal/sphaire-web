# Security policy

Sphaire combines browser-side WebAssembly, user-supplied 3D files, generated code, and
optional third-party AI providers. Security reports are welcome and should be handled
privately.

## Supported version

Security fixes target the latest commit on `main`. This project has not yet declared a
long-term-support release branch.

| Version | Supported |
| --- | --- |
| Latest `main` | Yes |
| Older commits and forks | No guaranteed support |

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub's private vulnerability reporting form:

<https://github.com/sphaire3d/shaire-web-V2-beta/security/advisories/new>

Include, when possible:

- the affected commit and browser/runtime;
- the vulnerable route, file, or workflow;
- reproduction steps or a minimal proof of concept;
- the impact you believe is possible;
- whether credentials or user data may have been exposed;
- a suggested fix, if you have one.

Maintainers will acknowledge a complete report as capacity allows, reproduce it,
coordinate a fix, and credit the reporter if requested. Please allow a reasonable
private remediation period before public disclosure.

## Security-sensitive areas

Pay special attention to:

- generated CAD-code execution and static scanning;
- OpenCascade/Replicad WebAssembly loading;
- model uploads and parser behavior;
- server-side provider proxies and error logging;
- BYO API-key storage and forwarding;
- remote image and texture fetching;
- export/download filename and content handling;
- collaboration and optional persistence boundaries.

## Secrets

- Never commit `.env.local`, API keys, service-role keys, or provider tokens.
- `.env.example` must contain placeholders only.
- Browser-supplied keys are sensitive even when stored locally.
- Do not log full credentials, authorization headers, or model payloads containing
  private information.
- Any credential exposed in Git history must be treated as compromised and rotated;
  deleting it from the latest commit is not sufficient.

## Generated code and model safety

Generated CAD code is treated as untrusted input and must use the guarded executor.
The static scanner and timeouts reduce risk but are not a formal sandbox or proof of
safety. Do not use Sphaire to execute unknown code from an untrusted source.

Imported models and generated geometry may be malformed, non-manifold, deceptive, or
computationally expensive. Validation results are advisory and do not replace
professional engineering review, slicer checks, simulation, or physical testing.

## Third-party providers

When an AI provider is enabled, prompts, generated code, images used for visual
review, and related metadata may be sent to that provider. Review the provider's terms
and data-handling policy before using confidential designs.
