# Project Intelligence Engine v0

Phase201 only bootstraps Project Intelligence. Phase202 should build the real Project Intelligence Engine.

## Purpose

S.E.R.A. must know what it owns before it can safely improve itself.

## Phase202 target capabilities

- repository scanner
- file inventory
- symbol graph
- dependency graph
- module boundary map
- architecture map
- documentation index
- test coverage map
- dead file detection
- circular dependency detection
- API/class/function inventory

## Phase201 bootstrap

`scripts/sera-project-intelligence-index-v0.ps1` produces a basic file inventory at `.sera-index/project-intelligence-v0.json`. This is intentionally simple and exists to seed Phase202.
