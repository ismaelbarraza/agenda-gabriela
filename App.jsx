import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { Plus, Trash2, Sparkles, Wand2, CheckCircle2, Circle, Feather, Heart, Loader2, AlertTriangle, Sun, Moon, Stars, Move } from "lucide-react";
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { BOARD_ID, db, firebaseReady, missingFirebaseKeys } from "./firebase";

const days = ["Sábado", "Domingo"];
const blocks = ["Mañana", "Tarde", "Noche"];
const tones = ["parchment", "rose", "sage", "lavender", "gold"];

const CARD_W = 204;
const CARD_H = 176;
const GAP = 14;
const TOP_PAD = 54;
const SIDE_PAD = 14;
const MAX_COLUMNS = 3;

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const initialNotes = [
  { id: "1", day: "Sábado", block: "Mañana", slot: 0, time: "09:00", title: "Empezar el día juntos", details: "Desayuno, café o algo tranquilo para arrancar bonito.", done: false, tone: "parchment" },
  { id: "2", day: "Sábado", block: "Tarde", slot: 0, time: "15:00", title: "Plan diferente", details: "Escape room, casa de terror, arcade, museo o algo fuera de lo normal.", done: false, tone: "rose" },
  { id: "3", day: "Sábado", block: "Noche", slot: 0, time: "20:00", title: "Cena / noche", details: "Lugar bonito, caminar un rato y cerrar el sábado sin apuro.", done: false, tone: "lavender" },
  { id: "4", day: "Domingo", block: "Mañana", slot: 0, time: "10:00", title: "Brunch", details: "Algo suave, sin correr. Elegimos juntos.", done: false, tone: "sage" },
  { id: "5", day: "Domingo", block: "Tarde", slot: 0, time: "16:00", title: "Plan libre", details: "Película, café, caminar, cocinar algo o improvisar bien.", done: false, tone: "gold" },
  { id: "6", day: "Domingo", block: "Noche", slot: 0, time: "20:30", title: "Cierre del finde", details: "Cena ligera, postre o quedarnos conversando.", done: false, tone: "parchment" },
];

const toneClass = {
  parchment: "note-parchment",
  rose: "note-rose",
  sage: "note-sage",
  lavender: "note-lavender",
  gold: "note-gold",
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getColumns(width) {
  const possible = Math.floor((width - SIDE_PAD * 2 + GAP) / (CARD_W + GAP));
  return clamp(Math.min(MAX_COLUMNS, possible || 1), 1, MAX_COLUMNS);
}

function getGridPosition(index, columns) {
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: SIDE_PAD + col * (CARD_W + GAP),
    y: TOP_PAD + row * (CARD_H + GAP),
  };
}

function getIndexFromXY(x, y, columns, maxIndex) {
  const col = clamp(Math.round((x - SIDE_PAD) / (CARD_W + GAP)), 0, columns - 1);
  const row = Math.max(0, Math.round((y - TOP_PAD) / (CARD_H + GAP)));
  return clamp(row * columns + col, 0, maxIndex);
}

function getBlockHeight(count, columns) {
  const rows = Math.max(1, Math.ceil(count / Math.max(1, columns)));
  return TOP_PAD + rows * CARD_H + Math.max(0, rows - 1) * GAP + 24;
}

function normalizeNote(note, index = 0) {
  return {
    ...note,
    day: days.includes(note.day) ? note.day : index < 3 ? "Sábado" : "Domingo",
    block: blocks.includes(note.block) ? note.block : "Mañana",
    time: timeOptions.includes(note.time) ? note.time : "10:00",
    tone: tones.includes(note.tone) ? note.tone : "parchment",
    slot: Number.isFinite(note.slot) ? note.slot : index,
  };
}

function orderBlockNotes(list) {
  return list.slice().sort((a, b) => {
    const sa = Number.isFinite(a.slot) ? a.slot : 9999;
    const sb = Number.isFinite(b.slot) ? b.slot : 9999;
    if (sa !== sb) return sa - sb;
    const byTime = a.time.localeCompare(b.time);
    if (byTime !== 0) return byTime;
    return String(a.id).localeCompare(String(b.id));
  });
}

