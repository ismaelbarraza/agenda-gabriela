# Agenda encantada — Ismael & Gabriela

Mini web romántica con post-its arrastrables, checklist y edición en tiempo real usando:

- React + Vite
- Firebase Firestore
- Vercel

## Qué hace

- Ambos abren el mismo link.
- Los post-its se sincronizan en tiempo real.
- Puedes editar título, día, hora y detalles.
- Puedes marcar planes como elegidos.
- Puedes arrastrar post-its.
- Puedes agregar y borrar post-its.

## Importante

No pongas información sensible. La seguridad básica usa un `BOARD_ID` difícil de adivinar y reglas simples de Firestore. Para algo serio habría que agregar login.

---

# Pasos rápidos

## 1. Crear proyecto en Firebase

1. Entra a Firebase Console.
2. Crea un proyecto nuevo.
3. Nombre sugerido: `agenda-gabriela`.
4. Cuando pregunte por Google Analytics, puedes desactivarlo.
5. En el proyecto, crea una app web con el ícono `</>`.
6. Copia la configuración de Firebase.

La config se verá más o menos así:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## 2. Activar Firestore

1. En Firebase, entra a **Build > Firestore Database**.
2. Clic en **Create database**.
3. Elige **Start in production mode**.
4. Elige una región cercana o la recomendada.
5. Crea la base.

## 3. Poner reglas de Firestore

1. En Firestore, entra a la pestaña **Rules**.
2. Copia el contenido de `firestore.rules`.
3. Publica las reglas.

Si cambias `VITE_BOARD_ID`, también cambia ese mismo ID dentro de `firestore.rules`.

## 4. Subir a GitHub

1. Crea un repositorio nuevo en GitHub.
2. Sube todos los archivos de este proyecto.
3. No subas `.env.local`.

## 5. Crear variables en Vercel

En Vercel:

1. Importa el repositorio desde GitHub.
2. Antes de hacer deploy, entra a **Environment Variables**.
3. Agrega estas variables:

```txt
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_BOARD_ID
```

Usa los valores de Firebase.

## 6. Deploy

1. Framework: Vite.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Deploy.

Vercel te dará un link tipo:

```txt
https://agenda-gabriela.vercel.app
```

Ese link se lo pasas a Gabriela.

---

# Probar localmente

Si quieres probar en tu computadora:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Luego abre el link local que aparece en la terminal.
