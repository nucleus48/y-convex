import { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import { useYConvexSync } from "../../src/react";
import { api } from "../convex/_generated/api";
import "./App.css";

const DOC_ID = "test-doc";

export default function App() {
  const doc = useMemo(() => new Y.Doc(), []);

  useYConvexSync(api.yconvex, DOC_ID, doc);

  return (
    <div className="container">
      <header>
        <h1>Y-Convex Tester</h1>
        <p>Real-time synchronization with Convex and Yjs</p>
      </header>

      <main className="grid">
        <SharedText doc={doc} />
        <SharedMap doc={doc} />
        <SharedArray doc={doc} />
        <SharedCounter doc={doc} />
      </main>

      <DocStatus doc={doc} />
    </div>
  );
}

function SharedText({ doc }: { doc: Y.Doc }) {
  const yText = useMemo(() => doc.getText("content"), [doc]);
  const [text, setText] = useState(() => yText.toString());

  useEffect(() => {
    const observer = () => setText(yText.toString());
    yText.observe(observer);
    return () => yText.unobserve(observer);
  }, [yText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    // Simple diffing algorithm for the demonstration
    doc.transact(() => {
      yText.delete(0, yText.length);
      yText.insert(0, newVal);
    });
  };

  return (
    <section className="card glass">
      <h2>Shared Text</h2>
      <textarea
        value={text}
        onChange={handleChange}
        placeholder="Type something here..."
        className="styled-textarea"
      />
      <div className="preview">
        <strong>Live Preview:</strong>
        <p>{text || "No content yet"}</p>
      </div>
    </section>
  );
}

function SharedMap({ doc }: { doc: Y.Doc }) {
  const yMap = useMemo(() => doc.getMap("settings"), [doc]);
  const [mapData, setMapData] = useState<Record<string, any>>(() =>
    yMap.toJSON(),
  );

  useEffect(() => {
    const observer = () => setMapData(yMap.toJSON());
    yMap.observe(observer);
    return () => yMap.unobserve(observer);
  }, [yMap]);

  const addField = () => {
    const key = prompt("Enter key:");
    const value = prompt("Enter value:");
    if (key && value) {
      yMap.set(key, value);
    }
  };

  return (
    <section className="card glass">
      <h2>Shared Map</h2>
      <div className="map-controls">
        <button onClick={addField} className="btn-primary">
          Add Field
        </button>
      </div>
      <ul className="map-list">
        {Object.entries(mapData).map(([key, val]) => (
          <li key={key}>
            <span className="key">{key}:</span>
            <span className="val">{JSON.stringify(val)}</span>
            <button onClick={() => yMap.delete(key)} className="btn-icon">
              ×
            </button>
          </li>
        ))}
        {Object.keys(mapData).length === 0 && (
          <li className="empty">No fields set</li>
        )}
      </ul>
    </section>
  );
}

function SharedCounter({ doc }: { doc: Y.Doc }) {
  const yMap = useMemo(() => doc.getMap("counter"), [doc]);
  const [count, setCount] = useState(() => yMap.get("value") ?? 0);

  useEffect(() => {
    const observer = () => setCount(yMap.get("value") ?? 0);
    yMap.observe(observer);
    return () => yMap.unobserve(observer);
  }, [yMap]);

  const increment = () => {
    const current = yMap.get("value") ?? 0;
    yMap.set("value", current + 1);
  };

  const decrement = () => {
    const current = yMap.get("value") ?? 0;
    yMap.set("value", current - 1);
  };

  return (
    <section className="card glass">
      <h2>Shared Counter</h2>
      <div className="counter-container">
        <button onClick={decrement} className="btn-circle">
          -
        </button>
        <span className="count">{count}</span>
        <button onClick={increment} className="btn-circle">
          +
        </button>
      </div>
    </section>
  );
}

function SharedArray({ doc }: { doc: Y.Doc }) {
  const yArray = useMemo(() => doc.getArray("list"), [doc]);
  const [items, setItems] = useState<any[]>(() => yArray.toArray());

  useEffect(() => {
    const observer = () => setItems(yArray.toArray());
    yArray.observe(observer);
    return () => yArray.unobserve(observer);
  }, [yArray]);

  const pushItem = () => {
    const val = prompt("Enter item value:");
    if (val) yArray.push([val]);
  };

  return (
    <section className="card glass">
      <h2>Shared Array</h2>
      <div className="map-controls">
        <button onClick={pushItem} className="btn-primary">
          Push Item
        </button>
      </div>
      <div className="array-preview">
        {items.map((it, i) => (
          <div key={i} className="array-item">
            {JSON.stringify(it)}
            <button onClick={() => yArray.delete(i)} className="btn-mini">
              ×
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="empty">Array is empty</p>}
      </div>
    </section>
  );
}

function DocStatus({ doc }: { doc: Y.Doc }) {
  const [clientCount, setClientCount] = useState(1);

  useEffect(() => {
    // Awareness logic could go here
  }, [doc]);

  return (
    <footer>
      <div className="status-item">
        <span className="dot online"></span>
        Convex Synced
      </div>
      <div className="status-item">
        <strong>GUID:</strong> {doc.guid.substring(0, 8)}...
      </div>
    </footer>
  );
}
