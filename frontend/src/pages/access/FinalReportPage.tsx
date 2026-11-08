import { Link } from 'react-router-dom';
import { useStore } from '../../data/react';
import { useLiveTables } from '../../stdb/LiveTables';
import { empById } from '../../lib/select';

const full = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' }) : '—';
const dur = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m ${s % 60}s`;
};
const ts = (t: { microsSinceUnixEpoch: bigint } | undefined | null) =>
  t ? Number(t.microsSinceUnixEpoch / 1000n) : null;

const STATUS_LABEL: Record<string, string> = {
  encrypted: 'ENCRYPTED (ransomware)', down: 'Down', suspected: 'Suspected', contained: 'Contained',
  working: 'Working', unchecked: 'Unchecked',
};

/** Close-out report: everyone who took part, every system report, every task, every message, full log. */
export function FinalReportPage() {
  const s = useStore();
  const live = useLiveTables();
  const inc = s.incident;
  const end = inc.resolvedAt ?? Date.now();
  const reported = s.systems.filter((x) => x.at);
  const encrypted = reported.filter((x) => x.status === 'encrypted');
  const people = live?.accessRequests ?? [];
  const log = s.log.slice().sort((a, b) => a.at - b.at);
  const msgs = s.messages.slice().sort((a, b) => a.at - b.at);
  const tasks = s.tasks.slice().sort((a, b) => a.createdAt - b.createdAt);

  const th = 'border-b border-[#ccc] px-2 py-1.5 text-left text-[11px] uppercase tracking-wide text-[#555]';
  const td = 'border-b border-[#e3e3e3] px-2 py-1.5 align-top text-[13px]';
  const h2 = 'mt-8 mb-2 border-b-2 border-[#A31D17] pb-1 text-[18px] font-black uppercase text-[#A31D17]';

  return (
    <div className="min-h-screen bg-white text-[#111] print:bg-white">
      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="mb-6 flex items-center gap-3 print:hidden">
          <button onClick={() => window.print()} className="bg-[#A31D17] px-4 py-2 text-[13px] font-bold uppercase text-white">
            Print / Save as PDF
          </button>
          <Link to="/admin" className="border border-[#999] px-4 py-2 text-[13px] font-bold uppercase">Back to dashboard</Link>
        </div>

        <p className="text-[12px] uppercase tracking-[0.2em] text-[#777]">OffGrid · Incident close-out report</p>
        <h1 className="text-[34px] font-black uppercase leading-tight">{inc.code} · {inc.kind}</h1>
        <p className="mt-1 text-[14px]">
          Status: <strong>{inc.status === 'resolved' ? 'RESOLVED' : 'STILL ACTIVE (draft report)'}</strong> · Severity {inc.severity}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-[14px] sm:grid-cols-4">
          <div><dt className="text-[#777]">Started (admin fob)</dt><dd className="font-semibold">{full(inc.declaredAt)}</dd></div>
          <div><dt className="text-[#777]">Resolved</dt><dd className="font-semibold">{full(inc.resolvedAt)}</dd></div>
          <div><dt className="text-[#777]">Duration</dt><dd className="font-semibold">{inc.declaredAt ? dur(end - inc.declaredAt) : '—'}</dd></div>
          <div><dt className="text-[#777]">Encrypted systems</dt><dd className="font-semibold">{encrypted.length}</dd></div>
        </dl>

        <h2 className={h2}>People who took part ({people.length + 1})</h2>
        <table className="w-full border-collapse">
          <thead><tr><th className={th}>Name</th><th className={th}>Team · role</th><th className={th}>Keycard tapped</th><th className={th}>Decision</th><th className={th}>Decided by</th></tr></thead>
          <tbody>
            <tr><td className={td}>Admin console</td><td className={td}>Incident Lead · admin</td><td className={td}>{full(inc.declaredAt)}</td><td className={td}>Unlocked OffGrid</td><td className={td}>Admin fob</td></tr>
            {people.map((p) => (
              <tr key={p.uid}>
                <td className={td}>{p.name}</td><td className={td}>{p.team} · {p.role}</td>
                <td className={td}>{full(ts(p.requestedAt))}</td><td className={td}>{p.status}</td><td className={td}>{p.decidedBy || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className={h2}>System reports ({reported.length}) · encrypted computers first</h2>
        {reported.length === 0 ? <p className="text-[14px] text-[#777]">No systems were reported.</p> : (
          <table className="w-full border-collapse">
            <thead><tr><th className={th}>System</th><th className={th}>Status</th><th className={th}>Reported by</th><th className={th}>When</th><th className={th}>Where</th><th className={th}>How we know · impact</th><th className={th}>Confirmed</th></tr></thead>
            <tbody>
              {reported.slice().sort((a, b) => Number(b.status === 'encrypted') - Number(a.status === 'encrypted') || (a.at ?? 0) - (b.at ?? 0)).map((x) => (
                <tr key={x.id} className={x.status === 'encrypted' ? 'bg-[#fdecea]' : ''}>
                  <td className={td}><strong>{x.name}</strong><br /><span className="text-[#777]">{x.code}</span></td>
                  <td className={td}><strong>{STATUS_LABEL[x.status] ?? x.status}</strong>{x.doNotTouch ? <><br />Do not touch</> : null}</td>
                  <td className={td}>{x.reportedBy}</td><td className={td}>{full(x.at)}</td><td className={td}>{x.location || '—'}</td>
                  <td className={td}>{x.howWeKnow}<br />{x.impact}</td><td className={td}>{x.confirmed ? full(x.confirmedAt) : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2 className={h2}>Tasks ({tasks.length})</h2>
        {tasks.length === 0 ? <p className="text-[14px] text-[#777]">No tasks.</p> : (
          <table className="w-full border-collapse">
            <thead><tr><th className={th}>Task</th><th className={th}>Assigned to</th><th className={th}>Created</th><th className={th}>Started</th><th className={th}>Done</th><th className={th}>Re-pages</th></tr></thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className={td}>{t.urgent ? <strong>URGENT · </strong> : null}{t.title}{t.detail ? <><br /><span className="text-[#777]">{t.detail}</span></> : null}</td>
                  <td className={td}>{t.assigneeId ? (empById(s, t.assigneeId)?.name ?? t.assigneeId.replace('member:', '')) : 'Anyone (not claimed)'}</td>
                  <td className={td}>{full(t.createdAt)}</td><td className={td}>{full(t.ackedAt)}</td><td className={td}>{full(t.doneAt)}</td><td className={td}>{t.pings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2 className={h2}>Every message ({msgs.length})</h2>
        {msgs.length === 0 ? <p className="text-[14px] text-[#777]">No messages.</p> : (
          <table className="w-full border-collapse">
            <thead><tr><th className={th}>Time</th><th className={th}>From</th><th className={th}>Message</th></tr></thead>
            <tbody>
              {msgs.map((m) => {
                const a = empById(s, m.authorId);
                return (
                  <tr key={m.id}>
                    <td className={`${td} whitespace-nowrap`}>{full(m.at)}</td>
                    <td className={td}>{a?.name ?? m.authorId}{a ? <span className="text-[#777]"> · {a.role === 'lead' ? 'Incident Lead · Admin' : [a.dept, a.title].filter(Boolean).join(' · ')}</span> : null}</td>
                    <td className={td}>{m.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <h2 className={h2}>Full timeline ({log.length} entries, hash-chained)</h2>
        <table className="w-full border-collapse">
          <thead><tr><th className={th}>Time</th><th className={th}>Who</th><th className={th}>What happened</th></tr></thead>
          <tbody>
            {log.map((e) => (
              <tr key={e.id}><td className={`${td} whitespace-nowrap`}>{full(e.at)}</td><td className={td}>{e.title}</td><td className={td}>{e.sub}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-[11px] text-[#777]">Generated by OffGrid on {full(Date.now())}. Every entry above comes from the OffGrid database on the private network.</p>
      </div>
    </div>
  );
}
