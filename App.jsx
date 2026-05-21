import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Sparkles, Wand2, Moon, Sun, CheckCircle2, Circle, Heart, Loader2, AlertTriangle } from "lucide-react";
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { BOARD_ID, db, firebaseReady, missingFirebaseKeys } from "./firebase";

const days = ["Sábado", "Domingo"];
const tones = ["amber", "rose", "violet", "emerald", "sky"];
const initialNotes = [
  ["1","Sábado","7:00 - 9:00","Empezar el día juntos","Desayuno, café o algo tranquilo para arrancar bonito.",24,80,"amber"],
  ["2","Sábado","11:00 - 13:00","Plan diferente","Escape room, casa de terror, museo, arcade o algo que no sea solo comer.",300,110,"rose"],
  ["3","Sábado","20:00 - 23:00","Cena / noche","Lugar bonito, caminar un rato y cerrar el sábado sin apuro.",150,370,"violet"],
  ["4","Domingo","10:00 - 12:00","Brunch o desayuno tarde","Algo suave, sin correr. Elegimos juntos.",24,80,"emerald"],
  ["5","Domingo","15:00 - 18:00","Plan libre","Película, café, caminar, cocinar algo o improvisar bien.",300,110,"sky"],
  ["6","Domingo","20:00 - 23:00","Cierre del finde","Cena ligera, postre o quedarnos conversando.",150,370,"amber"],
].map(([id,day,time,title,details,x,y,tone])=>({id,day,time,title,details,x,y,tone,done:false}));

const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);

function Stars(){
  const stars=useMemo(()=>Array.from({length:60},(_,i)=>({id:i,left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,delay:Math.random()*2,size:Math.random()>0.85?3:2})),[]);
  return <div className="stars">{stars.map(s=><motion.span key={s.id} className="star" style={{left:s.left,top:s.top,width:s.size,height:s.size}} animate={{opacity:[.15,.9,.15],scale:[1,1.4,1]}} transition={{duration:2.8,delay:s.delay,repeat:Infinity}}/>)}<div className="glow glow-left"/><div className="glow glow-right"/></div>;
}

function SetupWarning(){return <div className="setup-screen"><div className="setup-card"><AlertTriangle/><h1>Falta conectar Firebase</h1><p>Revisa las variables de entorno en Vercel.</p><pre>{missingFirebaseKeys.join("\n")}</pre></div></div>}

function Sticky({note,boardRef,onUpdate,onToggle,onDelete,onMove}){
  const [local,setLocal]=useState(note);
  useEffect(()=>setLocal(note),[note]);
  const change=(k,v)=>{setLocal(c=>({...c,[k]:v})); onUpdate(note.id,k,v)};
  return <motion.div drag dragConstraints={boardRef} dragMomentum={false} style={{left:note.x,top:note.y}} whileDrag={{scale:1.03,zIndex:50}} onDragEnd={(_,info)=>{
    const b=boardRef.current?.getBoundingClientRect(); if(!b) return;
    onMove(note.id, clamp(Math.round(note.x+info.offset.x),8,Math.max(8,b.width-278)), clamp(Math.round(note.y+info.offset.y),60,Math.max(60,b.height-280)));
  }} className={`sticky-note note-${note.tone||"amber"}`}>
    <div className="note-top">
      <button className="icon-button" onClick={()=>onToggle(note.id)}>{note.done?<CheckCircle2/>:<Circle/>}</button>
      <select className="day-select" value={local.day} onChange={e=>{change("day",e.target.value);onMove(note.id,24,80)}}>{days.map(d=><option key={d}>{d}</option>)}</select>
      <select className="tone-select" value={local.tone} onChange={e=>change("tone",e.target.value)}>{tones.map(t=><option key={t}>{t}</option>)}</select>
      <button className="delete-button" onClick={()=>onDelete(note.id)}><Trash2/></button>
    </div>
    <input className="note-time" value={local.time} onChange={e=>change("time",e.target.value)} placeholder="Hora"/>
    <input className={`note-title ${note.done?"done":""}`} value={local.title} onChange={e=>change("title",e.target.value)} placeholder="Título"/>
    <textarea className="note-details" value={local.details} onChange={e=>change("details",e.target.value)} placeholder="Notas, lugar, reserva..."/>
    <div className="drag-label">Arrástrame dentro de {note.day}</div>
  </motion.div>
}

function DayBoard({day,notes,refObj,children}){
  return <section className="day-section"><div className="day-header"><div className="day-title">{day==="Sábado"?<Sun/>:<Moon/>}<span>{day}</span></div><div className="day-counter">{notes.filter(n=>n.done).length}/{notes.length} cerrado</div></div><div className="day-board" ref={refObj}><div className="safe-zone-label">Zona de post-its</div>{children}</div></section>
}