function relockBlock(list) {
  return orderBlockNotes(list).map((note, index) => ({ ...note, slot: index }));
}

function MagicalBackground() {
  const particles = useMemo(() => Array.from({ length: 90 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: Math.random() * 2.5,
    size: Math.random() > 0.86 ? 3 : 2,
  })), []);

  return (
    <div className="magic-bg" aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="magic-dot"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ opacity: [0.12, 0.82, 0.12], scale: [1, 1.5, 1] }}
          transition={{ duration: 3, delay: p.delay, repeat: Infinity }}
        />
      ))}
      <div className="orb orb-left" />
      <div className="orb orb-right" />
    </div>
  );
}

function SetupWarning() {
  return (
    <div className="setup-screen">
      <div className="setup-card">
        <AlertTriangle size={34} />
        <h1>Falta conectar Firebase</h1>
        <p>Revisa las variables de entorno en Vercel.</p>
        <pre>{missingFirebaseKeys.join("\n")}</pre>
      </div>
    </div>
  );
}

function StickyNote({ note, areaRef, columns, slot, onUpdate, onToggle, onDelete, onDropToSlot }) {
  const [local, setLocal] = useState(note);
  const controls = useDragControls();
  const pos = getGridPosition(slot, columns);

  useEffect(() => setLocal(note), [note]);

  const changeField = (key, value) => {
    setLocal((current) => ({ ...current, [key]: value }));
    onUpdate(note.id, key, value);
  };

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={controls}
      dragConstraints={areaRef}
      dragElastic={0}
      dragMomentum={false}
      animate={{ left: pos.x, top: pos.y }}
      transition={{ type: "spring", stiffness: 500, damping: 38 }}
      whileDrag={{ scale: 1.03, zIndex: 20 }}
      onDragEnd={(_, info) => {
        const targetIndex = getIndexFromXY(pos.x + info.offset.x, pos.y + info.offset.y, columns, 999);
        onDropToSlot(note.id, targetIndex);
      }}
      className={`sticky-note ${toneClass[note.tone] || "note-parchment"}`}
    >
      <div className="note-top">
        <button onClick={() => onToggle(note.id)} className="check-button" aria-label="Marcar">
          {note.done ? <CheckCircle2 /> : <Circle />}
        </button>
        <select value={local.time} onChange={(e) => changeField("time", e.target.value)} className="time-select" aria-label="Hora">
          {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
        </select>
        <select value={local.tone} onChange={(e) => changeField("tone", e.target.value)} className="tone-select" aria-label="Color">
          {tones.map((tone) => <option key={tone} value={tone}>{tone}</option>)}
        </select>
        <button onClick={() => onDelete(note.id)} className="delete-button" aria-label="Eliminar"><Trash2 /></button>
      </div>

      <input value={local.title} onChange={(e) => changeField("title", e.target.value)} className={`note-title ${note.done ? "done" : ""}`} placeholder="Título del plan" />
      <textarea value={local.details} onChange={(e) => changeField("details", e.target.value)} className="note-details" placeholder="Notas, lugar, reserva..." />

      <div className="note-footer">
        <span className="note-slot"><Feather size={13} /> Slot {slot + 1}</span>
        <button
          className="move-handle"
          onPointerDown={(event) => controls.start(event)}
          aria-label="Mover post-it"
          title="Mover"
        >
          <Move size={13} /> Mover
        </button>
      </div>
    </motion.div>
  );
}

function SlotGuide({ count, columns }) {
  const slots = Array.from({ length: Math.max(count, columns) }, (_, i) => i);
  return (
    <>
      {slots.map((slot) => {
        const pos = getGridPosition(slot, columns);
        return (
          <div key={slot} className="slot-guide" style={{ left: pos.x, top: pos.y }}>
            {slot + 1}
          </div>
        );
      })}
    </>
  );
}

