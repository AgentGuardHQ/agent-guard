# Bibliography

## Primary References

### Reference Monitors

Anderson, J. P. (1972). *Computer Security Technology Planning Study*. ESD-TR-73-51, Vol. II. Air Force Electronic Systems Division, Hanscom AFB, MA.

> Foundational work defining the reference monitor concept: a tamper-proof, always-invoked, verifiable security mechanism that mediates all access to protected resources. The AAB in AgentGuard implements these three properties for agent action authorization.

### Capability-Based Security

Dennis, J. B., & Van Horn, E. C. (1966). Programming semantics for multiprogrammed computations. *Communications of the ACM*, 9(3), 143--155.

> Introduced the capability-based security paradigm where subjects receive explicit, bounded capability sets rather than ambient authority. AgentGuard's policy model follows this pattern: agents receive explicit permission grants rather than inheriting the user's full system permissions (Principle of Least Authority).

### Event Sourcing

Vernon, V. (2013). *Implementing Domain-Driven Design*. Addison-Wesley Professional.

> Comprehensive treatment of event sourcing in the context of domain-driven design. AgentGuard's canonical event model captures all system activity as immutable events, enabling audit, replay, and temporal queries.

Young, G. (2010). *CQRS Documents*. https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf

> Foundational document on Command Query Responsibility Segregation and its relationship to event sourcing. Influenced the separation of command (action authorization) and query (event store, decision trail) paths in AgentGuard.

---

## AI Agent Safety

Amodei, D., Olah, C., Steinhardt, J., Christiano, P., Schulman, J., & Mane, D. (2016). Concrete problems in AI safety. *arXiv preprint arXiv:1606.06565*.

> Identifies five concrete problems in AI safety including safe exploration and distributional shift. AgentGuard addresses safe exploration through deterministic action authorization rather than learned safety boundaries.

Bai, Y., Jones, A., Ndousse, K., et al. (2022). Training a helpful and harmless assistant with reinforcement learning from human feedback. *arXiv preprint arXiv:2204.05862*.

> Describes RLHF training for Claude. While effective for text generation safety, RLHF operates on token distributions and cannot provide action-level guarantees. AgentGuard complements RLHF by adding deterministic execution governance.

Christiano, P. F., Leike, J., Brown, T., Marber, M., Amodei, D., & Schulman, J. (2017). Deep reinforcement learning from human preferences. *Advances in Neural Information Processing Systems*, 30.

> Seminal work on RLHF. Demonstrates that human preferences can guide model behavior but acknowledges the probabilistic nature of the approach. AgentGuard fills the deterministic gap that RLHF cannot address for execution safety.

---

## Systems Architecture

Lamport, L. (1978). Time, clocks, and the ordering of events in a distributed system. *Communications of the ACM*, 21(7), 558--565.

> Foundational work on event ordering in distributed systems. Influences AgentGuard's monotonic event ID generation and fingerprint-based deduplication for canonical events.

Saltzer, J. H., & Schroeder, M. D. (1975). The protection of information in computer systems. *Proceedings of the IEEE*, 63(9), 1278--1308.

> Defines the Principle of Least Privilege (now Principle of Least Authority). AgentGuard's capability-based policy model directly implements POLA for AI agents.

Verma, A., Pedrosa, L., Korupolu, M., Oppenheimer, D., Tune, E., & Wilkes, J. (2015). Large-scale cluster management at Google with Borg. *Proceedings of the European Conference on Computer Systems (EuroSys)*.

> Demonstrates the pattern of publishing systems research alongside a production implementation. AgentGuard follows the same pattern: research contribution (this paper) with reference implementation (the runtime).

---

## Runtime Governance and Policy

The Open Policy Agent Authors. (2023). *Open Policy Agent Documentation*. https://www.openpolicyagent.org/docs/latest/

> OPA provides general-purpose policy enforcement using Rego. AgentGuard takes a similar philosophy (externalized, deterministic policy enforcement) but specializes it for AI agent action authorization with integrated invariant checking and evidence generation.

Mogul, J. C. (2006). Emergent (mis)behavior vs. complex software systems. *ACM SIGOPS Operating Systems Review*, 40(4), 293--304.

> Discusses how complex systems exhibit emergent behaviors that individual component testing cannot predict. Relevant to multi-agent pipelines where individual agent safety does not guarantee pipeline safety --- motivating AgentGuard's pipeline-level governance with stage gates and role authorization.

---

## Agent Frameworks

Significant Place Labs. (2024). *Claude Code: An agentic coding tool*. Anthropic.

> Production AI coding agent that executes file operations, shell commands, and git workflows. Represents the class of systems that AgentGuard is designed to govern.

OpenAI. (2024). *Assistants API*. https://platform.openai.com/docs/assistants

> API for building AI agents with tool use. Demonstrates the tool-call interface pattern that AgentGuard normalizes through the Canonical Action Representation.

---

## Formal Methods

Schneider, F. B. (2000). Enforceable security policies. *ACM Transactions on Information and System Security (TISSEC)*, 3(1), 30--50.

> Characterizes which security policies can be enforced by runtime monitoring. AgentGuard's invariant model maps directly to Schneider's safety properties (policies that can be violated by a single bad action).

Ligatti, J., Bauer, L., & Walker, D. (2009). Run-time enforcement of nonsafety policies. *ACM Transactions on Information and System Security (TISSEC)*, 12(3), 1--41.

> Extends runtime enforcement to policies beyond simple safety. Relevant to AgentGuard's evidence pack system which records context for policies that cannot be checked in real-time (e.g., "the agent should not access the same sensitive file more than 3 times per session").
