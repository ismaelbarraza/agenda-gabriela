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

const CARD_W = 204;
const CARD_H = 176;
const GAP = 14;
const TOP_PAD = 54;
const SIDE_PAD = 12;

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
    x: 12,
    y: 54,
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
    x: 12,
    y: 54,
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
    x: 12,
    y: 54,
    tone: "lavender",
  },
  {
    id: "4",
    day: "Domingo",
    block: "Mañana",
    time: "10:00",
    title: "Brunch",
    details: "Algo suave, sin correr. Elegimos juntos.",
    done: false,
    x: 12,
    y: 54,
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
    x: 12,
    y: 54,
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
    x: 12,
    y: 54,
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

function getColumns(width) {
  if (!width) return 2;
  return Math.max(1, Math.floor((width - SIDE_PAD * 2 + GAP) / (CARD_W + GAP)));
}

function getGridPosition(index, columns) {
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: SIDE_PAD + col * (CARD_W + GAP),
    y: TOP_PAD + row * (CARD_H + GAP),
  };
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
    x: typeof note.x === "number" ? clamp(note.x, SIDE_PAD, 420) : SIDE_PAD,
    y: typeof note.y === "number" ? clamp(note.y, TOP_PAD, 500) : TOP_PAD,
    tone: tones.includes(note.tone) ? note.tone : "parchment",
  };
}

function layoutNotes(notes, widthByKey = {}) {
  const grouped = {};

  for (const note of notes.map(normalizeNote)) {
    const key = `${note.day}-${note.block}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(note);
  }

  const laidOut = [];

  Object.entries(grouped).forEach(([key, list]) => {
    const width = widthByKey[key] || 680;
    const columns = getColumns(width);

    list
      .slice()
      .sort((a, b) => {
        const byTime = a.time.localeCompare(b.time);
        if (byTime !== 0) return byTime;
        return String(a.id).localeCompare(String(b.id));
      })
      .forEach((note, index) => {
        const pos = getGridPosition(index, columns);
        laidOut.push({ ...note, x: pos.x, y: pos.y });
      });
  });

  return laidOut;
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

        const nextX = clamp(
          Math.round(note.x + info.offset.x),
          SIDE_PAD,
          Math.max(SIDE_PAD, rect.width - CARD_W - SIDE_PAD)
        );

        const nextY = clamp(
          Math.round(note.y + info.offset.y),
          TOP_PAD,
          Math.max(TOP_PAD, rect.height - CARD_H - 12)
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
        placeholder="Notas, lugar, reserva..."
      />

      <div className="note-footer">
        <Feather size={13} />
        <span>{note.day} · {note.block}</span>
      </div>
    </motion.div>
  );
}

function BlockArea({ day, block, notes, children, onAdd, onOrganize }) {
  const areaRef = useRef(null);
  const [width, setWidth] = useState(680);

  useEffect(() => {
    if (!areaRef.current) return;

    const update = () => setWidth(areaRef.current?.getBoundingClientRect().width || 680);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(areaRef.current);
    return () => observer.disconnect();
  }, []);

  const columns = getColumns(width);
  const height = getBlockHeight(notes.length, columns);

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
          <button onClick={onOrganize} className="mini-organize" aria-label="Ordenar bloque">
            Ordenar
          </button>
          <button onClick={() => onAdd(day, block, width)} className="mini-add" aria-label={`Agregar en ${block}`}>
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div ref={areaRef} className="block-area" style={{ height }}>
        <div className="drop-label">Se expande solo</div>
        {React.Children.map(children, (child) =>
          React.isValidElement(child) ? React.cloneElement(child, { areaRef }) : child
        )}
      </div>
    </div>
  );
}

function DayColumn({ day, notes, children, onAdd, onOrganizeBlock }) {
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
            onOrganize={() => onOrganizeBlock(day, block)}
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

  const organizeBlock = (day, block) => {
    setNotes((current) => {
      const blockNotes = current.filter((n) => n.day === day && n.block === block);
      const otherNotes = current.filter((n) => !(n.day === day && n.block === block));
      const organized = layoutNotes(blockNotes);
      const next = [...otherNotes, ...organized];
      persistNotes(next);
      return next;
    });
  };

  const organizeAll = () => {
    setNotes((current) => {
      const next = layoutNotes(current);
      persistNotes(next);
      return next;
    });
  };

  const addNote = (day, block, width = 680) => {
    const existing = notes.filter((n) => n.day === day && n.block === block);
    const columns = getColumns(width);
    const pos = getGridPosition(existing.length, columns);

    const note = {
      id: String(Date.now()),
      day,
      block,
      time: block === "Mañana" ? "10:00" : block === "Tarde" ? "16:00" : "20:00",
      title: "Nuevo plan",
      details: "Escribe aquí la idea.",
      done: false,
      x: pos.x,
      y: pos.y,
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
            <button className="organize-all" onClick={organizeAll}>Ordenar todo</button>
            <span><b>Tip:</b> si se desordena, usa “Ordenar”.</span>
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
              >
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
