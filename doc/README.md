# Project Documentation

Welcome to the central documentation hub for the **Universal Entity Explorer (GS)** project. This directory contains all relevant documents describing the system's vision, architecture, requirements, and component contracts.

## Table of Contents

1.  [**Vision & Requirements**](#1-vision--requirements): The "what" and "why" of the project.
2.  [**System Architecture**](#2-system-architecture): The high-level "how" of the system's design.
3.  [**Contracts & APIs**](#3-contracts--apis): Detailed technical contracts for key system boundaries.
4.  [**Implementation Notes**](#4-implementation-notes): Practical guides for development topics.

---

## 1. Vision & Requirements

These documents define the project's goals, features, and constraints.

*   [**`Vision.md`**](./Vision.md): Outlines the high-level strategy, core principles, and goals for the platform.
*   **`PRD.md`**: The Product Requirements Document, detailing features, functional/non-functional requirements, and target use cases.

---

## 2. System Architecture

These documents describe the fundamental structure and design patterns of the system.

*   **`ADR.md`**: A log of all significant architectural decisions, their context, and consequences.
*   **`arch/arch.md`**: The primary document describing the high-level, layered architecture of the entire system.
*   **`arch/core.md`**: Describes the headless "brain" of the application, including the graph model, versioning, and event bus.
*   **`arch/services.md`**: Details the business logic layer, including the `AnnotationService` and `CassettePlayer`.
*   **`arch/ui.md`**: Explains the decoupled UI layer, the `UI Bridge` pattern, and the role of pluggable `Renderers`.
*   **`arch/data.md`**: Covers the data persistence, retrieval, and synchronization architecture, including data and storage adapters.

---

## 3. Contracts & APIs

These documents provide specific, implementation-level details about the system's contracts.

*   **`window.GS.md`**: Defines the complete public-facing API available in the browser console for controlling the entire system.
*   **`modules/ui/RendererContract.md`**: Specifies the precise API contract that all UI Renderers must implement, ensuring they are interchangeable.
*   **`modules/event/Bus.md`**: Provides an exhaustive catalog of all system events, their namespaces, and payload contracts, which is crucial for error handling and state tracking.
*   **`errorHandling/errorFramework.md`**: Describes the system-wide strategy for error handling, including error types, propagation, and how different modules should react to failures. It also describes the JSON schema, retry strategies and UI remediation.
*   **`modules/graph/schema.md`**: Defines the core data structures for `Entity` and `Relation`, forming the canonical graph model for the entire system.
*   **`modules/graph/SchemaBuilder.md`**: Outlines the runtime API for the `SchemaBuilder`, which allows for dynamic creation, validation, and persistence of graph schemas.
*   **`modules/graph/QueryEngine.md`**: Specifies the fluent API for the `QueryEngine`, allowing for declarative, composable, and serializable graph traversals and searches.

---

## 4. Implementation Notes

This section contains practical guides and deep dives into specific implementation topics.

*   **`notes/bootstrapping.md`**: Details the application's startup sequence, configuration object, and runtime switching capabilities for modules like storage and renderers.

---

## 5. Development Setup & Stack

These documents guide developers setting up their environment and understanding technology choices.

*   **`TECH_STACK.md`**: Complete overview of the technology stack, including vanilla JS, HTML5 Web Components, Jest testing, and rationale for avoiding build systems.
*   **`DEVELOPMENT.md`**: Step-by-step setup instructions, project structure, npm scripts, and development workflows (headless-first approach).
*   **`WEB_COMPONENTS.md`**: Deep dive into HTML5 Web Components for implementing Renderers, Shadow DOM, Slots, Templates, and styling strategies.
*   **`TESTING.md`**: Comprehensive Jest testing strategy, patterns for core logic, adapters, and Web Components, with code examples and coverage targets.

---