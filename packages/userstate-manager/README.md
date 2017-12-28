# User-state Manager

> Manage user-state

[![Build Status](https://travis-ci.org/AutoScheduleJS/userstate-manager.svg?branch=master)](https://travis-ci.org/AutoScheduleJS/userstate-manager)

flow dependency:
- data-io ? (fetch original state) could use https://pouchdb.com/
- mongo-like engine

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
