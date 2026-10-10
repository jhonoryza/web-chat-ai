import { useStore, getActiveConversation } from "../lib/store";
import { promptDialog } from "./dialogs";

export function Topbar({ bare = false }: { bare?: boolean }) {
  const mobileNavOpen = useStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useStore((s) => s.setMobileNavOpen);
  const theme = useStore((s) => s.settings.theme);
  const setTheme = useStore((s) => s.setTheme);
  const openModal = useStore((s) => s.openModal);
  const patchConversation = useStore((s) => s.patchConversation);
  const conv = useStore(getActiveConversation);

  const rename = async () => {
    if (!conv) return;
    const t = await promptDialog({
      title: "Rename chat",
      value: conv.title || "",
      placeholder: "Chat title",
      okText: "Rename",
    });
    if (t && t.trim()) patchConversation(conv.id, { title: t.trim().slice(0, 80) });
  };

  return (
    <header id="topbar">
      <button
        id="menuBtn"
        className="tool-btn"
        aria-label="Menu"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
      >
        <i className="fa-solid fa-bars" />
      </button>
      <button className="chat-title" title="Tap to rename" onClick={rename}
        style={bare ? { visibility: "hidden" } : undefined}>
        {conv?.title || "New chat"}
      </button>
      <button
        className="tool-btn"
        title="Chat settings"
        onClick={() => openModal("convSettings")}
      >
        <i className="fa-solid fa-gear" />
      </button>
      <button
        className="tool-btn"
        aria-label="Toggle theme"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <i className={theme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun"} />
      </button>
    </header>
  );
}

export default Topbar;
