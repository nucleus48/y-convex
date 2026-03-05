import { useConvex, useQuery } from "convex/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import * as Y from "yjs";
import { api } from "../component/_generated/api";

export interface YConvexSyncApi {
  init: typeof api.lib.init;
  push: typeof api.lib.push;
  pull: typeof api.lib.pull;
}

export function useYConvexSync(api: YConvexSyncApi, docId: string, doc: Y.Doc) {
  const convex = useConvex();
  const [isSynced, setIsSynced] = useState(false);
  const update = useQuery(api.pull, isSynced ? { docId } : "skip");
  const pendingUpdates = useRef<Uint8Array[]>([]);

  const init = useEffectEvent(() => {
    let isMounted = true;

    const sync = async () => {
      const stateVector = Y.encodeStateVector(doc);

      const { serverStateVector, update } = await convex.action(api.init, {
        stateVector: stateVector.buffer as ArrayBuffer,
        docId,
      });

      if (!isMounted) return;

      Y.applyUpdate(doc, new Uint8Array(update), "server");

      const serverUpdate = Y.encodeStateAsUpdate(
        doc,
        new Uint8Array(serverStateVector),
      );

      const decoded = Y.decodeUpdate(new Uint8Array(serverUpdate));

      if (decoded.structs.length) {
        await convex.mutation(api.push, {
          update: serverUpdate.buffer as ArrayBuffer,
          docId: docId,
        });
      }

      setIsSynced(true);
    };

    void sync();

    return () => {
      isMounted = false;
    };
  });

  const push = useEffectEvent((synced: boolean) => {
    let isMounted = true;

    doc.on("update", async (update, origin) => {
      if (origin === "server" || !isMounted) return;

      if (!synced) {
        pendingUpdates.current.push(update);
        return;
      }

      if (pendingUpdates.current.length) {
        const mergedUpdate = Y.mergeUpdates([
          ...pendingUpdates.current,
          update,
        ]);

        pendingUpdates.current = [];

        await convex.mutation(api.push, {
          update: mergedUpdate.buffer as ArrayBuffer,
          docId,
        });

        return;
      }

      await convex.mutation(api.push, {
        update: update.buffer as ArrayBuffer,
        docId,
      });
    });

    return () => {
      isMounted = false;
    };
  });

  useEffect(() => {
    return init();
  }, []);

  useEffect(() => {
    return push(isSynced);
  }, [isSynced]);

  useEffect(() => {
    if (!update) return;

    Y.applyUpdate(doc, new Uint8Array(update), "server");
  }, [update, doc]);
}
