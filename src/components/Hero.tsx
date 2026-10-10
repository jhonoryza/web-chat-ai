import { useStore } from "../lib/store";
import { timeGreeting } from "../lib/utils";
import Composer from "./Composer";

function AsteriskMark() {
  // Generic 14-spoke starburst (own drawing, not Claude's asset).
  const spokes = Array.from({ length: 7 }, (_, i) => {
    const a = (i * Math.PI) / 7;
    const x1 = 20 - 14 * Math.cos(a);
    const y1 = 20 - 14 * Math.sin(a);
    const x2 = 20 + 14 * Math.cos(a);
    const y2 = 20 + 14 * Math.sin(a);
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="var(--accent)"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    );
  });
  return (
    <svg
      className="hero-mark"
      width="38"
      height="38"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      {spokes}
    </svg>
  );
}

const CHIPS = [
  { icon: "fa-pen", label: "Write", prompt: "Help me write " },
  { icon: "fa-code", label: "Code", prompt: "Write code that " },
  { icon: "fa-list-ul", label: "Summarize", prompt: "Summarize this:\n" },
  { icon: "fa-lightbulb", label: "Brainstorm", prompt: "Brainstorm ideas for " },
];

export function Hero() {
  const setComposerDraft = useStore((s) => s.setComposerDraft);

  const focusComposer = () => {
    document.getElementById("composer-input")?.focus();
  };

  return (
    <div id="hero">
      <div className="hero-greet">
        <AsteriskMark />
        <h1>
          Good {timeGreeting()}, fajar
        </h1>
      </div>
      <Composer />
      <div className="chips hero-chips">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            className="chip"
            onClick={() => {
              setComposerDraft(c.prompt);
              setTimeout(focusComposer, 30);
            }}
          >
            <i className={"fa-solid " + c.icon} />
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Hero;