function BlockArea({ day, block, notes, children, onAdd, onOrganize }) {
  const areaRef = useRef(null);
  const [width, setWidth] = useState(760);

  useEffect(() => {
    if (!areaRef.current) return;
    const update = () => setWidth(areaRef.current?.getBoundingClientRect().width || 760);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(areaRef.current);
    return () => observer.disconnect();
  }, []);

  const columns = getColumns(width);
  const ordered = relockBlock(notes);
  const height = getBlockHeight(ordered.length, columns);

  return (
    <div className="block-card">
      <div className="block-header">
        <div className="block-title">
          {block === "Mañana" && <Sun size={16} />}
          {block === "Tarde" && <Sparkles size={16} />}
          {block === "Noche" && <Moon size={16} />}
          <span>{block}</span>
        </div>
        <div className="block-actions">
          <span>{ordered.filter((n) => n.done).length}/{ordered.length}</span>
          <button onClick={onOrganize} className="mini-organize" aria-label="Ordenar bloque">Ordenar</button>
          <button onClick={() => onAdd(day, block)} className="mini-add" aria-label={`Agregar en ${block}`}><Plus size={15} /></button>
        </div>
      </div>

      <div ref={areaRef} className="block-area" style={{ height }}>
        <div className="drop-label">{columns === 3 ? "Slots fijos 1 · 2 · 3" : `${columns} columna${columns > 1 ? "s" : ""}`}</div>
        <SlotGuide count={ordered.length} columns={columns} />
        {React.Children.map(children(ordered, columns), (child) =>
          React.isValidElement(child) ? React.cloneElement(child, { areaRef }) : child
        )}
      </div>
    </div>
  );
}