export default function App(){
  const satRef=useRef(null), sunRef=useRef(null);
  const boardDocRef=useMemo(()=>db?doc(db,"boards",BOARD_ID):null,[]);
  const [notes,setNotes]=useState(initialNotes),[loaded,setLoaded]=useState(false),[saving,setSaving]=useState(false),[lastSaved,setLastSaved]=useState("");
  useEffect(()=>{ if(!firebaseReady||!boardDocRef) return; return onSnapshot(boardDocRef, async snap=>{ if(!snap.exists()){await setDoc(boardDocRef,{notes:initialNotes,updatedAt:serverTimestamp(),title:"Ismael & Gabriela"}); setNotes(initialNotes)} else {const data=snap.data(); if(Array.isArray(data.notes)) setNotes(data.notes.map((n,i)=>({...n,day:days.includes(n.day)?n.day:(i<3?"Sábado":"Domingo"),x:typeof n.x==="number"?clamp(n.x,8,420):24,y:typeof n.y==="number"?clamp(n.y,60,520):80})))} setLoaded(true)},e=>{console.error(e);setLoaded(true)})},[boardDocRef]);
  const persist=async next=>{ if(!boardDocRef) return; setSaving(true); await updateDoc(boardDocRef,{notes:next,updatedAt:serverTimestamp()}); setSaving(false); setLastSaved(new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"}))};
  const upd=(id,k,v)=>setNotes(cur=>{const next=cur.map(n=>n.id===id?{...n,[k]:v}:n); persist(next); return next});
  const mov=(id,x,y)=>setNotes(cur=>{const next=cur.map(n=>n.id===id?{...n,x,y}:n); persist(next); return next});
  const tog=id=>setNotes(cur=>{const next=cur.map(n=>n.id===id?{...n,done:!n.done}:n); persist(next); return next});
  const del=id=>setNotes(cur=>{const next=cur.filter(n=>n.id!==id); persist(next); return next});
  const add=day=>setNotes(cur=>{const count=cur.filter(n=>n.day===day).length; const next=[...cur,{id:String(Date.now()),day,time:"Hora",title:"Nuevo post-it",details:"Escribe aquí la idea del plan.",done:false,x:24+(count%2)*290,y:80+Math.floor(count/2)*235,tone:tones[cur.length%tones.length]}]; persist(next); return next});
  const progress=notes.length?Math.round(notes.filter(n=>n.done).length/notes.length*100):0;
  const byDay=Object.fromEntries(days.map(d=>[d,notes.filter(n=>n.day===d)]));
  if(!firebaseReady) return <SetupWarning/>;
  return <div className="app-shell"><Stars/><div className="content"><motion.header initial={{opacity:0,y:-18}} animate={{opacity:1,y:0}} className="hero"><div><div className="eyebrow"><Wand2/>Agenda encantada del finde</div><h1>Ismael & Gabriela</h1><p>Dos días, dos tableros. Movemos post-its, elegimos planes y dejamos espacio para improvisar bonito.</p></div><div className="progress-card"><div className="progress-label"><Sparkles/>Plan cerrado</div><div className="progress-number">{progress}%</div><div className="progress-bar"><motion.div animate={{width:`${progress}%`}}/></div></div></motion.header><div className="toolbar"><div className="toolbar-copy"><Heart/> <span>{loaded?"Conectado en tiempo real":"Cargando agenda..."}{saving?" · Guardando":lastSaved?` · Guardado ${lastSaved}`:""}</span>{saving&&<Loader2 className="spin"/>}</div><div className="toolbar-actions"><button className="add-button" onClick={()=>add("Sábado")}><Plus/> Post-it sábado</button><button className="add-button secondary" onClick={()=>add("Domingo")}><Plus/> Post-it domingo</button></div></div><div className="days-grid"><DayBoard day="Sábado" notes={byDay.Sábado} refObj={satRef}>{byDay.Sábado.map(n=><Sticky key={n.id} note={n} boardRef={satRef} onUpdate={upd} onToggle={tog} onDelete={del} onMove={mov}/>)}</DayBoard><DayBoard day="Domingo" notes={byDay.Domingo} refObj={sunRef}>{byDay.Domingo.map(n=><Sticky key={n.id} note={n} boardRef={sunRef} onUpdate={upd} onToggle={tog} onDelete={del} onMove={mov}/>)}</DayBoard></div><footer className="footer"><Heart/> Link compartido para editar juntos. Inspiración mágica, sin logos oficiales.</footer></div></div>
}
