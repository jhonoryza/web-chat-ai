import { useEffect } from "react";
import { useStore } from "../lib/store";
import { MASCOT_DATA_URI } from "../lib/assets";
import { fmtDate } from "../lib/utils";
import { confirmDialog } from "./dialogs";

export function Sidebar() {
  const conversations = useStore((s) => s.conversations);
  const activeConvId = useStore((s) => s.activeConvId);
  const mobileNavOpen = useStore((s) => s.mobileNavOpen);
  const newConversation = useStore((s) => s.newConversation);
  const loadConversation = useStore((s) => s.loadConversation);
  const deleteConversation = useStore((s) => s.deleteConversation);
  const setMobileNavOpen = useStore((s) => s.setMobileNavOpen);
  const openModal = useStore((s) => s.openModal);
  const setLogOpen = useStore((s) => s.setLogOpen);

  useEffect(() => {
    document.body.classList.toggle("nav-open", mobileNavOpen);
  }, [mobileNavOpen]);

  const closeNav = () => setMobileNavOpen(false);

  const onDelete = async (id: string, title: string) => {
    const ok = await confirmDialog({
      title: "Delete chat",
      message: `Delete "${title}"? This cannot be undone.`,
    });
    if (ok) deleteConversation(id);
  };

  const nav = [
    { icon: "fa-plug", label: "Providers", act: () => openModal("providers") },
    { icon: "fa-rectangle-list", label: "Logs", act: () => setLogOpen(true) },
    { icon: "fa-globe", label: "Web Search", act: () => openModal("webSearch") },
    { icon: "fa-floppy-disk", label: "Backup", act: () => openModal("backup") },
  ];

  return (
    <>
      <aside id="sidebar">
        <div className="side-head">
          <div className="brand">
            <img
              className="mascot"
              src={MASCOT_DATA_URI}
              alt="DeepSea"
              style={{ width: 34, height: 34 }}
            />
            <span className="wordmark">DeepSea</span>
          </div>
          <button
            className="new-btn"
            onClick={() => {
              newConversation();
              closeNav();
            }}
          >
            <i className="fa-solid fa-plus" />
            <span>New chat</span>
          </button>
        </div>
        <div className="side-sec">Chats</div>
        <div className="conv-list">
          {conversations.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 13,
                padding: "24px 8px",
              }}
            >
              No chats yet.
              <br />
              Start a new one above
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={"conv-item" + (c.id === activeConvId ? " active" : "")}
                onClick={() => {
                  loadConversation(c.id);
                  closeNav();
                }}
              >
                <div className="t">
                  <b>{c.title || "New chat"}</b>
                  <span>{fmtDate(c.updatedAt)}</span>
                </div>
                <button
                  className="del"
                  title="Delete chat"
                  aria-label="Delete chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id, c.title || "New chat");
                  }}
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="side-foot">
          {nav.map((n) => (
            <button
              key={n.label}
              className="nav-item"
              onClick={() => {
                n.act();
                closeNav();
              }}
            >
              <i className={"fa-solid " + n.icon} />
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      </aside>
      <div id="scrim" onClick={closeNav} />
    </>
  );
}

export default Sidebar;
