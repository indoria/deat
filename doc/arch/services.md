# 🏷️ Services Architecture

---

## 1. Overview

The Services layer encapsulates business logic that operates on top of the Core graph but is not fundamental to the graph's structure itself. These services provide value-added functionality like annotations and narrative playback, enhancing the user's ability to interpret and interact with the data.

**Key Principles:** Decoupled Logic (ADR-001), Event-Driven (ADR-003), Separation of visual and structural events (ADR-013).

---

## 2. Key Modules

*   **AnnotationService:** Manages all user-generated metadata, such as notes, tags, and flags. It is responsible for creating, updating, and attaching these annotations to entities and relations in the graph.

*   **CassettePlayer:** Manages the creation, playback, and state of "cassettes"—ordered, replayable sequences of interactions that form a narrative or walkthrough of the graph (ADR-014). It does not mutate the graph's structure but controls the application's focus and highlight state.

*   **HighlightController:** A simple but critical service that manages the visual state of entities and relations (e.g., `hover`, `selected`). It listens for events from the UI and the `CassettePlayer` to apply visual changes.

---

## 3. Key Interactions and Flows

### 3.1. Annotation Flow

1.  A user action (e.g., from the UI Bridge) calls `GS.annotation.addNote(targetId, content)`.
2.  The `AnnotationService` receives the request.
3.  It creates a new note object with a unique UUID.
4.  It validates the annotation against the `AnnotationSchema`.
5.  It associates the note with the `targetId` (an entity or relation).
6.  It emits an `annotation.add` event onto the `EventBus` with the note details and target ID.
7.  The `UndoRedo` module listens for this event and records an inverse command.

### 3.2. Cassette Playback Flow

1.  The user initiates playback by calling `GS.cassette.play(cassetteId)`.
2.  The `CassettePlayer` loads the specified cassette object.
3.  It sets its internal state to `playing` and points to the first frame.
4.  For the current frame, it emits a `cassette.frame.enter` event. The payload includes the target entity/relation ID and the specified action (e.g., `highlight`).
5.  The `HighlightController` listens for this event and calls `highlight(targetId, 'play')`.
6.  The `UI Bridge` listens for highlight events and instructs the active **Renderer** to apply a visual style to the corresponding element.
7.  The `CassettePlayer` uses a timer (`setTimeout`) for the frame's duration. When it fires, it advances to the next frame and repeats the process.
8.  This flow continues until the last frame is played or the user calls `pause()` or `stop()`.

---

## 4. Data Structures

*   **Annotation:** A structured object containing user-generated data (e.g., `{ id, type: 'note', content: '...', targetId }`).
*   **Cassette:** An immutable object containing an ordered list of `Frame` objects and metadata.
*   **Frame:** A single step within a cassette, defining a target, an action, and a duration.

---

## 5. Design Decisions (ADRs)

*   **ADR-013 (Visual vs Structural Event Separation):** This is critical for the `CassettePlayer`. Playback emits non-replayable (in the structural sense) visual events, ensuring that a walkthrough doesn't count as a data mutation.
*   **ADR-014 (Cassette as a First-Class Domain Object):** Treating cassettes as data makes them serializable, shareable, and version-scoped, turning narratives into a persistent asset.