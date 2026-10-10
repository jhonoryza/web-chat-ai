import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { fmtClock, fmtMs } from "../lib/utils";
import type { LogEntry } from "../lib/types";
import { copyText, toast } from "./dialogs";

function LogRow({ e }: { e: LogEntry }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!(e.req || e.res || e.raw || e.err);
  const pill =
    e.status === "ok" ? (
      <span className="log-pill log-ok">OK</span>
    ) : e.status === "stopped" ? (
      <span className="log-pill log-stop">STOPPED</span>
    ) : (
      <span className="log-pill log-err">ERROR</span>
    );
  const pt = e.tok?.pt ?? 0;
  const ct = e.tok?.ct ?? 0;

  return (
    <div
      className={"log-row" + (hasDetail ? " tap" : "") + (open ? " open" : "")}
      onClick={hasDetail ? () => setOpen(!open) : undefined}
    >
      <div className="log-top">
        <span className="log-time">{fmtClock(e.ts)}</span>
        <span className="log-type">{String(e.type).toUpperCase()}</span>
        <span className="log-name">
          {e.provider}
          {e.model ? " • " + e.model : ""}
        </span>
        {pill}
      </div>
      <div className="log-meta">
        <span>{fmtMs(e.ms)}</span>
        {e.http ? <span>HTTP {e.http}</span> : null}
        {pt + ct > 0 ? (
          <span>
            tokens ↑{pt} ↓{ct}
          </span>
        ) : null}
        {e.count != null ? <span>{e.count} models</span> : null}
      </div>
      {open && hasDetail ? (
        <div className="log-detail">
          {e.req ? (
            <>
              <div className="log-sec">Raw request</div>
              <pre className="log-pre">{e.req}</pre>
            </>
          ) : null}
          {e.res ? (
            <>
              <div className="log-sec">Raw response</div>
              <pre className="log-pre">{e.res}</pre>
            </>
          ) : null}
          {e.raw ? (
            <>
              <div className="log-sec">Raw stream (sample)</div>
              <pre className="log-pre">{e.raw}</pre>
            </>
          ) : null}
          {e.err ? (
            <>
              <div className="log-sec">Error</div>
              <pre className="log-pre">{e.err}</pre>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function LogsDrawer() {
  const logOpen = useStore((s) => s.logOpen);
  const setLogOpen = useStore((s) => s.setLogOpen);
  const reqLog = useStore((s) => s.reqLog);
  const clearLog = useStore((s) => s.clearLog);

  useEffect(() => {
    document.body.classList.toggle("log-open", logOpen);
    return () => {
      document.body.classList.remove("log-open");
    };
  }, [logOpen]);

  const onCopy = () => {
    copyText(
      JSON.stringify(
        reqLog.map((e) => ({
          time: new Date(e.ts).toISOString(),
          type: e.type,
          provider: e.provider,
          model: e.model || undefined,
          status: e.status,
          latencyMs: Math.round(e.ms),
          http: e.http || undefined,
          tokens: e.tok || undefined,
          models: e.count != null ? e.count : undefined,
          request: e.req || undefined,
          response: e.res || undefined,
          rawStream: e.raw || undefined,
          error: e.err || undefined,
        })),
        null,
        2
      )
    );
  };

  const onClear = () => {
    clearLog();
    toast("Log cleared");
  };

  return (
    <>
      <aside id="logPanel" aria-label="Request log">
        <div className="logp-head">
          <h3>
            <i className="fa-solid fa-clipboard-list" />
            Request log
          </h3>
          <button
            className="tool-btn"
            aria-label="Close log"
            onClick={() => setLogOpen(false)}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="logp-body">
          {reqLog.length === 0 ? (
            <p className="sub">
              No requests yet. Send a message or fetch models to see activity here.
            </p>
          ) : (
            <div className="log-list">
              {reqLog.map((e, i) => (
                <LogRow key={e.ts + "-" + i} e={e} />
              ))}
            </div>
          )}
        </div>
        <div className="logp-foot">
          <button className="btn" onClick={onCopy}>
            <i className="fa-solid fa-copy" /> Copy
          </button>
          <button className="btn" onClick={onClear}>
            <i className="fa-solid fa-trash" /> Clear
          </button>
        </div>
      </aside>
      <div id="logScrim" onClick={() => setLogOpen(false)} />
    </>
  );
}

export default LogsDrawer;
