import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Sparkles,
  Wand2,
  CheckCircle2,
  Circle,
  Feather,
  Heart,
  Loader2,
  AlertTriangle,
  Sun,
  Moon,
  Stars,
  ArrowUpDown,
} from "lucide-react";
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { BOARD_ID, db, firebaseReady, missingFirebaseKeys } from "./firebase";

const days = ["Sábado", "Domingo"];
const blocks = ["Mañana", "Tarde", "Noche"];
const tones = ["parchment", "rose", "sage", "lavender", "gold"];

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

function orderedBlock(list) {
  return list
    .slice()
    .sort((a, b) => {
      const sa = Number.isFinite(a.slot) ? a.slot : 9999;
      const sb = Number.isFinite(b.slot) ? b.slot : 9999;
      if (sa !== sb) return sa - sb;
      const byTime = a.time.localeCompare(b.time);
      if (byTime !== 0) return byTime;
      return String(a.id).localeCompare(String(b.id));
    })
    .map((note, index) => ({ ...note, slot: index }));
}

function MagicalBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: Math.random() * 2.5,
        size: Math.random() > 0.86 ? 3 : 2,
      })),
    []
  );

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

function StickyNote({ note, index, total, onUpdate, onToggle, onDelete, onSwapSlot }) {
  const [local, setLocal] = useState(note);

  useEffect(() => setLocal(note), [note]);

  const changeField = (key, value) => {
    setLocal((current) => ({ ...current, [key]: value }));
    onUpdate(note.id, key, value);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 430, damping: 34 }}
      className={`sticky-note ${toneClass[note.tone] || "note-parchment"}`}
    >
      <div className="note-top">
        <button onClick={() => onToggle(note.id)} className="check-button" aria-label="Marcar">
          {note.done ? <CheckCircle2 /> : <Circle />}
        </button>

        <select value={local.time} onChange={(e) => changeField("time", e.target.value)} className="time-select" aria-label="Hora">
          {timeOptions.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>

        <select value={local.tone} onChange={(e) => changeField("tone", e.target.value)} className="tone-select" aria-label="Color">
          {tones.map((tone) => (
            <option key={tone} value={tone}>
              {tone}
            </option>
          ))}
        </select>

        <button onClick={() => onDelete(note.id)} className="delete-button" aria-label="Eliminar">
          <Trash2 />
        </button>
      </div>

      <input
        value={local.title}
        onChange={(e) => changeField("title", e.target.value)}
        className={`note-title ${note.done ? "done" : ""}`}
        placeholder="Título del plan"
      />

      <textarea
        value={local.details}
        onChange={(e) => changeField("details", e.target.value)}
        className="note-details"
        placeholder="Notas, lugar, reserva..."
      />

      <div className="note-footer">
        <span className="slot-label">
          <Feather size={13} /> Slot
        </span>

        <select
          value={index}
          onChange={(e) => onSwapSlot(note.id, Number(e.target.value))}
          className="slot-select"
          aria-label="Cambiar slot"
        >
          {Array.from({ length: total }, (_, i) => (
            <option key={i} value={i}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>
    </motion.div>
  );
}

function BlockArea({ day, block, notes, renderNotes, onAdd, onOrganize }) {
  const ordered = orderedBlock(notes);

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
          <span>
            {ordered.filter((n) => n.done).length}/{ordered.length}
          </span>
          <button onClick={onOrganize} className="mini-organize">
            Ordenar
          </button>
          <button onClick={() => onAdd(day, block)} className="mini-add" aria-label={`Agregar en ${block}`}>
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="real-grid-area">
        <div className="grid-label">Slots reales: 1 · 2 · 3 / 4 · 5 · 6</div>

        {ordered.length === 0 ? (
          <div className="empty-block">Agrega un plan con +</div>
        ) : (
          <div className="notes-grid">
            {renderNotes(ordered)}
          </div>
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
        <div className="day-title">
          {day === "Sábado" ? <Stars size={19} /> : <Moon size={19} />}
          <span>{day}</span>
        </div>
        <div className="day-count">
          {done}/{total} elegido
        </div>
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
            renderNotes={(ordered) => renderBlockNotes(day, block, ordered)}
          />
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

    const unsubscribe = onSnapshot(
      boardDocRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          await setDoc(boardDocRef, {
            notes: initialNotes,
            updatedAt: serverTimestamp(),
            title: "Gabriela e Ismael",
          });
          setNotes(initialNotes);
        } else {
          const data = snapshot.data();
          if (Array.isArray(data.notes)) {
            setNotes(data.notes.map(normalizeNote));
          }
        }
        setLoaded(true);
      },
      (error) => {
        console.error(error);
        setLoaded(true);
      }
    );

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
      const deleted = current.find((n) => n.id === id);
      const nextRaw = current.filter((n) => n.id !== id);

      if (!deleted) {
        persistNotes(nextRaw);
        return nextRaw;
      }

      const rest = nextRaw.filter((n) => !(n.day === deleted.day && n.block === deleted.block));
      const blockNotes = nextRaw.filter((n) => n.day === deleted.day && n.block === deleted.block);
      const locked = orderedBlock(blockNotes);

      const next = [...rest, ...locked];
      persistNotes(next);
      return next;
    });
  };

  const swapSlot = (id, targetIndex) => {
    setNotes((current) => {
      const dragged = current.find((n) => n.id === id);
      if (!dragged) return current;

      const blockNotes = orderedBlock(current.filter((n) => n.day === dragged.day && n.block === dragged.block));
      const sourceIndex = blockNotes.findIndex((n) => n.id === id);

      if (sourceIndex < 0 || sourceIndex === targetIndex) return current;

      const reordered = blockNotes.slice();
      const temp = reordered[sourceIndex];
      reordered[sourceIndex] = reordered[targetIndex];
      reordered[targetIndex] = temp;

      const locked = reordered.map((n, i) => ({ ...n, slot: i }));
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
      const locked = orderedBlock(blockNotes);
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
          next = [...next, ...orderedBlock(blockNotes)];
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
            <div className="eyebrow">
              <Wand2 size={16} /> Agenda encantada del finde
            </div>
            <h1>Gabriela e Ismael</h1>
            <p>Itinerario para nuestro primer fin de semana. #Noseaceptandevoluciones. #Alohomora</p>
          </div>

          <div className="progress-card">
            <div className="progress-label">
              <Sparkles size={16} /> Plan cerrado
            </div>
            <div className="progress-number">{progress}%</div>
            <div className="progress-bar">
              <motion.div animate={{ width: `${progress}%` }} />
            </div>
          </div>
        </motion.header>

        <div className="toolbar">
          <div className="toolbar-copy">
            <Heart size={16} />
            <span>
              {loaded ? "Conectado en tiempo real" : "Cargando agenda..."}
              {saving && (
                <>
                  <Loader2 className="spin" size={14} /> Guardando
                </>
              )}
              {lastSaved && !saving ? ` · Guardado ${lastSaved}` : ""}
            </span>
          </div>

          <div className="legend">
            <button className="organize-all" onClick={organizeAll}>
              <ArrowUpDown size={14} /> Fijar slots
            </button>
            <span>
              <b>Sin drag:</b> cambia el número de slot y se intercambian. Así no se sobreponen.
            </span>
          </div>
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
                renderBlockNotes={(renderDay, block, ordered) =>
                  ordered.map((note, index) => (
                    <StickyNote
                      key={note.id}
                      note={note}
                      index={index}
                      total={ordered.length}
                      onUpdate={updateNote}
                      onToggle={toggleNote}
                      onDelete={deleteNote}
                      onSwapSlot={swapSlot}
                    />
                  ))
                }
              />
            );
          })}
        </div>

        <footer className="footer">
          <Heart size={14} /> Mapa mágico privado para ordenar el finde sin quitarle espontaneidad.
        </footer>
      </div>
    </div>
  );
}
