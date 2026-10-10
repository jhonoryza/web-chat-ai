import { useEffect } from "react";
import { useStore } from "./lib/store";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ChatView from "./components/ChatView";
import Composer from "./components/Composer";
import LogsDrawer from "./components/LogsDrawer";
import ProvidersModal from "./components/ProvidersModal";
import ConvSettingsModal from "./components/ConvSettingsModal";
import BackupModal from "./components/BackupModal";
import WebSearchModal from "./components/WebSearchModal";
import { DialogHost, Toaster } from "./components/dialogs";

export default function App() {
  useEffect(() => {
    useStore.getState().initialize();
  }, []);

  useEffect(() => {
    const apply = (theme: string) => {
      document.documentElement.dataset.theme = theme;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", theme === "light" ? "#f4f2ec" : "#201f1e");
    };
    const unsub = useStore.subscribe((s, prev) => {
      if (s.settings.theme !== prev.settings.theme) apply(s.settings.theme);
    });
    apply(useStore.getState().settings.theme);
    return unsub;
  }, []);

  return (
    <div id="app">
      <Sidebar />
      <main id="main">
        <Topbar />
        <ChatView />
        <Composer />
      </main>
      <LogsDrawer />
      <ProvidersModal />
      <ConvSettingsModal />
      <BackupModal />
      <WebSearchModal />
      <DialogHost />
      <Toaster />
    </div>
  );
}
