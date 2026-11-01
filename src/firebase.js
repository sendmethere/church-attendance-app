import { initializeApp } from 'firebase/app';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from 'firebase/auth';
import {
  initializeFirestore, collection, doc, getDoc, getDocs, query, where,
  setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';

// Firebase 웹 설정값은 공개 식별자다. 접근 통제는 firestore.rules가 한다.
const app = initializeApp({
  apiKey: 'AIzaSyDa9861omoNlqhVqXn-xzo-SZW4q0dWkME',
  authDomain: 'jjch-choir-attendance.firebaseapp.com',
  projectId: 'jjch-choir-attendance',
  storageBucket: 'jjch-choir-attendance.firebasestorage.app',
  messagingSenderId: '549241247386',
  appId: '1:549241247386:web:313347c5b1e09f105ef123',
});
const auth = getAuth(app);
const fs = initializeFirestore(app, { ignoreUndefinedProperties: true });

// ponytail: 페이지 코드가 쓰는 Supabase 문법(from/select/eq/or/order/insert/update/delete/single)만
// Firestore 위에 얹은 얇은 호환층. 페이지는 고치지 않는다.
// 한계: 필터는 메모리에서 적용(eq만 서버 where). 단원 수십 명·일정 수백 건 규모 전제.
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const OPS = {
  eq: (a, b) => String(a) === String(b),
  neq: (a, b) => String(a) !== String(b),
  gt: (a, b) => a > b, gte: (a, b) => a >= b,
  lt: (a, b) => a < b, lte: (a, b) => a <= b,
  is: (a) => a == null, // 'out_date.is.null'만 쓴다
};

class Query {
  constructor(name) {
    this.name = name; this.op = 'select';
    this.filters = []; this.eqs = []; this.sorts = [];
  }
  select() { this.returning = true; return this; }
  insert(rows) { this.op = 'insert'; this.payload = [].concat(rows); return this; }
  update(v) { this.op = 'update'; this.payload = v; return this; }
  delete() { this.op = 'delete'; return this; }
  single() { this.one = true; return this; }
  limit(n) { this.max = n; return this; }
  order(c, { ascending = true } = {}) { this.sorts.push([c, ascending]); return this; }
  eq(c, v) { this.eqs.push([c, v]); this.filters.push((r) => OPS.eq(r[c], v)); return this; }
  neq(c, v) { this.filters.push((r) => OPS.neq(r[c], v)); return this; }
  gt(c, v) { this.filters.push((r) => OPS.gt(r[c], v)); return this; }
  gte(c, v) { this.filters.push((r) => OPS.gte(r[c], v)); return this; }
  lt(c, v) { this.filters.push((r) => OPS.lt(r[c], v)); return this; }
  lte(c, v) { this.filters.push((r) => OPS.lte(r[c], v)); return this; }
  // 'col.op.value,col.op.value' 형태 (OR)
  or(str) {
    const parts = str.split(',').map((p) => {
      const [c, op, ...v] = p.split('.');
      return (r) => OPS[op](r[c], v.join('.'));
    });
    this.filters.push((r) => parts.some((f) => f(r)));
    return this;
  }
  then(res, rej) { return this.run().then(res, rej); }

  async fetch() {
    const col = collection(fs, this.name);
    const idEq = this.eqs.find(([c]) => c === 'id');
    let rows;
    if (idEq) {
      const s = await getDoc(doc(col, String(idEq[1])));
      rows = s.exists() ? [s.data()] : [];
    } else {
      const wh = this.eqs.filter(([, v]) => typeof v === 'string').map(([c, v]) => where(c, '==', v));
      rows = (await getDocs(query(col, ...wh))).docs.map((d) => d.data());
    }
    rows = rows.filter((r) => this.filters.every((f) => f(r)));
    for (const [c, asc] of [...this.sorts].reverse()) { // 마지막 정렬부터 안정 정렬
      rows.sort((a, b) => (asc ? 1 : -1) * cmp(a[c], b[c]));
    }
    return this.max ? rows.slice(0, this.max) : rows;
  }

  async run() {
    try {
      const ref = (r) => doc(fs, this.name, String(r.id));
      if (this.op === 'insert') {
        let next;
        const out = [];
        for (const v of this.payload) {
          const row = { created_at: new Date().toISOString(), ...v };
          if (row.id == null) {
            if (this.name === 'tags') row.id = crypto.randomUUID();
            else {
              next ??= Math.max(0, ...(await new Query(this.name).fetch()).map((r) => +r.id || 0));
              row.id = ++next;
            }
          }
          await setDoc(ref(row), row);
          out.push(row);
        }
        return { data: this.returning ? out : null, error: null };
      }
      const rows = await this.fetch();
      if (this.op === 'update') {
        await Promise.all(rows.map((r) => updateDoc(ref(r), this.payload)));
        return { data: this.returning ? rows.map((r) => ({ ...r, ...this.payload })) : null, error: null };
      }
      if (this.op === 'delete') {
        await Promise.all(rows.map((r) => deleteDoc(ref(r))));
        return { data: null, error: null };
      }
      if (this.one) {
        return rows.length === 1
          ? { data: rows[0], error: null }
          : { data: null, error: { code: 'PGRST116', message: `${rows.length} rows` } };
      }
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

const toSession = (u) => (u ? { user: u } : null);

const db = {
  from: (name) => new Query(name),
  auth: {
    async getSession() {
      await auth.authStateReady();
      return { data: { session: toSession(auth.currentUser) } };
    },
    onAuthStateChange(cb) {
      const unsub = onAuthStateChanged(auth, (u) => cb(u ? 'SIGNED_IN' : 'SIGNED_OUT', toSession(u)));
      return { data: { subscription: { unsubscribe: unsub } } };
    },
    async signInWithPassword({ email, password }) {
      try {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        return { data: { user }, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    async signOut() {
      try { await signOut(auth); return { error: null }; } catch (error) { return { error }; }
    },
  },
};

export default db;
