# User-state Manager

[![Greenkeeper badge](https://badges.greenkeeper.io/AutoScheduleJS/userstate-manager.svg)](https://greenkeeper.io/)

> Manage user-state

[![Build Status](https://travis-ci.org/AutoScheduleJS/userstate-manager.svg?branch=master)](https://travis-ci.org/AutoScheduleJS/userstate-manager)

needs:
- app update state as tasks finished
- data-io strategy to save change locally or sync with Google Drive (use LokiJS - pull, merge, push; pouchDB hasen't serialize methods)
- fetch original state (main app responsibility)

flow dependency:
- mongo-like engine for simulation (LokiJS)

structure dependency:
- queries-scheduler:
  - potentiality
  - material
- queries-fn:
  - query

workflow:
promise -> config (start, end) -> queries (to get transformation) -> query + (potential/material) with needs
  -> promise ranges of possibilities
  or
  -> promise [ranges of possibilities, errors]
  or
  -> promise resolve to ranges of possibilites, reject to no resources error

operations:
- build state timeline and check query's need / output to construct potential ranges.
- check query's need that wait for this resource
- build available mask (space where this resource is available)
- check query's output that wait to be lacking (provider's query)
- build available mask (space where this resource is lacking)
- intersect masks
