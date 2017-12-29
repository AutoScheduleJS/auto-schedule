# User-state Manager

> Manage user-state

[![Build Status](https://travis-ci.org/AutoScheduleJS/userstate-manager.svg?branch=master)](https://travis-ci.org/AutoScheduleJS/userstate-manager)

needs:
- app update state as tasks finished
- data-io strategy to save change locally or sync with Google Drive. (use LokiJS; pouchDB hasen't serialize methods)
- fetch original state. (main app responsibility)

flow dependency:
- Promise with original state
- mongo-like engine for simulation (LokiJS)

structure dependency:
- queries-scheduler:
  - potentiality
  - material
- queries-fn:
  - query

workflow:
data-io -> config (start, end) -> query + (potential/material) with needs -> ranges of possibilities

operations:
- build state timeline
- check query's need that wait for this resource
- build available mask (space where this resource is available)
- check query's output that wait to be lacking
- build available mask (space where this resource is lacking)
- intersect masks
