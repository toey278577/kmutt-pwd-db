import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, Trash2, X } from 'lucide-react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

/* ── สไตล์ของแต่ละชนิด ── */
const VARIANTS = {
  success: {
    icon: CheckCircle2,
    ring: 'ring-emerald-500/30',
    bar: 'linear-gradient(180deg,#34d399,#059669)',
    iconBg: 'linear-gradient(135deg,#34d399,#059669)',
    glow: '0 10px 30px -8px rgba(5,150,105,0.45)',
  },
  error: {
    icon: XCircle,
    ring: 'ring-red-500/30',
    bar: 'linear-gradient(180deg,#f87171,#dc2626)',
    iconBg: 'linear-gradient(135deg,#f87171,#dc2626)',
    glow: '0 10px 30px -8px rgba(220,38,38,0.45)',
  },
  info: {
    icon: Info,
    ring: 'ring-orange-500/30',
    bar: 'linear-gradient(180deg,#fb923c,#ea580c)',
    iconBg: 'linear-gradient(135deg,#fb923c,#ea580c)',
    glow: '0 10px 30px -8px rgba(234,88,12,0.45)',
  },
};

function ToastCard({ t, onClose }) {
  const v = VARIANTS[t.type] || VARIANTS.info;
  const Icon = v.icon;
  return (
    <div
      className={`pointer-events-auto relative flex items-start gap-3 w-[340px] max-w-[90vw] bg-white rounded-2xl ring-1 ${v.ring} pl-4 pr-3 py-3.5 overflow-hidden animate-pop-in`}
      style={{ boxShadow: v.glow }}>
      {/* แถบสีด้านซ้าย */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: v.bar }} />
      {/* ไอคอน */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: v.iconBg }}>
        <Icon size={19} color="white" strokeWidth={2.5} />
      </div>
      {/* ข้อความ */}
      <div className="flex-1 min-w-0 pt-0.5">
        {t.title && <p className="text-sm font-black text-gray-800 leading-tight">{t.title}</p>}
        {t.message && <p className="text-sm text-gray-500 leading-snug mt-0.5 break-words">{t.message}</p>}
      </div>
      {/* ปิด */}
      <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 mt-0.5">
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);   // { title, message, danger, resolve }
  const idRef = useRef(0);

  const remove = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((type, title, message, duration = 3200) => {
    const id = ++idRef.current;
    setToasts((list) => [...list, { id, type, title, message }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  /* helper API — รับได้ทั้ง (title) หรือ (title, message) */
  const api = {
    success: (title, message) => push('success', title, message),
    error:   (title, message) => push('error', title, message),
    info:    (title, message) => push('info', title, message),
    /* confirm คืน Promise<boolean> */
    confirm: ({ title = 'ยืนยันการทำรายการ', message = '', confirmText = 'ยืนยัน', danger = true } = {}) =>
      new Promise((resolve) => setDialog({ title, message, confirmText, danger, resolve })),
  };

  const closeDialog = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* ── Toast stack ── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2.5 pointer-events-none">
        {toasts.map((t) => <ToastCard key={t.id} t={t} onClose={() => remove(t.id)} />)}
      </div>

      {/* ── Confirm dialog ── */}
      {dialog && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => closeDialog(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-[380px] max-w-[92vw] overflow-hidden animate-pop-in">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: dialog.danger ? 'linear-gradient(135deg,#fecaca,#fca5a5)' : 'linear-gradient(135deg,#fed7aa,#fdba74)' }}>
                {dialog.danger
                  ? <Trash2 size={26} className="text-red-600" />
                  : <AlertTriangle size={26} className="text-orange-600" />}
              </div>
              <h3 className="text-lg font-black text-gray-800">{dialog.title}</h3>
              {dialog.message && <p className="text-sm text-gray-500 mt-1.5 leading-snug">{dialog.message}</p>}
            </div>
            <div className="px-5 pb-5 flex gap-2.5">
              <button onClick={() => closeDialog(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all">
                ยกเลิก
              </button>
              <button onClick={() => closeDialog(true)}
                className="flex-1 py-3 rounded-2xl text-sm font-black text-white active:scale-95 transition-all"
                style={{
                  background: dialog.danger ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#ea580c,#c2410c)',
                  boxShadow: dialog.danger ? '0 6px 18px rgba(220,38,38,0.4)' : '0 6px 18px rgba(234,88,12,0.4)',
                }}>
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
