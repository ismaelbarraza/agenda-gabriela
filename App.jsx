import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { BOARD_ID, db, firebaseReady, missingFirebaseKeys } from "./firebase";

const days = ["Sábado", "Domingo"];
const blocks = ["Mañana", "Tarde", "Noche"];
const tones = ["parchment", "rose", "sage", "lavender", "gold"];

function generateTimes() {
  const options = [];
  for (let hour = 0; hour <= 23; hour++) {
    for (const minute of ["00", "30"]) {
      options.push(`${String(hour).padStart(2, "0")}:${minute}`);
    }
  }
  return options;
}

const timeOptions = generateTimes();

const initialNotes = [
  {
    id: "1",
    day: "Sábado",
    block: "Mañana",
    time: "09:00",
    title: "Empezar el día juntos",
    details: "Desayuno, café o algo tranquilo para arrancar bonito.",
    done: false,
    x: 16,
    y: 58,
    tone: "parchment",
  },
  {
    id: "2",
    day: "Sábado",
    block: "Tarde",
    time: "15:00",
    title: "Plan diferente",
    details: "Escape room, casa de terror, arcade, museo o algo fuera de lo normal.",
    done: false,
    x: 16,
    y: 58,
    tone: "rose",
  },
  {
    id: "3",
    day: "Sábado",
    block: "Noche",
    time: "20:00",
    title: "Cena / noche",
    details: "Lugar bonito, caminar un rato y cerrar el sábado sin apuro.",
    done: false,
    x: 16,
    y: 58,
    tone: "lavender",
  },
  {
    id: "4",
    day: "Domingo",
    block: "Mañana",
    time: "10:00",
    title: "Brunch o desayuno tarde",
    details: "Algo suave, sin correr. Elegimos juntos.",
    done: false,
    x: 16,
    y: 58,
    tone: "sage",
  },
  {
    id: "5",
    day: "Domingo",
    block: "Tarde",
    time: "16:00",
    title: "Plan libre",
    details: "Película, café, caminar, cocinar algo o improvisar bien.",
    done: false,
    x: 16,
    y: 58,
    tone: "gold",
  },
  {
    id: "6",
    day: "Domingo",
    block: "Noche",
    time: "20:30",
    title: "Cierre del finde",
    details: "Cena ligera, postre o quedarnos conversando.",
    done: false,
    x: 16,
    y: 58,
    tone: "parchment",
  },
];

const toneClass = {
  parchment: "note-parchment",
  rose: "note-rose",
  sage: "note-sage",
  lavender: "note-lavender",
  gold: "note-gold",
};

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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeNote(note, index = 0) {
  return {
    ...note,
    day: days.includes(note.day) ? note.day : index < 3 ? "Sábado" : "Domingo",
    block: blocks.includes(note.block) ? note.block : "Mañana",
    time: timeOptions.includes(note.time) ? note.time : "10:00",
    x: typeof note.x === "number" ? clamp(note.x, 10, 360) : 16,
    y: typeof note.y === "number" ? clamp(note.y, 54, 260) : 58,
    tone: tones.includes(note.tone) ? note.tone : "parchment",
  };
}