function DayColumn({ day, notes, renderBlockNotes, onAdd, onOrganizeBlock }) {
  const total = notes.length;
  const done = notes.filter((n) => n.done).length;

  return (
    <section className="day-column">
      <div className="day-header">
        <div className="day-title">{day === "Sábado" ? <Stars size={19} /> : <Moon size={19} />}<span>{day}</span></div>
        <div className="day-count">{done}/{total} elegido</div>
      </div>

      <div className="day-blocks">
        {blocks.map((block) => (
          <BlockArea
            key={`${day}-${block}`}
            day={day}
            block={block}
            notes={notes.filter((n) => n.block === block)}
            onAdd={onAdd}
            onOrganize={() => onOrganizeBlock(day, block)}
          >
            {(ordered, columns) => renderBlockNotes(day, block, ordered, columns)}
          </BlockArea>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const boardDocRef = useMemo(() => (db ? doc(db, "boards", BOARD_ID) : null), []);
  const [notes, setNotes] = useState(initialNotes);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState("");

  useEffect(() => {
    if (!firebaseReady || !boardDocRef) return;

    const unsubscribe = onSnapshot(boardDocRef, async (snapshot) => {
      if (!snapshot.exists()) {
        await setDoc(boardDocRef, { notes: initialNotes, updatedAt: serverTimestamp(), title: "Gabriela e Ismael" });
        setNotes(initialNotes);
      } else {
        const data = snapshot.data();
        if (Array.isArray(data.notes)) setNotes(data.notes.map(normalizeNote));
      }
      setLoaded(true);
    }, (error) => {
      console.error(error);
      setLoaded(true);
    });

    return unsubscribe;
  }, [boardDocRef]);

  const persistNotes = async (nextNotes) => {
    if (!boardDocRef) return;
    setSaving(true);
    await updateDoc(boardDocRef, { notes: nextNotes, updatedAt: serverTimestamp() });
    setSaving(false);
    setLastSaved(new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }));
  };

  const updateNote = (id, key, value) => {
    setNotes((current) => {
      const next = current.map((n) => (n.id === id ? { ...n, [key]: value } : n));
      persistNotes(next);
      return next;
    });
  };

  const toggleNote = (id) => {
    setNotes((current) => {
      const next = current.map((n) => (n.id === id ? { ...n, done: !n.done } : n));
      persistNotes(next);
      return next;
    });
  };

  const deleteNote = (id) => {
    setNotes((current) => {
      const next = current.filter((n) => n.id !== id);
      persistNotes(next);
      return next;
    });
  };

  const dropToSlot = (id, targetIndex) => {
    setNotes((current) => {
      const dragged = current.find((n) => n.id === id);
      if (!dragged) return current;

      const blockNotes = relockBlock(current.filter((n) => n.day === dragged.day && n.block === dragged.block));
      const max = blockNotes.length - 1;
      const safeTarget = clamp(targetIndex, 0, max);
      const source = blockNotes.findIndex((n) => n.id === id);
      if (source < 0 || source === safeTarget) return current;

      const reordered = blockNotes.slice();
      const temp = reordered[source];
      reordered[source] = reordered[safeTarget];
      reordered[safeTarget] = temp;

      const locked = reordered.map((n, index) => ({ ...n, slot: index }));
      const rest = current.filter((n) => !(n.day === dragged.day && n.block === dragged.block));
      const next = [...rest, ...locked];

      persistNotes(next);
      return next;
    });
  };

  const organizeBlock = (day, block) => {
    setNotes((current) => {
      const blockNotes = current.filter((n) => n.day === day && n.block === block);
      const rest = current.filter((n) => !(n.day === day && n.block === block));
      const locked = relockBlock(blockNotes);
      const next = [...rest, ...locked];
      persistNotes(next);
      return next;
    });
  };

  const organizeAll = () => {
    setNotes((current) => {
      let next = [];
      for (const day of days) {
        for (const block of blocks) {
          const blockNotes = current.filter((n) => n.day === day && n.block === block);
          next = [...next, ...relockBlock(blockNotes)];
        }
      }
      persistNotes(next);
      return next;
    });
  };

  const addNote = (day, block) => {
    const existing = notes.filter((n) => n.day === day && n.block === block);
    const note = {
      id: String(Date.now()),
      day,
      block,
      slot: existing.length,
      time: block === "Mañana" ? "10:00" : block === "Tarde" ? "16:00" : "20:00",
      title: "Nuevo plan",
      details: "Escribe aquí la idea.",
      done: false,
      tone: tones[notes.length % tones.length],
    };

    setNotes((current) => {
      const next = [...current, note];
      persistNotes(next);
      return next;
    });
  };

  const progress = useMemo(() => {
    if (!notes.length) return 0;
    return Math.round((notes.filter((n) => n.done).length / notes.length) * 100);
  }, [notes]);

  if (!firebaseReady) return <SetupWarning />;

  return (
    <div className="app-shell">
      <MagicalBackground />
      <div className="content">
        <motion.header initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Wand2 size={16} /> Agenda encantada del finde</div>
            <h1>Gabriela e Ismael</h1>
            <p>Itinerario para nuestro primer fin de semana. #Noseaceptandevoluciones. #Alohomora</p>
          </div>
          <div className="progress-card">
            <div className="progress-label"><Sparkles size={16} /> Plan cerrado</div>
            <div className="progress-number">{progress}%</div>
            <div className="progress-bar"><motion.div animate={{ width: `${progress}%` }} /></div>
          </div>
        </motion.header>

        <div className="toolbar">
          <div className="toolbar-copy"><Heart size={16} /><span>{loaded ? "Conectado en tiempo real" : "Cargando agenda..."}{saving && <><Loader2 className="spin" size={14} /> Guardando</>}{lastSaved && !saving ? ` · Guardado ${lastSaved}` : ""}</span></div>
          <div className="legend"><button className="organize-all" onClick={organizeAll}>Bloquear en slots</button><span><b>Celular:</b> usa el botón “Mover” del post-it; fuera de ese botón puedes scrollear.</span></div>
        </div>

        <div className="planner-grid">
          {days.map((day) => {
            const dayNotes = notes.filter((n) => n.day === day);
            return (
              <DayColumn
                key={day}
                day={day}
                notes={dayNotes}
                onAdd={addNote}
                onOrganizeBlock={organizeBlock}
                renderBlockNotes={(renderDay, block, ordered, columns) =>
                  ordered.map((note, index) => (
                    <StickyNote
                      key={note.id}
                      note={note}
                      slot={index}
                      columns={columns}
                      onUpdate={updateNote}
                      onToggle={toggleNote}
                      onDelete={deleteNote}
                      onDropToSlot={dropToSlot}
                    />
                  ))
                }
              />
            );
          })}
        </div>

        <footer className="footer"><Heart size={14} /> Mapa mágico privado para ordenar el finde sin quitarle espontaneidad.</footer>
      </div>
    </div>
  );
}
