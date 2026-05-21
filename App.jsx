import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Sparkles,
  Wand2,
  Moon,
  CheckCircle2,
  Circle,
  Feather,
  Heart,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { BOARD_ID, db, firebaseReady, missingFirebaseKeys } from "./firebase";

const initialNotes = [
  {
    id: "1",
    day: "Sábado",
    time: "7:00 - 9:00",
    title: "Empezar el día juntos",
    details: "Desayuno, café o algo tranquilo para arrancar bonito.",
    done: false,
    x: 20,
    y: 120,
    tone: "amber",
  },
  {
    id: "2",
    day: "Sábado",
    time: "11:00 - 13:00",
    title: "Plan diferente",
    details: "Escape room, casa de terror, museo, arcade o algo que no sea solo comer.",
    done: false,
    x: 310,
    y: 150,
    tone: "rose",
  },
  {
    id: "3",
    day: "Sábado",
    time: "20:00 - 23:00",
    title: "Cena / noche",
    details: "Lugar bonito, caminar un rato y cerrar el sábado sin apuro.",
    done: false,
    x: 600,
    y: 135,
    tone: "violet",
  },
  {
    id: "4",
    day: "Domingo",
    time: "10:00 - 12:00",
    title: "Brunch o desayuno tarde",
    details: "Algo suave, sin correr. Elegimos juntos.",
    done: false,
    x: 90,
    y: 420,
    tone: "emerald",
  },
  {
    id: "5",
    day: "Domingo",
    time: "15:00 - 18:00",
    title: "Plan libre",
    details: "Película, café, caminar, cocinar algo o improvisar bien.",
    done: false,
    x: 410,
    y: 450,
    tone: "sky",
  },
  {
    id: "6",
    day: "Domingo",
    time: "20:00 - 23:00",
    title: "Cierre del finde",
    details: "Cena ligera, postre o quedarnos conversando.",
    done: false,
    x: 700,
    y: 420,
    tone: "amber",
  },
];

const toneClass = {
  amber: "note-amber",
  rose: "note-rose",
  violet: "note-violet",
  emerald: "note-emerald",
  sky: "note-sky",
};

const toneOptions = ["amber", "rose", "violet", "emerald", "sky"];

function MagicalStars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 65 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: Math.random() * 2,
        size: Math.random() > 0.82 ? 3 : 2,
      })),
    []
  );

  return (
    <div className="stars" aria-hidden="true">
      {stars.map((star) => (
        <motion.span
          key={star.id}
          className="star"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
          }}
          animate={{ opacity: [0.15, 0.9, 0.15], scale: [1, 1.45, 1] }}
          transition={{ duration: 2.8, delay: star.delay, repeat: Infinity }}
        />
      ))}
      <div className="glow glow-left" />
      <div className="glow glow-right" />
    </div>
  );
}

function SetupWarning() {
  return (
    <div className="setup-screen">
      <div className="setup-card">
        <AlertTriangle size={32} />
        <h1>Falta conectar Firebase</h1>
        <p>
          La app está lista, pero faltan variables de entorno. Revisa el archivo
          <code>.env.example</code> y pega esos valores en Vercel.
        </p>
        <pre>{missingFirebaseKeys.join("\n")}</pre>
      </div>
    </div>
  );
}

function StickyNote({ note, constraintsRef, onUpdate, onToggle, onDelete, onMove }) {
  const [local, setLocal] = useState(note);

  useEffect(() => {
    setLocal(note);
  }, [note]);

  const commitField = (key, value) => {
    onUpdate(note.id, key, value);
  };

  const changeField = (key, value) => {
    setLocal((current) => ({ ...current, [key]: value }));
    commitField(key, value);
  };

  return (
    <motion.div
      drag
      dragConstraints={constraintsRef}
      dragMomentum={false}
      style={{ left: note.x, top: note.y }}
      whileDrag={{ scale: 1.04, rotate: 0, zIndex: 50 }}
      onDragEnd={(_, info) => {
        const nextX = Math.max(0, Math.round(note.x + info.offset.x));
        const nextY = Math.max(0, Math.round(note.y + info.offset.y));
        onMove(note.id, nextX, nextY);
      }}
      className={`sticky-note ${toneClass[note.tone] || "note-amber"}`}
    >
      <div className="note-top">
        <button onClick={() => onToggle(note.id)} className="icon-button" aria-label="Marcar como elegido">
          {note.done ? <CheckCircle2 /> : <Circle />}
        </button>

        <select
          value={local.tone}
          onChange={(e) => changeField("tone", e.target.value)}
          className="tone-select"
          aria-label="Color del post-it"
        >
          {toneOptions.map((tone) => (
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
        value={local.day}
        onChange={(e) => changeField("day", e.target.value)}
        className="note-day"
        placeholder="Día"
      />

      <input
        value={local.time}
        onChange={(e) => changeField("time", e.target.value)}
        className="note-time"
        placeholder="Hora"
      />

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
        placeholder="Notas, opciones, lugar, reserva..."
      />

      <div className="drag-label">
        <Feather size={15} /> Arrástrame
      </div>
    </motion.div>
  );
}

export default function App() {
  const boardRef = useRef(null);
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
            title: "Ismael & Gabriela",
          });
          setNotes(initialNotes);
        } else {
          const data = snapshot.data();
          if (Array.isArray(data.notes)) setNotes(data.notes);
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

  const addNote = () => {
    const tone = toneOptions[notes.length % toneOptions.length];
    const note = {
      id: String(Date.now()),
      day: "Nuevo",
      time: "Hora",
      title: "Nuevo post-it",
      details: "Escribe aquí la idea del plan.",
      done: false,
      x: 60 + (notes.length % 3) * 280,
      y: 210 + (notes.length % 2) * 220,
      tone,
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
      <MagicalStars />

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
            <h1>Ismael & Gabriela</h1>
            <p>
              Movemos los planes como post-its, marcamos lo que queda elegido y dejamos espacio para improvisar bonito.
            </p>
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
            <Moon size={16} />
            <span>
              {loaded ? "Conectado en tiempo real" : "Cargando agenda..."}
              {saving && <><Loader2 className="spin" size={14} /> Guardando</>}
              {lastSaved && !saving ? ` · Guardado ${lastSaved}` : ""}
            </span>
          </div>
          <button onClick={addNote} className="add-button">
            <Plus size={17} /> Agregar post-it
          </button>
        </div>

        <main ref={boardRef} className="board">
          <div className="board-label">Sábado & Domingo</div>

          {!loaded && (
            <div className="loading">
              <Loader2 className="spin" /> Cargando agenda compartida...
            </div>
          )}

          {notes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              constraintsRef={boardRef}
              onUpdate={updateNote}
              onToggle={toggleNote}
              onDelete={deleteNote}
              onMove={moveNote}
            />
          ))}
        </main>

        <footer className="footer">
          <Heart size={14} /> Link compartido para editar juntos. Inspiración mágica, sin logos oficiales.
        </footer>
      </div>
    </div>
  );
}