function StickyNote({ note, areaRef, onUpdate, onToggle, onDelete, onMove }) {
  const [local, setLocal] = useState(note);

  useEffect(() => {
    setLocal(note);
  }, [note]);

  const changeField = (key, value) => {
    setLocal((current) => ({ ...current, [key]: value }));
    onUpdate(note.id, key, value);
  };

  return (
    <motion.div
      drag
      dragConstraints={areaRef}
      dragElastic={0}
      dragMomentum={false}
      style={{ left: note.x, top: note.y }}
      whileDrag={{ scale: 1.02, rotate: 0, zIndex: 20 }}
      onDragEnd={(_, info) => {
        const area = areaRef.current;
        if (!area) return;

        const rect = area.getBoundingClientRect();
        const noteWidth = window.innerWidth < 760 ? Math.min(230, window.innerWidth - 76) : 244;
        const noteHeight = 228;

        const nextX = clamp(
          Math.round(note.x + info.offset.x),
          8,
          Math.max(8, rect.width - noteWidth - 8)
        );

        const nextY = clamp(
          Math.round(note.y + info.offset.y),
          52,
          Math.max(52, rect.height - noteHeight - 8)
        );

        onMove(note.id, nextX, nextY);
      }}
      className={`sticky-note ${toneClass[note.tone] || "note-parchment"}`}
    >
      <div className="note-top">
        <button onClick={() => onToggle(note.id)} className="check-button" aria-label="Marcar">
          {note.done ? <CheckCircle2 /> : <Circle />}
        </button>

        <select
          value={local.time}
          onChange={(e) => changeField("time", e.target.value)}
          className="time-select"
          aria-label="Hora"
        >
          {timeOptions.map((time) => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>

        <select
          value={local.tone}
          onChange={(e) => changeField("tone", e.target.value)}
          className="tone-select"
          aria-label="Color"
        >
          {tones.map((tone) => (
            <option key={tone} value={tone}>{tone}</option>
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
        placeholder="Notas, lugar, reserva, opción A/B..."
      />

      <div className="note-footer">
        <Feather size={14} />
        <span>{note.day} · {note.block}</span>
      </div>
    </motion.div>
  );
}

function BlockArea({ day, block, notes, children, onAdd }) {
  const areaRef = useRef(null);

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
          <span>{notes.filter((n) => n.done).length}/{notes.length}</span>
          <button onClick={() => onAdd(day, block)} className="mini-add" aria-label={`Agregar en ${block}`}>
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div ref={areaRef} className="block-area">
        <div className="drop-label">Zona protegida</div>
        {React.Children.map(children, (child) =>
          React.isValidElement(child) ? React.cloneElement(child, { areaRef }) : child
        )}
      </div>
    </div>
  );
}

function DayColumn({ day, notes, children, onAdd }) {
  const total = notes.length;
  const done = notes.filter((n) => n.done).length;

  return (
    <section className="day-column">
      <div className="day-header">
        <div className="day-title">
          {day === "Sábado" ? <Stars size={19} /> : <Moon size={19} />}
          <span>{day}</span>
        </div>
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
          >
            {children(block)}
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
    await updateDoc(boardDocRef, {
      notes: nextNotes,
      updatedAt: serverTimestamp(),
    });
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

  const moveNote = (id, x, y) => {
    setNotes((current) => {
      const next = current.map((n) => (n.id === id ? { ...n, x, y } : n));
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

  const addNote = (day, block) => {
    const existing = notes.filter((n) => n.day === day && n.block === block);
    const note = {
      id: String(Date.now()),
      day,
      block,
      time: block === "Mañana" ? "10:00" : block === "Tarde" ? "16:00" : "20:00",
      title: "Nuevo plan",
      details: "Escribe aquí la idea.",
      done: false,
      x: 14 + (existing.length % 2) * 252,
      y: 58 + Math.floor(existing.length / 2) * 232,
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
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero"
        >
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
              {saving && <><Loader2 className="spin" size={14} /> Guardando</>}
              {lastSaved && !saving ? ` · Guardado ${lastSaved}` : ""}
            </span>
          </div>

          <div className="legend">
            <span><b>Tip:</b> agrega planes desde cada bloque y usa la hora en formato 24h.</span>
          </div>
        </div>

        <div className="planner-grid">
          {days.map((day) => {
            const dayNotes = notes.filter((n) => n.day === day);
            return (
              <DayColumn key={day} day={day} notes={dayNotes} onAdd={addNote}>
                {(block) =>
                  dayNotes
                    .filter((note) => note.block === block)
                    .map((note) => (
                      <StickyNote
                        key={note.id}
                        note={note}
                        onUpdate={updateNote}
                        onToggle={toggleNote}
                        onDelete={deleteNote}
                        onMove={moveNote}
                      />
                    ))
                }
              </DayColumn>
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
