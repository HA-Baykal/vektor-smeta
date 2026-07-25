"use client";

import React, { useState, useEffect } from "react";
import { useTelegram } from "./TelegramProvider";
import { Trash2, RotateCcw, Clock, User, FileText, KeyRound, AlertTriangle, Eye, RefreshCw } from "lucide-react";

interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  entityDataJson: string | null;
  performedBy: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  note: string | null;
  createdAt: string;
}

export const AuditLogViewer: React.FC = () => {
  const { isAdmin, user, isInTelegram } = useTelegram();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const adminId = "6567941949"; // Your admin ID
      const res = await fetch(`/api/audit-logs?adminId=${adminId}&limit=100`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
      } else {
        alert("Ошибка загрузки логов: " + json.message);
      }
    } catch (e) {
      alert("Ошибка: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRestore = async (logId: number) => {
    if (!confirm(`Восстановить данные из лога #${logId}? Будет создана новая запись.`)) return;
    
    try {
      const res = await fetch(`/api/audit-logs/restore?adminId=6567941949`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`✅ ${json.message}`);
        fetchLogs();
      } else {
        alert("Ошибка восстановления: " + json.message);
      }
    } catch (e) {
      alert("Ошибка: " + (e as Error).message);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "delete": return "bg-rose-100 text-rose-800 border-rose-200";
      case "restore": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "create": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getEntityIcon = (type: string) => {
    if (type === "estimate") return <FileText className="w-4 h-4" />;
    if (type === "access_code") return <KeyRound className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const filteredLogs = filterType === "all" 
    ? logs 
    : logs.filter(log => log.entityType === filterType);

  if (!isAdmin && isInTelegram) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="font-bold text-amber-900">Доступ только для администратора</h3>
        <p className="text-xs text-amber-700 mt-1">Лог действий может просматривать только администратор (ID 6567941949)</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2 text-slate-900">
            <Clock className="w-5 h-5 text-blue-600" />
            Лог действий — аудит удалений (только админ)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Здесь видно что удалили, когда, кем, какие были заполнены поля. Можно восстановить.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
          title="Обновить"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${filterType === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"}`}
        >
          Все ({logs.length})
        </button>
        <button
          onClick={() => setFilterType("estimate")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${filterType === "estimate" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"}`}
        >
          Сметы ({logs.filter(l => l.entityType === "estimate").length})
        </button>
        <button
          onClick={() => setFilterType("access_code")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${filterType === "access_code" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"}`}
        >
          Коды ({logs.filter(l => l.entityType === "access_code").length})
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-400 text-sm">Загрузка логов...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-700">Логов пока нет</div>
          <div className="text-xs text-slate-500">Удаления будут логироваться здесь</div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {filteredLogs.map((log) => {
            let parsedData: any = null;
            try {
              parsedData = log.entityDataJson ? JSON.parse(log.entityDataJson) : null;
            } catch {}

            return (
              <div key={log.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${getActionColor(log.action)}`}>
                      {getEntityIcon(log.entityType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-2xs font-bold border ${getActionColor(log.action)}`}>
                          {log.action === "delete" ? "🗑 Удалено" : log.action === "restore" ? "↩️ Восстановлено" : log.action}
                        </span>
                        <span className="text-xs font-mono text-slate-500">#{log.id}</span>
                        <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString("ru-RU")}</span>
                      </div>
                      <div className="mt-1.5 text-sm font-semibold text-slate-900">
                        {log.entityType === "estimate" 
                          ? `Смета #${log.entityId}: ${parsedData?.title || parsedData?.modelName || "Без названия"}` 
                          : log.entityType === "access_code"
                          ? `Код доступа: ${parsedData?.code || log.entityId}`
                          : `${log.entityType} #${log.entityId}`}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {log.note || "Без примечания"}
                      </div>
                      {parsedData && (
                        <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 text-2xs font-mono">
                          <div className="font-bold text-slate-700 mb-1">Данные до удаления:</div>
                          <div className="grid grid-cols-2 gap-1 text-slate-600 max-h-24 overflow-y-auto">
                            {Object.entries(parsedData).slice(0, 10).map(([k, v]) => (
                              <div key={k} className="truncate">
                                <span className="font-semibold">{k}:</span> {String(v).slice(0, 50)}
                              </div>
                            ))}
                          </div>
                          {Object.keys(parsedData).length > 10 && (
                            <div className="text-slate-400 mt-1">+ еще {Object.keys(parsedData).length - 10} полей...</div>
                          )}
                          <button
                            onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                            className="mt-2 text-blue-600 hover:text-blue-800 underline text-2xs"
                          >
                            {selectedLog?.id === log.id ? "Скрыть JSON" : "Показать полный JSON"}
                          </button>
                          {selectedLog?.id === log.id && (
                            <pre className="mt-2 p-2 bg-slate-900 text-emerald-300 rounded text-2xs overflow-auto max-h-40">
                              {JSON.stringify(parsedData, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-2xs text-slate-400">
                        {log.performedBy && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.performedBy}
                          </span>
                        )}
                        {log.ipAddress && <span>IP: {log.ipAddress.slice(0, 15)}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    {log.action === "delete" && (
                      <button
                        onClick={() => handleRestore(log.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                        title="Восстановить удаленную запись"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Восстановить
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Eye className="w-3 h-3" />
                      Детали
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
