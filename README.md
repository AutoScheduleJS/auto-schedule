# auto-schedule
Mono-repo for auto-schedule's packages

schedule (tasks (materials)):
- tasks (potentials)

tasks (potentials):
- queries
- tasks (potentials)
- tasks (materials)
- user state (potentials)
- user state (materials)

tasks with needs:
- tasks (materials)
- agent service

Stream:
1. agent queries
2. user interaction
3. [1, 2] queries
4. [3, 5] queries with temp
5. [4, 5, 7] tasks (potential) - use user-state function on tasks (potential & material)
7. [5] tasks (material)
9. [7] needs and fixes, placeholder fill or validate

a. Catch errors from [7] => generate new queries at [1].

Module:
[1] queries-fn
[2, 3] main app
[4, 5, 7] queries-scheduler
userstate-manager
[a] conflic-resolver
[b] agent-relay

Module a: if provider is impossible to place, either there is no need for it, or there is a conflict. Use user-state to determine.
userstate-manager: query + (potential/material) with needs + config + base needs => ranges of possibilities

Queries restrictions:
- provider (insert/update with 'wait: true' can't specify start/end) -> will prevent correct material placement order.

queries-fn: handle query's validation ; transforms raw query into usable well-formed format.