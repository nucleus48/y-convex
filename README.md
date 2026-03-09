# @nucleus48/y-convex

[![npm version](https://img.shields.io/npm/v/@nucleus48/y-convex.svg)](https://www.npmjs.com/package/@nucleus48/y-convex)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Real-time Yjs synchronization for Convex.**

## Why Y-Convex?

Most Yjs providers rely on WebSockets (like `y-websocket`). While effective,
they require maintaining a separate server or serverless fleet. `y-convex`
offers several advantages:

- **Serverless**: No WebSocket servers to manage. All sync logic runs as Convex
  functions.
- **Transactional**: Updates are stored with Convex's ACID guarantees, ensuring
  document integrity.
- **Unified Backend**: Keep your collaborative state alongside your other
  application data in Convex.
- **Reactive**: Leverages Convex's built-in reactivity to broadcast changes to
  all clients instantly.

## Features

- 🚀 **Real-time Sync**: Collaborative editing with zero-latency feeling using
  Convex's reactive engine.
- 💾 **Persistent Storage**: Changes are automatically persisted to Convex.
- 📸 **Automatic Snapshotting**: Automatically compresses document history into
  snapshots to keep database queries fast and storage efficient.
- ⚛️ **React-First**: Includes a drop-in React hook for easy integration.
- 🔒 **Conflict-Free**: Leverages Yjs's CRDT (Conflict-free Replicated Data
  Type) logic for reliable state merging.

## Installation

```sh
npm install @nucleus48/y-convex yjs
```

## Quick Start

### 1. Register the component

Create a `convex/convex.config.ts` file (or update your existing one) to include
the `y-convex` component:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import yconvex from "@nucleus48/y-convex/convex.config";

const app = defineApp();
app.use(yconvex);

export default app;
```

### 2. Expose the API

Create a file named `convex/yconvex.ts` to expose the component's functionality
to your application:

```ts
// convex/yconvex.ts
import { exposeApi } from "@nucleus48/y-convex";
import { components } from "./_generated/api";

export const { init, push, pull } = exposeApi(components.yconvex);
```

### 3. Use in your React app

Now you can use the `useYConvexSync` hook to synchronize a Yjs `Doc` with
Convex:

```tsx
import { useMemo } from "react";
import * as Y from "yjs";
import { useYConvexSync } from "@nucleus48/y-convex/react";
import { api } from "../convex/_generated/api";

export default function CollaborativeEditor({ docId }) {
  // 1. Initialize a Y.Doc
  const doc = useMemo(() => new Y.Doc(), []);

  // 2. Sync it with Convex
  // Note: api.yconvex refers to the file created in step 2
  useYConvexSync(api.yconvex, docId, doc);

  // 3. Use standard Yjs patterns
  const yText = doc.getText("content");

  // ... rest of your editor logic
}
```

## How It Works

### The Sync Loop

1. **Initialization**: When the hook mounts, it calls `init` to fetch the
   current server state vector and merged updates.
2. **Pushing Changes**: Local updates on the `Y.Doc` are caught via the `update`
   event and pushed to Convex using a `push` mutation.
3. **Pulling Changes**: The hook subscribes to a `pull` query that reactively
   provides new updates from other clients.

### Snapshotting

`y-convex` includes a built-in snapshotting mechanism. When the number of
incremental updates for a document exceeds a threshold (default 100), the
component automatically:

1. Merges all existing updates and snapshots into a single block.
2. Uploads this merged state to Convex File Storage.
3. Cleans up the old incremental updates from the database.

This ensures that the initial load time remains fast even for long-lived
documents with thousands of edits.

## API Reference

### Backend API (`@nucleus48/y-convex`)

#### `exposeApi(component)`

Used in your `convex/` directory to re-export the component's functions.

### Frontend API (`@nucleus48/y-convex/react`)

#### `useYConvexSync(api, docId, doc)`

A React hook to synchronize a Yjs doc.

- `api`: The API object containing `init`, `push`, and `pull` (created via
  `exposeApi`).
- `docId`: A string identifying the document.
- `doc`: The `Y.Doc` instance to sync.

## Developing and Running Examples

The repository includes an example project to help you get started or test
changes.

1.  **Clone and Install**:

    ```sh
    git clone https://github.com/nucleus48/y-convex.git
    cd y-convex
    npm install
    ```

2.  **Run Development Mode**:
    ```sh
    npm run dev
    ```
    This will start the Convex backend and a Vite frontend for the example app.

## License

Apache-2.0
