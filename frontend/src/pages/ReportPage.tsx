import { useStore } from '../data/react';
import { store } from '../data/store';
import { DATA_CHIP, SYS_CHIP } from '../lib/meta';
import { bytes, isLead } from '../lib/select';

const full = (ms: number) => new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const dur = (ms: number) => `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;

/** Printable incident report for the lawyer (Download PDF = print to PDF). */
export function ReportPage() {
  const s = useStore();
  if (!isLead(s, store.sid)) return <p className="p-8">Only the Incident Lead’s screen can open the report. <a className="text-gold underline" href="#/lead">Go to the Lead screen</a></p>;
  const inc = s.incident;
  const affected = s.systems.filter((x) => x.status !== 'unchecked' && x.status !== 'working');
  return (
    <div className="min-h-screen bg-white text-[#1E1E20]">
      <div className="flex items-center gap-3 bg-[#1F1F22] px-6 py-3 text-ink print:hidden">
        <a href="#/lead" className="mr-auto underline">Back to dashboard</a>
        <button className="h-10 bg-gold px-4 text-[12px] caps text-[#1A1206]" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
      <article className="mx-auto max-w-3xl p-8 text-[14px]">
        <header className="flex items-start justify-between border-b-[3px] border-[#1E1E20] pb-4">
          <div><p className="text-[12px] text-[#5A5A63]">Confidential · prepared for counsel</p><h1 className="text-[30px] font-extrabold">Incident report</h1></div>
          <span className="pt-2 font-bold">{inc.code}</span>
        </header>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><dt className="text-[#5A5A63]">Declared</dt><dd className="font-semibold">{inc.declaredAt ? full(inc.declaredAt) : '—'}</dd></div>
          <div><dt className="text-[#5A5A63]">Resolved</dt><dd className="font-semibold">{inc.resolvedAt ? full(inc.resolvedAt) : 'Still active'}</dd></div>
          <div><dt className="text-[#5A5A63]">Duration</dt><dd className="font-semibold">{inc.declaredAt ? dur((inc.resolvedAt ?? Date.now()) - inc.declaredAt) : '—'}</dd></div>
          <div><dt className="text-[#5A5A63]">Incident Lead</dt><dd className="font-semibold">Maria Lopez</dd></div>
        </dl>
        <h2 className="mt-8 text-[16px] font-extrabold uppercase">Data affected</h2>
        <ul className="mt-2">{s.data.map((d) => <li key={d.id} className="flex justify-between border-b border-[#D4D4CF] py-1.5"><span>{d.name} ({d.source})</span><strong>{DATA_CHIP[d.status].label}</strong></li>)}</ul>
        <h2 className="mt-8 text-[16px] font-extrabold uppercase">Systems affected ({affected.length})</h2>
        <ul className="mt-2">{affected.map((x) => <li key={x.id} className="flex justify-between gap-4 border-b border-[#D4D4CF] py-1.5"><span>{x.name} ({x.code}) · {x.impact}</span><strong>{SYS_CHIP[x.status].label}{x.confirmed ? '' : ' (unconfirmed)'}</strong></li>)}</ul>
        <h2 className="mt-8 text-[16px] font-extrabold uppercase">Timeline</h2>
        <table className="mt-2 w-full border-collapse text-left">
          <tbody>
            {s.log.slice().sort((a, b) => a.at - b.at).map((e) => (
              <tr key={e.id} className="border-b border-[#D4D4CF] align-top"><td className="whitespace-nowrap py-1.5 pr-3 font-semibold">{full(e.at)}</td><td className="py-1.5 pr-3">{e.title}</td><td className="py-1.5 text-[#5A5A63]">{e.sub}</td></tr>
            ))}
          </tbody>
        </table>
        <h2 className="mt-8 text-[16px] font-extrabold uppercase">Attached files ({s.files.length})</h2>
        <ul className="mt-2">{s.files.map((f) => <li key={f.id} className="border-b border-[#D4D4CF] py-1.5">{f.name} · {bytes(f.size)} · {f.by} · {f.source}</li>)}</ul>
        <p className="mt-8 border-t border-[#D4D4CF] pt-3 text-[12px] text-[#5A5A63]">Generated {full(Date.now())}. Timeline entries are append-only: nobody, including the Lead, can edit or delete them.</p>
      </article>
    </div>
  );
}
